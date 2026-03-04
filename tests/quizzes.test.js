import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: (...a) => mockGetDoc(...a),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  validateQuiz,
  fetchAllQuizzes,
  fetchQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuizResponse,
  getUserQuizResponse,
  getQuizResponses,
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
