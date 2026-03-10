import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeWeeklyCompletions,
  computeQuizPerformance,
  estimateCompletionDate,
} from '../src/lib/analytics-utils.js';

describe('computeWeeklyCompletions', () => {
  let dateSpy;

  afterEach(() => {
    if (dateSpy) dateSpy.mockRestore();
  });

  it('returns 4 weeks by default', () => {
    const result = computeWeeklyCompletions([]);
    expect(result).toHaveLength(4);
    expect(result[0]).toHaveProperty('weekLabel');
    expect(result[0]).toHaveProperty('count');
  });

  it('counts lessons completed in each week', () => {
    const now = new Date();
    const daysAgo = (d) => {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      return date;
    };

    const completedLessons = [
      { completedAt: daysAgo(1) },  // this week (week 4)
      { completedAt: daysAgo(2) },  // this week
      { completedAt: daysAgo(8) },  // last week (week 3)
      { completedAt: daysAgo(20) }, // week 2 or 1 depending on exact dates
    ];

    const result = computeWeeklyCompletions(completedLessons);
    const total = result.reduce((sum, w) => sum + w.count, 0);
    expect(total).toBe(4);
  });

  it('handles Firestore timestamp objects', () => {
    const now = new Date();
    const lesson = { completedAt: { toDate: () => new Date(now.getTime() - 86400000) } };
    const result = computeWeeklyCompletions([lesson]);
    const total = result.reduce((sum, w) => sum + w.count, 0);
    expect(total).toBe(1);
  });

  it('handles serialized Firestore timestamps', () => {
    const now = new Date();
    const lesson = { completedAt: { seconds: Math.floor((now.getTime() - 86400000) / 1000) } };
    const result = computeWeeklyCompletions([lesson]);
    const total = result.reduce((sum, w) => sum + w.count, 0);
    expect(total).toBe(1);
  });

  it('returns all zeros when no lessons match the period', () => {
    const oldDate = new Date('2020-01-01');
    const result = computeWeeklyCompletions([{ completedAt: oldDate }]);
    const total = result.reduce((sum, w) => sum + w.count, 0);
    expect(total).toBe(0);
  });
});

describe('computeQuizPerformance', () => {
  const moduleStats = [
    { moduleId: 'mod1', moduleTitle: 'Módulo 1' },
    { moduleId: 'mod2', moduleTitle: 'Módulo 2' },
  ];

  it('returns zero rate when no quiz results', () => {
    const result = computeQuizPerformance([], moduleStats);
    expect(result.successRate).toBe(0);
    expect(result.totalAnswered).toBe(0);
    expect(result.byModule).toHaveLength(0);
  });

  it('computes success rate from lesson quiz format (isCorrect)', () => {
    const quizResults = [
      {
        quizId: 'q1',
        moduleId: 'mod1',
        questions: [
          { text: 'Q1', type: 'multiple', options: ['A', 'B'], correctAnswer: 0 },
          { text: 'Q2', type: 'multiple', options: ['A', 'B'], correctAnswer: 1 },
        ],
        userAnswers: [
          { selectedIndex: 0, isCorrect: true },
          { selectedIndex: 0, isCorrect: false },
        ],
      },
    ];

    const result = computeQuizPerformance(quizResults, moduleStats);
    expect(result.successRate).toBe(50);
    expect(result.totalCorrect).toBe(1);
    expect(result.totalAnswered).toBe(2);
  });

  it('computes success rate from multiple choice correctAnswer', () => {
    const quizResults = [
      {
        quizId: 'q1',
        moduleId: 'mod1',
        questions: [
          { text: 'Q1', type: 'multiple', options: ['A', 'B', 'C'], correctAnswer: 2 },
          { text: 'Q2', type: 'multiple', options: ['A', 'B'], correctAnswer: 0 },
        ],
        userAnswers: [2, 0],
      },
    ];

    const result = computeQuizPerformance(quizResults, moduleStats);
    expect(result.successRate).toBe(100);
    expect(result.totalCorrect).toBe(2);
  });

  it('skips open questions without isCorrect', () => {
    const quizResults = [
      {
        quizId: 'q1',
        moduleId: 'mod1',
        questions: [
          { text: 'Q1', type: 'open' },
          { text: 'Q2', type: 'multiple', options: ['A', 'B'], correctAnswer: 0 },
        ],
        userAnswers: ['free text answer', 0],
      },
    ];

    const result = computeQuizPerformance(quizResults, moduleStats);
    expect(result.totalAnswered).toBe(1);
    expect(result.successRate).toBe(100);
  });

  it('groups performance by module', () => {
    const quizResults = [
      {
        quizId: 'q1',
        moduleId: 'mod1',
        questions: [{ text: 'Q1', type: 'multiple', options: ['A', 'B'], correctAnswer: 0 }],
        userAnswers: [{ selectedIndex: 0, isCorrect: true }],
      },
      {
        quizId: 'q2',
        moduleId: 'mod2',
        questions: [
          { text: 'Q1', type: 'multiple', options: ['A', 'B'], correctAnswer: 1 },
          { text: 'Q2', type: 'multiple', options: ['A', 'B'], correctAnswer: 0 },
        ],
        userAnswers: [
          { selectedIndex: 0, isCorrect: false },
          { selectedIndex: 0, isCorrect: true },
        ],
      },
    ];

    const result = computeQuizPerformance(quizResults, moduleStats);
    expect(result.byModule).toHaveLength(2);

    const mod1 = result.byModule.find((m) => m.moduleId === 'mod1');
    expect(mod1.percent).toBe(100);

    const mod2 = result.byModule.find((m) => m.moduleId === 'mod2');
    expect(mod2.percent).toBe(50);
  });
});

describe('estimateCompletionDate', () => {
  it('returns weeksRemaining 0 when all lessons completed', () => {
    const lessons = [{ completedAt: new Date() }];
    const result = estimateCompletionDate(lessons, 1);
    expect(result.weeksRemaining).toBe(0);
    expect(result.estimatedDate).toBeNull();
  });

  it('returns null estimatedDate when no recent activity', () => {
    const oldLessons = [{ completedAt: new Date('2020-01-01') }];
    const result = estimateCompletionDate(oldLessons, 10);
    expect(result.estimatedDate).toBeNull();
    expect(result.weeksRemaining).toBeNull();
    expect(result.lessonsPerWeek).toBe(0);
  });

  it('calculates estimated weeks based on pace', () => {
    const now = new Date();
    const daysAgo = (d) => {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      return date;
    };

    // 8 lessons in last 4 weeks = 2/week
    const lessons = [
      { completedAt: daysAgo(1) },
      { completedAt: daysAgo(2) },
      { completedAt: daysAgo(8) },
      { completedAt: daysAgo(9) },
      { completedAt: daysAgo(15) },
      { completedAt: daysAgo(16) },
      { completedAt: daysAgo(22) },
      { completedAt: daysAgo(23) },
    ];

    const result = estimateCompletionDate(lessons, 20);
    // 12 remaining at 2/week = 6 weeks
    expect(result.weeksRemaining).toBe(6);
    expect(result.lessonsPerWeek).toBe(2);
    expect(result.estimatedDate).toBeTruthy();
  });

  it('returns lessonsPerWeek rounded to 1 decimal', () => {
    const now = new Date();
    const lessons = [
      { completedAt: new Date(now.getTime() - 86400000) },
      { completedAt: new Date(now.getTime() - 86400000 * 2) },
      { completedAt: new Date(now.getTime() - 86400000 * 3) },
    ];
    const result = estimateCompletionDate(lessons, 10);
    expect(typeof result.lessonsPerWeek).toBe('number');
    const decimals = result.lessonsPerWeek.toString().split('.')[1];
    expect(!decimals || decimals.length <= 1).toBe(true);
  });
});
