import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: (...a) => mockGetDoc(...a),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import { calculateProgress } from '../src/lib/firebase/progress.js';
import { buildLearningPath } from '../src/lib/learning-path.js';
import { computeDashboardStats } from '../src/lib/dashboard-stats.js';

describe('computeDashboardStats', () => {
  const modules = [
    { id: 'm1', title: 'Mod 1', order: 1 },
    { id: 'm2', title: 'Mod 2', order: 2 },
  ];

  const lessonsByModule = {
    m1: [
      { id: 'l1', title: 'L1', order: 1 },
      { id: 'l2', title: 'L2', order: 2 },
    ],
    m2: [
      { id: 'l3', title: 'L3', order: 1 },
    ],
  };

  it('should compute 0% when no lessons completed', () => {
    const stats = computeDashboardStats(modules, lessonsByModule, []);
    expect(stats.globalPercent).toBe(0);
    expect(stats.totalLessons).toBe(3);
    expect(stats.completedCount).toBe(0);
  });

  it('should compute correct global percentage', () => {
    const completed = [
      { moduleId: 'm1', lessonId: 'l1' },
      { moduleId: 'm1', lessonId: 'l2' },
    ];
    const stats = computeDashboardStats(modules, lessonsByModule, completed);
    expect(stats.globalPercent).toBe(67);
    expect(stats.completedCount).toBe(2);
  });

  it('should compute 100% when all lessons completed', () => {
    const completed = [
      { moduleId: 'm1', lessonId: 'l1' },
      { moduleId: 'm1', lessonId: 'l2' },
      { moduleId: 'm2', lessonId: 'l3' },
    ];
    const stats = computeDashboardStats(modules, lessonsByModule, completed);
    expect(stats.globalPercent).toBe(100);
  });

  it('should compute per-module progress', () => {
    const completed = [
      { moduleId: 'm1', lessonId: 'l1' },
    ];
    const stats = computeDashboardStats(modules, lessonsByModule, completed);
    expect(stats.moduleStats).toHaveLength(2);
    expect(stats.moduleStats[0].percent).toBe(50);
    expect(stats.moduleStats[0].completed).toBe(1);
    expect(stats.moduleStats[0].total).toBe(2);
    expect(stats.moduleStats[1].percent).toBe(0);
  });

  it('should identify next pending lesson', () => {
    const completed = [
      { moduleId: 'm1', lessonId: 'l1' },
    ];
    const stats = computeDashboardStats(modules, lessonsByModule, completed);
    expect(stats.nextLesson).toEqual({ moduleId: 'm1', lessonId: 'l2', lessonTitle: 'L2' });
  });

  it('should return null nextLesson when all completed', () => {
    const completed = [
      { moduleId: 'm1', lessonId: 'l1' },
      { moduleId: 'm1', lessonId: 'l2' },
      { moduleId: 'm2', lessonId: 'l3' },
    ];
    const stats = computeDashboardStats(modules, lessonsByModule, completed);
    expect(stats.nextLesson).toBeNull();
  });

  it('should identify last completed lesson', () => {
    const completed = [
      { moduleId: 'm1', lessonId: 'l1' },
      { moduleId: 'm1', lessonId: 'l2' },
    ];
    const stats = computeDashboardStats(modules, lessonsByModule, completed);
    expect(stats.lastCompleted).toEqual({ moduleId: 'm1', lessonId: 'l2', lessonTitle: 'L2' });
  });

  it('should return null lastCompleted when none completed', () => {
    const stats = computeDashboardStats(modules, lessonsByModule, []);
    expect(stats.lastCompleted).toBeNull();
  });

  it('should handle empty modules', () => {
    const stats = computeDashboardStats([], {}, []);
    expect(stats.globalPercent).toBe(0);
    expect(stats.totalLessons).toBe(0);
    expect(stats.moduleStats).toHaveLength(0);
    expect(stats.courseGroups).toHaveLength(0);
  });

  it('should group modules by course', () => {
    const coursedModules = [
      { id: 'm1', title: 'Intro Docker', order: 1, course: 'docker' },
      { id: 'm2', title: 'Containers', order: 2, course: 'docker' },
      { id: 'm3', title: 'JS Basics', order: 3, course: 'javascript' },
    ];
    const coursedLessons = {
      m1: [{ id: 'l1', title: 'L1', order: 1 }],
      m2: [{ id: 'l2', title: 'L2', order: 1 }],
      m3: [{ id: 'l3', title: 'L3', order: 1 }],
    };
    const completed = [{ moduleId: 'm1', lessonId: 'l1' }];
    const stats = computeDashboardStats(coursedModules, coursedLessons, completed);
    expect(stats.courseGroups).toHaveLength(2);
    expect(stats.courseGroups[0].course).toBe('docker');
    expect(stats.courseGroups[0].modules).toHaveLength(2);
    expect(stats.courseGroups[0].completedCount).toBe(1);
    expect(stats.courseGroups[0].totalLessons).toBe(2);
    expect(stats.courseGroups[0].percent).toBe(50);
    expect(stats.courseGroups[1].course).toBe('javascript');
    expect(stats.courseGroups[1].modules).toHaveLength(1);
    expect(stats.courseGroups[1].completedCount).toBe(0);
  });

  it('should put modules without course in "Sin curso" group', () => {
    const stats = computeDashboardStats(modules, lessonsByModule, []);
    expect(stats.courseGroups).toHaveLength(1);
    expect(stats.courseGroups[0].course).toBe('Sin curso');
  });

  it('should include course field in moduleStats', () => {
    const coursedModules = [
      { id: 'm1', title: 'Docker Intro', order: 1, course: 'docker' },
    ];
    const coursedLessons = { m1: [{ id: 'l1', title: 'L1', order: 1 }] };
    const stats = computeDashboardStats(coursedModules, coursedLessons, []);
    expect(stats.moduleStats[0].course).toBe('docker');
  });
});

describe('calculateProgress (integration)', () => {
  it('should integrate with dashboard stats', () => {
    expect(calculateProgress(2, 3)).toBe(67);
    expect(calculateProgress(0, 5)).toBe(0);
    expect(calculateProgress(5, 5)).toBe(100);
  });
});

describe('buildLearningPath (integration)', () => {
  it('should produce sequential path for dashboard', () => {
    const modules = [{ id: 'm1', title: 'M1', order: 1 }];
    const lessons = { m1: [{ id: 'l1', title: 'L1', order: 1 }] };
    const path = buildLearningPath(modules, lessons);
    expect(path).toHaveLength(1);
    expect(path[0].moduleId).toBe('m1');
  });
});
