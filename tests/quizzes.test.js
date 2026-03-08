import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: (...a) => mockDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: (...a) => mockGetDoc(...a),
  addDoc: (...a) => mockAddDoc(...a),
  setDoc: (...a) => mockSetDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  validateQuiz,
  fetchQuizzesByLessonId,
  fetchAllQuizzes,
  fetchQuiz,
  fetchQuizByLesson,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuizResponse,
  getUserQuizResponse,
  getQuizResponses,
  getUserQuizResults,
  submitLessonQuizResponse,
  hasStudentAnsweredQuiz,
  getStudentQuizResponse,
} from '../src/lib/firebase/quizzes.js';

/* ── validateQuiz ───────────────────────────────────────────── */
describe('validateQuiz', () => {
  const valid = {
    title: 'Quiz Semana 1',
    moduleId: 'm1',
    lessonId: 'l1',
    questions: [
      { text: 'Pregunta 1', type: 'open' },
      { text: 'Pregunta 2', type: 'multiple', options: ['A', 'B', 'C'] },
    ],
  };

  it('should reject empty title', () => {
    expect(validateQuiz({ ...valid, title: '' }).valid).toBe(false);
  });

  it('should reject missing moduleId', () => {
    expect(validateQuiz({ ...valid, moduleId: '' }).valid).toBe(false);
  });

  it('should reject empty questions', () => {
    expect(validateQuiz({ ...valid, questions: [] }).valid).toBe(false);
  });

  it('should reject question without text', () => {
    expect(validateQuiz({ ...valid, questions: [{ text: '', type: 'open' }] }).valid).toBe(false);
  });

  it('should reject multiple type without options', () => {
    expect(validateQuiz({ ...valid, questions: [{ text: 'Q', type: 'multiple', options: [] }] }).valid).toBe(false);
  });

  it('should accept valid quiz', () => {
    expect(validateQuiz(valid).valid).toBe(true);
  });
});

/* ── fetchQuizzesByLessonId ─────────────────────────────────── */
describe('fetchQuizzesByLessonId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty lessonId', async () => {
    expect((await fetchQuizzesByLessonId('')).success).toBe(false);
  });

  it('should return quizzes for a lesson', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'q1', data: () => ({ title: 'Quiz 1', lessonId: 'l1' }) },
      ],
    });
    const result = await fetchQuizzesByLessonId('l1');
    expect(result.success).toBe(true);
    expect(result.quizzes).toHaveLength(1);
    expect(result.quizzes[0].id).toBe('q1');
  });

  it('should return empty array when no quizzes exist', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await fetchQuizzesByLessonId('l99');
    expect(result.success).toBe(true);
    expect(result.quizzes).toHaveLength(0);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchQuizzesByLessonId('l1')).success).toBe(false);
  });
});

/* ── fetchAllQuizzes ────────────────────────────────────────── */
describe('fetchAllQuizzes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return quizzes on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'q1', data: () => ({ title: 'Quiz 1' }) },
      ],
    });
    const result = await fetchAllQuizzes();
    expect(result.success).toBe(true);
    expect(result.quizzes).toHaveLength(1);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchAllQuizzes()).success).toBe(false);
  });
});

/* ── fetchQuiz ──────────────────────────────────────────────── */
describe('fetchQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await fetchQuiz('')).success).toBe(false);
  });

  it('should return quiz on success', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'q1', data: () => ({ title: 'Q1' }) });
    const result = await fetchQuiz('q1');
    expect(result.success).toBe(true);
    expect(result.quiz.title).toBe('Q1');
  });

  it('should return error when not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect((await fetchQuiz('x')).success).toBe(false);
  });
});

/* ── fetchQuizByLesson ──────────────────────────────────────── */
describe('fetchQuizByLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty moduleId', async () => {
    expect((await fetchQuizByLesson('', 'l1')).success).toBe(false);
  });

  it('should reject empty lessonId', async () => {
    expect((await fetchQuizByLesson('m1', '')).success).toBe(false);
  });

  it('should return null when no quiz exists', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await fetchQuizByLesson('m1', 'l1');
    expect(result.success).toBe(true);
    expect(result.quiz).toBeNull();
  });

  it('should return quiz when exists', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'q1', data: () => ({ title: 'Quiz Clase 1', moduleId: 'm1', lessonId: 'l1' }) }],
    });
    const result = await fetchQuizByLesson('m1', 'l1');
    expect(result.success).toBe(true);
    expect(result.quiz.id).toBe('q1');
    expect(result.quiz.title).toBe('Quiz Clase 1');
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchQuizByLesson('m1', 'l1')).success).toBe(false);
  });
});

/* ── createQuiz ─────────────────────────────────────────────── */
describe('createQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject invalid data', async () => {
    expect((await createQuiz({ title: '', moduleId: 'm1', lessonId: 'l1', questions: [] })).success).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should create quiz on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-q' });
    const data = {
      title: 'Quiz 1',
      moduleId: 'm1',
      lessonId: 'l1',
      questions: [{ text: 'Q?', type: 'open' }],
    };
    const result = await createQuiz(data);
    expect(result.success).toBe(true);
    expect(result.id).toBe('new-q');
  });

  it('should handle Firestore errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    const data = {
      title: 'Quiz 1',
      moduleId: 'm1',
      lessonId: 'l1',
      questions: [{ text: 'Q?', type: 'open' }],
    };
    expect((await createQuiz(data)).success).toBe(false);
  });
});

/* ── updateQuiz ─────────────────────────────────────────────── */
describe('updateQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await updateQuiz('', {})).success).toBe(false);
  });

  it('should update on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await updateQuiz('q1', { title: 'Updated' })).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await updateQuiz('q1', {})).success).toBe(false);
  });
});

/* ── deleteQuiz ─────────────────────────────────────────────── */
describe('deleteQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await deleteQuiz('')).success).toBe(false);
  });

  it('should delete on success', async () => {
    mockDeleteDoc.mockResolvedValue();
    expect((await deleteQuiz('q1')).success).toBe(true);
  });
});

/* ── submitQuizResponse ─────────────────────────────────────── */
describe('submitQuizResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    expect((await submitQuizResponse('', 'q1', [])).success).toBe(false);
  });

  it('should reject empty quizId', async () => {
    expect((await submitQuizResponse('u1', '', [])).success).toBe(false);
  });

  it('should reject empty answers', async () => {
    expect((await submitQuizResponse('u1', 'q1', [])).success).toBe(false);
  });

  it('should submit response on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'resp-1' });
    const result = await submitQuizResponse('u1', 'q1', ['answer1', 'answer2']);
    expect(result.success).toBe(true);
    expect(result.id).toBe('resp-1');
  });

  it('should handle errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    expect((await submitQuizResponse('u1', 'q1', ['a'])).success).toBe(false);
  });
});

/* ── getUserQuizResponse ────────────────────────────────────── */
describe('getUserQuizResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty params', async () => {
    expect((await getUserQuizResponse('', 'q1')).success).toBe(false);
  });

  it('should return null when no response exists', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await getUserQuizResponse('u1', 'q1');
    expect(result.success).toBe(true);
    expect(result.response).toBeNull();
  });

  it('should return response when exists', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'r1', data: () => ({ answers: ['a1'] }) }],
    });
    const result = await getUserQuizResponse('u1', 'q1');
    expect(result.success).toBe(true);
    expect(result.response.answers).toEqual(['a1']);
  });
});

/* ── getQuizResponses ───────────────────────────────────────── */
describe('getQuizResponses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty quizId', async () => {
    expect((await getQuizResponses('')).success).toBe(false);
  });

  it('should return all responses for a quiz', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'r1', data: () => ({ userId: 'u1', answers: ['a1'] }) },
        { id: 'r2', data: () => ({ userId: 'u2', answers: ['a2'] }) },
      ],
    });
    const result = await getQuizResponses('q1');
    expect(result.success).toBe(true);
    expect(result.responses).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await getQuizResponses('q1')).success).toBe(false);
  });
});

/* ── getUserQuizResults ───────────────────────────────────── */
describe('getUserQuizResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    expect((await getUserQuizResults('')).success).toBe(false);
  });

  it('should return empty array when no responses', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await getUserQuizResults('u1');
    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
  });

  it('should return results with quiz details', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'r1',
          data: () => ({
            userId: 'u1',
            quizId: 'q1',
            answers: ['Respuesta 1', 'B'],
            completedAt: '2026-03-01',
          }),
        },
      ],
    });

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        title: 'Quiz Semana 1',
        questions: [
          { text: 'Pregunta abierta', type: 'open' },
          { text: 'Seleccion', type: 'multiple', options: ['A', 'B', 'C'] },
        ],
      }),
    });

    const result = await getUserQuizResults('u1');
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].quizTitle).toBe('Quiz Semana 1');
    expect(result.results[0].questions).toHaveLength(2);
    expect(result.results[0].userAnswers).toEqual(['Respuesta 1', 'B']);
  });

  it('should skip responses whose quiz no longer exists', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'r1', data: () => ({ userId: 'u1', quizId: 'deleted-quiz', answers: ['a'] }) },
      ],
    });

    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await getUserQuizResults('u1');
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(0);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('Network error'));
    const result = await getUserQuizResults('u1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('resultados');
  });
});

/* ── submitLessonQuizResponse ─────────────────────────────── */
describe('submitLessonQuizResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    lessonId: 'l1',
    lessonTitle: 'Intro JS',
    quizId: 'q1',
    studentId: 'u1',
    studentEmail: 'u1@test.com',
    selectedAnswer: 'B',
    isCorrect: true,
  };

  it('should reject missing lessonId', async () => {
    expect((await submitLessonQuizResponse({ ...validData, lessonId: '' })).success).toBe(false);
  });

  it('should reject missing quizId', async () => {
    expect((await submitLessonQuizResponse({ ...validData, quizId: '' })).success).toBe(false);
  });

  it('should reject missing studentId', async () => {
    expect((await submitLessonQuizResponse({ ...validData, studentId: '' })).success).toBe(false);
  });

  it('should reject missing studentEmail', async () => {
    expect((await submitLessonQuizResponse({ ...validData, studentEmail: '' })).success).toBe(false);
  });

  it('should reject missing selectedAnswer', async () => {
    expect((await submitLessonQuizResponse({ ...validData, selectedAnswer: '' })).success).toBe(false);
  });

  it('should reject missing isCorrect', async () => {
    expect((await submitLessonQuizResponse({ ...validData, isCorrect: undefined })).success).toBe(false);
  });

  it('should save response with deterministic doc ID', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockSetDoc.mockResolvedValue();
    const result = await submitLessonQuizResponse(validData);
    expect(result.success).toBe(true);
    expect(result.id).toBe('u1_l1_q1');
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('should overwrite existing response (no duplicates)', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockSetDoc.mockResolvedValue();
    await submitLessonQuizResponse(validData);
    await submitLessonQuizResponse({ ...validData, selectedAnswer: 'C', isCorrect: false });
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
  });

  it('should handle Firestore errors', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockSetDoc.mockRejectedValue(new Error('err'));
    expect((await submitLessonQuizResponse(validData)).success).toBe(false);
  });
});

/* ── hasStudentAnsweredQuiz ────────────────────────────────── */
describe('hasStudentAnsweredQuiz', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty params', async () => {
    expect((await hasStudentAnsweredQuiz('', 'l1', 'q1')).success).toBe(false);
    expect((await hasStudentAnsweredQuiz('u1', '', 'q1')).success).toBe(false);
    expect((await hasStudentAnsweredQuiz('u1', 'l1', '')).success).toBe(false);
  });

  it('should return false when not answered', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await hasStudentAnsweredQuiz('u1', 'l1', 'q1');
    expect(result.success).toBe(true);
    expect(result.answered).toBe(false);
  });

  it('should return true when answered', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'u1_l1_q1', data: () => ({}) });
    const result = await hasStudentAnsweredQuiz('u1', 'l1', 'q1');
    expect(result.success).toBe(true);
    expect(result.answered).toBe(true);
  });

  it('should handle errors', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect((await hasStudentAnsweredQuiz('u1', 'l1', 'q1')).success).toBe(false);
  });
});

/* ── getStudentQuizResponse ───────────────────────────────── */
describe('getStudentQuizResponse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty params', async () => {
    expect((await getStudentQuizResponse('', 'l1', 'q1')).success).toBe(false);
    expect((await getStudentQuizResponse('u1', '', 'q1')).success).toBe(false);
    expect((await getStudentQuizResponse('u1', 'l1', '')).success).toBe(false);
  });

  it('should return null when no response exists', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const result = await getStudentQuizResponse('u1', 'l1', 'q1');
    expect(result.success).toBe(true);
    expect(result.response).toBeNull();
  });

  it('should return response when exists', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1_l1_q1',
      data: () => ({ selectedAnswer: 'B', isCorrect: true }),
    });
    const result = await getStudentQuizResponse('u1', 'l1', 'q1');
    expect(result.success).toBe(true);
    expect(result.response.selectedAnswer).toBe('B');
    expect(result.response.isCorrect).toBe(true);
  });

  it('should handle errors', async () => {
    mockDoc.mockReturnValue('doc-ref');
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect((await getStudentQuizResponse('u1', 'l1', 'q1')).success).toBe(false);
  });
});
