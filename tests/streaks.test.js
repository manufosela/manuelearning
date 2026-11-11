import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((_db, col, id) => `${col}/${id}`),
  getDoc: (...a) => mockGetDoc(...a),
  setDoc: (...a) => mockSetDoc(...a),
}));

const { getStreak, updateStreak } = await import('../src/lib/firebase/streaks.js');

const stored = (data) => ({ exists: () => data !== null, data: () => data });

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe('getStreak', () => {
  it('rejects a missing user', async () => {
    expect((await getStreak('')).success).toBe(false);
  });

  it('returns null when the user has no streak yet, and the data otherwise', async () => {
    mockGetDoc.mockResolvedValueOnce(stored(null));
    expect(await getStreak('u1')).toEqual({ success: true, streak: null });
    mockGetDoc.mockResolvedValueOnce(stored({ current: 3 }));
    expect(await getStreak('u1')).toEqual({ success: true, streak: { current: 3 } });
  });

  it('reports Firestore errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('firestore'));
    expect((await getStreak('u1')).success).toBe(false);
  });
});

describe('updateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T12:00:00Z'));
  });

  it('rejects a missing user', async () => {
    expect((await updateStreak('')).success).toBe(false);
  });

  it('starts a streak for a first activity', async () => {
    mockGetDoc.mockResolvedValue(stored(null));
    expect((await updateStreak('u1')).success).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith('activityStreaks/u1', { current: 1, longest: 1, lastActivityDate: '2026-11-11' });
  });

  it('extends yesterday\'s streak', async () => {
    mockGetDoc.mockResolvedValue(stored({ current: 4, longest: 4, lastActivityDate: '2026-11-10' }));
    await updateStreak('u1');
    expect(mockSetDoc.mock.calls[0][1]).toEqual({ current: 5, longest: 5, lastActivityDate: '2026-11-11' });
  });

  it('reports Firestore errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('firestore'));
    expect((await updateStreak('u1')).success).toBe(false);
  });
});
