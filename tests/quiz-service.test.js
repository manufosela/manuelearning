import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: (...a) => mockGetDoc(...a),
  setDoc: (...a) => mockSetDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  validateLessonQuiz,
  getLessonQuiz,
  saveLessonQuiz,
  deleteLessonQuiz,
  checkLessonQuizAnswers,
} from '../src/services/quiz-service.js';

const validQuestion = {
  question: 'What is 2+2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
};

const validQuiz = {
  lessonId: 'lesson-1',
  questions: [validQuestion],
};

/* ── validateLessonQuiz ──────────────────────────────────── */
describe('validateLessonQuiz', () => {
  it('should reject missing lessonId', () => {
    expect(validateLessonQuiz({ ...validQuiz, lessonId: '' }).valid).toBe(false);
  });

  it('should reject missing questions', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [] }).valid).toBe(false);
  });

  it('should reject more than 3 questions', () => {
    const q = { ...validQuestion };
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [q, q, q, q] }).valid).toBe(false);
  });

  it('should reject empty question text', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [{ ...validQuestion, question: '' }] }).valid).toBe(false);
  });

  it('should reject fewer than 2 options', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [{ ...validQuestion, options: ['only one'] }] }).valid).toBe(false);
  });

  it('should reject empty option text', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [{ ...validQuestion, options: ['A', ''] }] }).valid).toBe(false);
  });

  it('should reject missing correctIndex', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [{ ...validQuestion, correctIndex: undefined }] }).valid).toBe(false);
  });

  it('should reject non-integer correctIndex', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [{ ...validQuestion, correctIndex: 1.5 }] }).valid).toBe(false);
  });

  it('should reject out-of-range correctIndex', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [{ ...validQuestion, correctIndex: 10 }] }).valid).toBe(false);
  });

  it('should reject negative correctIndex', () => {
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [{ ...validQuestion, correctIndex: -1 }] }).valid).toBe(false);
  });

  it('should accept valid quiz with 1 question', () => {
    expect(validateLessonQuiz(validQuiz).valid).toBe(true);
  });

  it('should accept valid quiz with 3 questions', () => {
    const q = { ...validQuestion };
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [q, q, q] }).valid).toBe(true);
  });

  it('should accept valid quiz with explanation', () => {
    const q = { ...validQuestion, explanation: 'Because math' };
    expect(validateLessonQuiz({ lessonId: 'l1', questions: [q] }).valid).toBe(true);
  });
});

/* ── getLessonQuiz ────────────────────────────────────────── */
describe('getLessonQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty lessonId', async () => {
    expect((await getLessonQuiz('')).success).toBe(false);
  });

  it('should return null when quiz does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await getLessonQuiz('lesson-1');
    expect(result.success).toBe(true);
    expect(result.quiz).toBeNull();
  });

  it('should return quiz when it exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'lesson-1',
      data: () => ({ questions: [{ question: 'Q?', options: ['A', 'B'], correctIndex: 0 }] }),
    });
    const result = await getLessonQuiz('lesson-1');
    expect(result.success).toBe(true);
    expect(result.quiz.questions[0].question).toBe('Q?');
    expect(result.quiz.lessonId).toBe('lesson-1');
  });

  it('should handle errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect((await getLessonQuiz('lesson-1')).success).toBe(false);
  });
});

/* ── saveLessonQuiz ──────────────────────────────────────── */
describe('saveLessonQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject invalid data', async () => {
    expect((await saveLessonQuiz({ lessonId: '' })).success).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('should create quiz for new lesson', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue();
    const result = await saveLessonQuiz(validQuiz);
    expect(result.success).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('should update quiz for existing lesson', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    mockSetDoc.mockResolvedValue();
    const result = await saveLessonQuiz(validQuiz);
    expect(result.success).toBe(true);
  });

  it('should trim question text and options', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue();
    await saveLessonQuiz({
      lessonId: 'l1',
      questions: [{ ...validQuestion, question: '  Q?  ', options: ['  A  ', '  B  '] }],
    });
    const savedData = mockSetDoc.mock.calls[0][1];
    expect(savedData.questions[0].question).toBe('Q?');
    expect(savedData.questions[0].options).toEqual(['A', 'B']);
  });

  it('should save multiple questions', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue();
    const quiz = {
      lessonId: 'l1',
      questions: [validQuestion, { ...validQuestion, question: 'Q2?' }],
    };
    await saveLessonQuiz(quiz);
    const savedData = mockSetDoc.mock.calls[0][1];
    expect(savedData.questions).toHaveLength(2);
    expect(savedData.questions[1].question).toBe('Q2?');
  });

  it('should handle errors', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockRejectedValue(new Error('err'));
    expect((await saveLessonQuiz(validQuiz)).success).toBe(false);
  });
});

/* ── deleteLessonQuiz ────────────────────────────────────── */
describe('deleteLessonQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty lessonId', async () => {
    expect((await deleteLessonQuiz('')).success).toBe(false);
  });

  it('should delete on success', async () => {
    mockDeleteDoc.mockResolvedValue();
    expect((await deleteLessonQuiz('lesson-1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockDeleteDoc.mockRejectedValue(new Error('err'));
    expect((await deleteLessonQuiz('lesson-1')).success).toBe(false);
  });
});

/* ── checkLessonQuizAnswers ──────────────────────────────── */
describe('checkLessonQuizAnswers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty lessonId', async () => {
    expect((await checkLessonQuizAnswers('', [0])).success).toBe(false);
  });

  it('should reject non-array selectedIndexes', async () => {
    expect((await checkLessonQuizAnswers('lesson-1', null)).success).toBe(false);
  });

  it('should reject empty selectedIndexes', async () => {
    expect((await checkLessonQuizAnswers('lesson-1', [])).success).toBe(false);
  });

  it('should return error when no quiz exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await checkLessonQuizAnswers('lesson-1', [0]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No hay quiz');
  });

  it('should reject mismatched answer count', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'lesson-1',
      data: () => ({
        questions: [
          { question: 'Q1?', options: ['A', 'B'], correctIndex: 0 },
          { question: 'Q2?', options: ['C', 'D'], correctIndex: 1 },
        ],
      }),
    });
    const result = await checkLessonQuizAnswers('lesson-1', [0]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('no coincide');
  });

  it('should return correct results for multiple questions', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'lesson-1',
      data: () => ({
        questions: [
          { question: 'Q1?', options: ['A', 'B'], correctIndex: 1, explanation: 'Because B' },
          { question: 'Q2?', options: ['C', 'D'], correctIndex: 0 },
        ],
      }),
    });
    const result = await checkLessonQuizAnswers('lesson-1', [1, 1]);
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].correct).toBe(true);
    expect(result.results[0].explanation).toBe('Because B');
    expect(result.results[1].correct).toBe(false);
    expect(result.results[1].explanation).toBeNull();
  });

  it('should handle errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect((await checkLessonQuizAnswers('lesson-1', [0])).success).toBe(false);
  });
});
