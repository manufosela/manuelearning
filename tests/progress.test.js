import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: (...a) => mockGetDoc(...a),
  setDoc: (...a) => mockSetDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  markLessonCompleted,
  isLessonCompleted,
  getUserProgress,
  calculateProgress,
} from '../src/lib/firebase/progress.js';

describe('markLessonCompleted', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    expect((await markLessonCompleted('', 'm1', 'l1')).success).toBe(false);
  });

  it('should reject empty moduleId', async () => {
    expect((await markLessonCompleted('u1', '', 'l1')).success).toBe(false);
  });

  it('should reject empty lessonId', async () => {
    expect((await markLessonCompleted('u1', 'm1', '')).success).toBe(false);
  });

  it('should mark lesson as completed', async () => {
    mockSetDoc.mockResolvedValue();
    const result = await markLessonCompleted('u1', 'm1', 'l1');
    expect(result.success).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('should handle Firestore errors', async () => {
    mockSetDoc.mockRejectedValue(new Error('err'));
    expect((await markLessonCompleted('u1', 'm1', 'l1')).success).toBe(false);
  });
});

describe('isLessonCompleted', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return false for empty params', async () => {
    expect(await isLessonCompleted('', 'm1', 'l1')).toBe(false);
  });

  it('should return true when lesson is completed', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ completed: true }) });
    expect(await isLessonCompleted('u1', 'm1', 'l1')).toBe(true);
  });

  it('should return false when document does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await isLessonCompleted('u1', 'm1', 'l1')).toBe(false);
  });

  it('should return false on error', async () => {
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect(await isLessonCompleted('u1', 'm1', 'l1')).toBe(false);
  });
});

describe('getUserProgress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    expect((await getUserProgress('')).success).toBe(false);
  });

  it('should return completed lessons', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'm1_l1', data: () => ({ moduleId: 'm1', lessonId: 'l1', completed: true }) },
        { id: 'm1_l2', data: () => ({ moduleId: 'm1', lessonId: 'l2', completed: true }) },
      ],
    });
    const result = await getUserProgress('u1');
    expect(result.success).toBe(true);
    expect(result.completedLessons).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await getUserProgress('u1')).success).toBe(false);
  });
});

describe('calculateProgress', () => {
  it('should return 0 for no lessons', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('should return percentage', () => {
    expect(calculateProgress(3, 10)).toBe(30);
  });

  it('should return 100 for all completed', () => {
    expect(calculateProgress(5, 5)).toBe(100);
  });

  it('should round to integer', () => {
    expect(calculateProgress(1, 3)).toBe(33);
  });
});
