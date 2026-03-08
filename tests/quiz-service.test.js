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
  checkLessonQuizAnswer,
} from '../src/services/quiz-service.js';

const validQuiz = {
  lessonId: 'lesson-1',
  question: 'What is 2+2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
};

/* ── validateLessonQuiz ──────────────────────────────────── */
describe('validateLessonQuiz', () => {
  it('should reject missing lessonId', () => {
    expect(validateLessonQuiz({ ...validQuiz, lessonId: '' }).valid).toBe(false);
  });

  it('should reject empty question', () => {
    expect(validateLessonQuiz({ ...validQuiz, question: '' }).valid).toBe(false);
  });

  it('should reject fewer than 2 options', () => {
    expect(validateLessonQuiz({ ...validQuiz, options: ['only one'] }).valid).toBe(false);
  });

  it('should reject empty option text', () => {
    expect(validateLessonQuiz({ ...validQuiz, options: ['A', ''] }).valid).toBe(false);
  });

  it('should reject missing correctIndex', () => {
    expect(validateLessonQuiz({ ...validQuiz, correctIndex: undefined }).valid).toBe(false);
  });

  it('should reject non-integer correctIndex', () => {
    expect(validateLessonQuiz({ ...validQuiz, correctIndex: 1.5 }).valid).toBe(false);
  });

  it('should reject out-of-range correctIndex', () => {
    expect(validateLessonQuiz({ ...validQuiz, correctIndex: 10 }).valid).toBe(false);
  });

  it('should reject negative correctIndex', () => {
    expect(validateLessonQuiz({ ...validQuiz, correctIndex: -1 }).valid).toBe(false);
  });

  it('should accept valid quiz data', () => {
    expect(validateLessonQuiz(validQuiz).valid).toBe(true);
  });

  it('should accept valid quiz with explanation', () => {
    expect(validateLessonQuiz({ ...validQuiz, explanation: 'Because math' }).valid).toBe(true);
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
      data: () => ({ question: 'Q?', options: ['A', 'B'], correctIndex: 0 }),
    });
    const result = await getLessonQuiz('lesson-1');
    expect(result.success).toBe(true);
    expect(result.quiz.question).toBe('Q?');
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

  it('should trim question and options', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue();
    await saveLessonQuiz({ ...validQuiz, question: '  Q?  ', options: ['  A  ', '  B  '] });
    const savedData = mockSetDoc.mock.calls[0][1];
    expect(savedData.question).toBe('Q?');
    expect(savedData.options).toEqual(['A', 'B']);
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

/* ── checkLessonQuizAnswer ───────────────────────────────── */
describe('checkLessonQuizAnswer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty lessonId', async () => {
    expect((await checkLessonQuizAnswer('', 0)).success).toBe(false);
  });

  it('should reject non-integer selectedIndex', async () => {
    expect((await checkLessonQuizAnswer('lesson-1', null)).success).toBe(false);
    expect((await checkLessonQuizAnswer('lesson-1', 1.5)).success).toBe(false);
  });

  it('should return error when no quiz exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await checkLessonQuizAnswer('lesson-1', 0);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No hay quiz');
  });

  it('should return correct=true for right answer', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'lesson-1',
      data: () => ({ question: 'Q?', options: ['A', 'B'], correctIndex: 1, explanation: 'Because B' }),
    });
    const result = await checkLessonQuizAnswer('lesson-1', 1);
    expect(result.success).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.explanation).toBe('Because B');
  });

  it('should return correct=false for wrong answer', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'lesson-1',
      data: () => ({ question: 'Q?', options: ['A', 'B'], correctIndex: 1 }),
    });
    const result = await checkLessonQuizAnswer('lesson-1', 0);
    expect(result.success).toBe(true);
    expect(result.correct).toBe(false);
  });

  it('should handle errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect((await checkLessonQuizAnswer('lesson-1', 0)).success).toBe(false);
  });
});
