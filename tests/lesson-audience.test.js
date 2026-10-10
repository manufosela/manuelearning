import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockWhere = vi.fn((...args) => ({ where: args }));
const mockOrderBy = vi.fn((...args) => ({ orderBy: args }));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => 'lessons-ref'),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: vi.fn(),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  query: vi.fn((...parts) => parts),
  where: (...a) => mockWhere(...a),
  orderBy: (...a) => mockOrderBy(...a),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import { fetchLessons, createLesson, validateLesson, LESSON_AUDIENCES } from '../src/lib/firebase/modules.js';

const snapshot = { docs: [{ id: 'l1', data: () => ({ title: 'Intro', order: 0, audience: 'student' }) }] };

describe('LESSON_AUDIENCES', () => {
  it('lists the supported audiences', () => {
    expect(LESSON_AUDIENCES).toEqual(['student', 'instructor']);
  });
});

describe('fetchLessons audience filter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('only queries student lessons by default (fails closed)', async () => {
    mockGetDocs.mockResolvedValue(snapshot);
    const result = await fetchLessons('m1');
    expect(result.success).toBe(true);
    expect(mockWhere).toHaveBeenCalledWith('audience', '==', 'student');
    expect(mockOrderBy).toHaveBeenCalledWith('order', 'asc');
  });

  it('queries every lesson when audience is "all" (admin views)', async () => {
    mockGetDocs.mockResolvedValue(snapshot);
    await fetchLessons('m1', { audience: 'all' });
    expect(mockWhere).not.toHaveBeenCalled();
    expect(mockOrderBy).toHaveBeenCalledWith('order', 'asc');
  });

  it('rejects an unknown audience option', async () => {
    const result = await fetchLessons('m1', { audience: 'everyone' });
    expect(result.success).toBe(false);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});

describe('lesson audience on validate and create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an unknown audience', () => {
    expect(validateLesson({ title: 'L', order: 0, audience: 'admin' })).toEqual({
      valid: false,
      error: 'La audiencia debe ser alumno o formador',
    });
  });

  it('accepts instructor and a missing audience', () => {
    expect(validateLesson({ title: 'L', order: 0, audience: 'instructor' }).valid).toBe(true);
    expect(validateLesson({ title: 'L', order: 0 }).valid).toBe(true);
  });

  it('stores audience "student" by default', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new' });
    await createLesson('m1', { title: 'L', order: 0 });
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({ audience: 'student' });
  });

  it('stores the given instructor audience', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new' });
    await createLesson('m1', { title: 'Solucionario', order: 1, audience: 'instructor' });
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({ audience: 'instructor' });
  });
});
