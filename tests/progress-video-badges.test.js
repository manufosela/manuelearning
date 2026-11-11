import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn((_db, col, id) => `${col}/${id}`),
  getDoc: (...a) => mockGetDoc(...a),
  setDoc: (...a) => mockSetDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  query: vi.fn((_ref, ...filters) => filters),
  where: vi.fn((field, _op, value) => `${field}=${value}`),
  serverTimestamp: vi.fn(() => 'TS'),
  arrayUnion: vi.fn((v) => ({ union: v })),
  arrayRemove: vi.fn((v) => ({ remove: v })),
}));

const mockAwardBadge = vi.fn(() => Promise.resolve());
vi.mock('../src/lib/firebase/badges.js', () => ({ awardBadge: (...a) => mockAwardBadge(...a) }));
vi.mock('../src/lib/firebase/streaks.js', () => ({ updateStreak: vi.fn(() => Promise.resolve()) }));
const mockFetchLessons = vi.fn();
const mockFetchAllModules = vi.fn();
vi.mock('../src/lib/firebase/modules.js', () => ({
  fetchLessons: (...a) => mockFetchLessons(...a),
  fetchAllModules: (...a) => mockFetchAllModules(...a),
}));

const progress = await import('../src/lib/firebase/progress.js');

const stored = (data) => ({ exists: () => data !== null, data: () => data });
const flush = () => new Promise((r) => setTimeout(r, 0));
const lessons = (n) => ({ success: true, lessons: Array.from({ length: n }, (_, i) => ({ id: `l${i}` })) });
const KEY = 'progress/u1_m1_l1';

beforeEach(() => {
  vi.clearAllMocks();
  mockSetDoc.mockResolvedValue();
  mockUpdateDoc.mockResolvedValue();
});

describe('video position', () => {
  it('updates an existing progress document or creates one', async () => {
    mockGetDoc.mockResolvedValueOnce(stored({ completed: true }));
    await progress.saveVideoPosition('u1', 'm1', 'l1', 42);
    expect(mockUpdateDoc).toHaveBeenCalledWith(KEY, { videoPosition: 42 });

    mockGetDoc.mockResolvedValueOnce(stored(null));
    await progress.saveVideoPosition('u1', 'm1', 'l1', 7);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ completed: false, videoPosition: 7 });
  });

  it('reads the saved position, 0 when there is none or it fails', async () => {
    mockGetDoc.mockResolvedValueOnce(stored({ videoPosition: 42 }));
    expect(await progress.getVideoPosition('u1', 'm1', 'l1')).toBe(42);
    mockGetDoc.mockResolvedValueOnce(stored(null));
    expect(await progress.getVideoPosition('u1', 'm1', 'l1')).toBe(0);
    mockGetDoc.mockRejectedValueOnce(new Error('x'));
    expect(await progress.getVideoPosition('u1', 'm1', 'l1')).toBe(0);
    expect(await progress.getVideoPosition('', 'm1', 'l1')).toBe(0);
  });

  it('validates parameters and reports errors when saving', async () => {
    expect((await progress.saveVideoPosition('', 'm1', 'l1', 1)).success).toBe(false);
    mockGetDoc.mockRejectedValueOnce(new Error('x'));
    expect((await progress.saveVideoPosition('u1', 'm1', 'l1', 1)).success).toBe(false);
  });
});

describe('video bookmarks', () => {
  it('adds a bookmark to an existing document or creates one', async () => {
    mockGetDoc.mockResolvedValueOnce(stored({}));
    await progress.addVideoBookmark('u1', 'm1', 'l1', 30, 'clave');
    expect(mockUpdateDoc.mock.calls[0][1].bookmarks.union).toMatchObject({ seconds: 30, note: 'clave' });

    mockGetDoc.mockResolvedValueOnce(stored(null));
    await progress.addVideoBookmark('u1', 'm1', 'l1', 5);
    expect(mockSetDoc.mock.calls[0][1].bookmarks[0]).toMatchObject({ seconds: 5, note: '' });
  });

  it('removes and lists bookmarks', async () => {
    const mark = { seconds: 30, note: 'x' };
    expect((await progress.removeVideoBookmark('u1', 'm1', 'l1', mark)).success).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledWith(KEY, { bookmarks: { remove: mark } });
    mockGetDoc.mockResolvedValueOnce(stored({ bookmarks: [mark] }));
    expect(await progress.getVideoBookmarks('u1', 'm1', 'l1')).toEqual([mark]);
    mockGetDoc.mockResolvedValueOnce(stored(null));
    expect(await progress.getVideoBookmarks('u1', 'm1', 'l1')).toEqual([]);
  });

  it('validates parameters and reports errors', async () => {
    expect((await progress.addVideoBookmark('', 'm1', 'l1', 1)).success).toBe(false);
    expect((await progress.removeVideoBookmark('u1', '', 'l1', {})).success).toBe(false);
    expect(await progress.getVideoBookmarks('u1', 'm1', '')).toEqual([]);
    mockGetDoc.mockRejectedValue(new Error('x'));
    mockUpdateDoc.mockRejectedValue(new Error('x'));
    expect((await progress.addVideoBookmark('u1', 'm1', 'l1', 1)).success).toBe(false);
    expect((await progress.removeVideoBookmark('u1', 'm1', 'l1', {})).success).toBe(false);
    expect(await progress.getVideoBookmarks('u1', 'm1', 'l1')).toEqual([]);
  });
});

describe('badges when completing a lesson', () => {
  const completedCount = (byModule) => (filters) => Promise.resolve({ size: byModule[filters[1].split('=')[1]] ?? 0 });

  it('awards nothing while the module is unfinished', async () => {
    mockFetchLessons.mockResolvedValue(lessons(3));
    mockGetDocs.mockImplementation(completedCount({ m1: 2 }));
    await progress.markLessonCompleted('u1', 'm1', 'l1');
    await flush();
    expect(mockAwardBadge).not.toHaveBeenCalled();
  });

  it('awards the module badge, and the course badge when every module is done', async () => {
    mockFetchLessons.mockResolvedValue(lessons(2));
    mockGetDocs.mockImplementation(completedCount({ m1: 2, m2: 2 }));
    mockGetDoc.mockResolvedValue(stored({ title: 'Módulo 1', course: 'docker' }));
    mockFetchAllModules.mockResolvedValue({ success: true, modules: [{ id: 'm1', course: 'docker' }, { id: 'm2', course: 'docker' }] });
    await progress.markLessonCompleted('u1', 'm1', 'l1');
    for (let i = 0; i < 5; i++) await flush();
    expect(mockAwardBadge).toHaveBeenCalledWith('u1', 'module_complete', 'm1', 'Módulo 1');
    expect(mockAwardBadge).toHaveBeenCalledWith('u1', 'course_complete', 'docker', 'docker');
  });

  it('skips the course badge while another module of the course is unfinished', async () => {
    mockFetchLessons.mockResolvedValue(lessons(2));
    mockGetDocs.mockImplementation(completedCount({ m1: 2, m2: 1 }));
    mockGetDoc.mockResolvedValue(stored({ title: 'Módulo 1', course: 'docker' }));
    mockFetchAllModules.mockResolvedValue({ success: true, modules: [{ id: 'm1', course: 'docker' }, { id: 'm2', course: 'docker' }] });
    await progress.markLessonCompleted('u1', 'm1', 'l1');
    for (let i = 0; i < 5; i++) await flush();
    expect(mockAwardBadge).toHaveBeenCalledTimes(1);
  });
});
