import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...a) => mockGetDocs(...a),
  getDoc: vi.fn(),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import {
  createNotification,
  fetchUnreadNotifications,
  countUnreadNotifications,
  markAsRead,
  markAllAsRead,
} from '../src/lib/firebase/notifications.js';

/* ── createNotification ───────────────────────────────────── */
describe('createNotification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty type', async () => {
    expect((await createNotification({ type: '', message: 'msg' })).success).toBe(false);
  });

  it('should reject empty message', async () => {
    expect((await createNotification({ type: 'new_question', message: '' })).success).toBe(false);
  });

  it('should create notification on success', async () => {
    mockAddDoc.mockResolvedValue({ id: 'n1' });
    const result = await createNotification({
      type: 'new_question',
      message: 'Nueva pregunta en Clase 1',
      questionId: 'q1',
      lessonId: 'l1',
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe('n1');
  });

  it('should handle errors', async () => {
    mockAddDoc.mockRejectedValue(new Error('err'));
    expect((await createNotification({ type: 'new_question', message: 'msg' })).success).toBe(false);
  });
});

/* ── fetchUnreadNotifications ─────────────────────────────── */
describe('fetchUnreadNotifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return unread notifications', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'n1', data: () => ({ type: 'new_question', message: 'Msg 1', read: false }) },
        { id: 'n2', data: () => ({ type: 'new_question', message: 'Msg 2', read: false }) },
      ],
    });
    const result = await fetchUnreadNotifications();
    expect(result.success).toBe(true);
    expect(result.notifications).toHaveLength(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await fetchUnreadNotifications()).success).toBe(false);
  });
});

/* ── countUnreadNotifications ─────────────────────────────── */
describe('countUnreadNotifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return count of unread', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'n1', data: () => ({}) },
        { id: 'n2', data: () => ({}) },
        { id: 'n3', data: () => ({}) },
      ],
    });
    const result = await countUnreadNotifications();
    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await countUnreadNotifications()).success).toBe(false);
  });
});

/* ── markAsRead ───────────────────────────────────────────── */
describe('markAsRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty id', async () => {
    expect((await markAsRead('')).success).toBe(false);
  });

  it('should mark as read on success', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await markAsRead('n1')).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await markAsRead('n1')).success).toBe(false);
  });
});

/* ── markAllAsRead ────────────────────────────────────────── */
describe('markAllAsRead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should mark all unread as read', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'n1', data: () => ({}) },
        { id: 'n2', data: () => ({}) },
      ],
    });
    mockUpdateDoc.mockResolvedValue();
    const result = await markAllAsRead();
    expect(result.success).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    expect((await markAllAsRead()).success).toBe(false);
  });
});
