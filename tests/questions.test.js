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
  arrayUnion: vi.fn((val) => val),
}));

import {
  validateQuestion,
  fetchAllQuestions,
  fetchQuestionsByLesson,
  createQuestion,
  addAnswer,
  deleteQuestion,
} from '../src/lib/firebase/questions.js';

/* ── validateQuestion ─────────────────────────────────────── */
describe('validateQuestion', () => {
  it('should reject empty text', () => {
    expect(validateQuestion({ text: '', userId: 'u1', userName: 'User', lessonId: 'l1', moduleId: 'm1' }).valid).toBe(false);
  });

  it('should reject missing userId', () => {
    expect(validateQuestion({ text: 'Q?', userId: '', userName: 'User', lessonId: 'l1', moduleId: 'm1' }).valid).toBe(false);
  });

  it('should reject missing lessonId', () => {
    expect(validateQuestion({ text: 'Q?', userId: 'u1', userName: 'User', lessonId: '', moduleId: 'm1' }).valid).toBe(false);
  });

  it('should reject missing moduleId', () => {
    expect(validateQuestion({ text: 'Q?', userId: 'u1', userName: 'User', lessonId: 'l1', moduleId: '' }).valid).toBe(false);
  });

  it('should accept valid question', () => {
    expect(validateQuestion({ text: 'What is LPS?', userId: 'u1', userName: 'User', lessonId: 'l1', moduleId: 'm1' }).valid).toBe(true);
  });
});

/* ── fetchAllQuestions ─────────────────────────────────────── */
describe('fetchAllQuestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return all questions on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'q1', data: () => ({ text: 'Q1?', lessonId: 'l1', answers: [] }) },
        { id: 'q2', data: () => ({ text: 'Q2?', lessonId: 'l2', answers: [{ text: 'A' }] }) },
      ],
    });
    const result = await fetchAllQuestions();
    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchAllQuestions()).success).toBe(false);
  });
});

/* ── fetchQuestionsByLesson ───────────────────────────────── */
describe('fetchQuestionsByLesson', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty lessonId', async () => {
    expect((await fetchQuestionsByLesson('')).success).toBe(false);
  });

  it('should return questions on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'q1', data: () => ({ text: 'Q1?', answers: [] }) },
        { id: 'q2', data: () => ({ text: 'Q2?', answers: [{ text: 'A1' }] }) },
      ],
    });
    const result = await fetchQuestionsByLesson('l1');
    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchQuestionsByLesson('l1')).success).toBe(false);
  });
});

/* ── createQuestion ───────────────────────────────────────── */
describe('createQuestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject invalid data', async () => {
    expect((await createQuestion({ text: '' })).success).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should create question on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-q' });
    const data = { text: 'What is LPS?', userId: 'u1', userName: 'User', lessonId: 'l1', moduleId: 'm1' };
    const result = await createQuestion(data);
    expect(result.success).toBe(true);
    expect(result.id).toBe('new-q');
  });

  it('should handle errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    const data = { text: 'Q?', userId: 'u1', userName: 'User', lessonId: 'l1', moduleId: 'm1' };
    expect((await createQuestion(data)).success).toBe(false);
  });
});

/* ── addAnswer ────────────────────────────────────────────── */
describe('addAnswer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty questionId', async () => {
    expect((await addAnswer('', { text: 'A', userId: 'u1', userName: 'Admin' })).success).toBe(false);
  });

  it('should reject empty answer text', async () => {
    expect((await addAnswer('q1', { text: '', userId: 'u1', userName: 'Admin' })).success).toBe(false);
  });

  it('should add answer on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    const result = await addAnswer('q1', { text: 'Answer here', userId: 'u1', userName: 'Admin' });
    expect(result.success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await addAnswer('q1', { text: 'A', userId: 'u1', userName: 'Admin' })).success).toBe(false);
  });
});

/* ── deleteQuestion ───────────────────────────────────────── */
describe('deleteQuestion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await deleteQuestion('')).success).toBe(false);
  });

  it('should delete on success', async () => {
    mockDeleteDoc.mockResolvedValue();
    expect((await deleteQuestion('q1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockDeleteDoc.mockRejectedValue(new Error('err'));
    expect((await deleteQuestion('q1')).success).toBe(false);
  });
});
