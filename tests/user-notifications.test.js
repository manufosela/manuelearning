import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: null })) }));

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => 'col'),
  doc: vi.fn((_db, col, id) => `${col}/${id}`),
  addDoc: (...a) => mockAddDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

const {
  createUserNotification,
  notifyUsers,
  fetchUserNotifications,
  countUnreadUserNotifications,
  markUserNotificationAsRead,
  markAllUserNotificationsAsRead,
} = await import('../src/lib/firebase/user-notifications.js');

const snapshot = (...ids) => ({ docs: ids.map((id) => ({ id, data: () => ({ message: id }) })) });
const fail = () => Promise.reject(new Error('firestore'));

beforeEach(() => vi.clearAllMocks());

describe('createUserNotification', () => {
  it.each([
    ['', { type: 't', message: 'm' }, 'userId'],
    ['u1', { message: 'm' }, 'type'],
    ['u1', { type: 't', message: '  ' }, 'message'],
  ])('rejects missing %s / %j', async (uid, data, field) => {
    const result = await createUserNotification(uid, data);
    expect(result.success).toBe(false);
    expect(result.error).toContain(field);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('stores a trimmed unread notification', async () => {
    mockAddDoc.mockResolvedValue({ id: 'n1' });
    const result = await createUserNotification('u1', { type: 'new_lesson', message: '  Hola  ' });
    expect(result).toEqual({ success: true, id: 'n1' });
    expect(mockAddDoc.mock.calls[0][1]).toEqual({
      userId: 'u1', type: 'new_lesson', message: 'Hola', read: false, createdAt: 'TS',
    });
  });

  it('reports Firestore errors', async () => {
    mockAddDoc.mockImplementation(fail);
    expect((await createUserNotification('u1', { type: 't', message: 'm' })).success).toBe(false);
  });
});

describe('notifyUsers', () => {
  it('rejects an empty list', async () => {
    expect((await notifyUsers([], { type: 't', message: 'm' })).success).toBe(false);
  });

  it('counts only the notifications that were created', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'a' }).mockImplementationOnce(fail);
    expect(await notifyUsers(['u1', 'u2'], { type: 't', message: 'm' })).toEqual({ success: true, count: 1 });
  });
});

describe('fetchUserNotifications / countUnreadUserNotifications', () => {
  it('rejects a missing user', async () => {
    expect((await fetchUserNotifications('')).success).toBe(false);
    expect((await countUnreadUserNotifications('')).success).toBe(false);
  });

  it('returns notifications with their id and the unread count', async () => {
    mockGetDocs.mockResolvedValue(snapshot('n1', 'n2'));
    expect((await fetchUserNotifications('u1')).notifications).toEqual([
      { id: 'n1', message: 'n1' }, { id: 'n2', message: 'n2' },
    ]);
    expect(await countUnreadUserNotifications('u1')).toEqual({ success: true, count: 2 });
  });

  it('reports Firestore errors', async () => {
    mockGetDocs.mockImplementation(fail);
    expect((await fetchUserNotifications('u1')).success).toBe(false);
    expect((await countUnreadUserNotifications('u1')).success).toBe(false);
  });
});

describe('marking as read', () => {
  it('rejects missing ids', async () => {
    expect((await markUserNotificationAsRead('')).success).toBe(false);
    expect((await markAllUserNotificationsAsRead('')).success).toBe(false);
  });

  it('marks one notification as read', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await markUserNotificationAsRead('n1')).success).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledWith('userNotifications/n1', { read: true });
  });

  it('marks every unread notification of the user as read', async () => {
    mockGetDocs.mockResolvedValue(snapshot('n1', 'n2'));
    mockUpdateDoc.mockResolvedValue();
    expect((await markAllUserNotificationsAsRead('u1')).success).toBe(true);
    expect(mockUpdateDoc.mock.calls.map((c) => c[0])).toEqual(['userNotifications/n1', 'userNotifications/n2']);
  });

  it('reports Firestore errors', async () => {
    mockUpdateDoc.mockImplementation(fail);
    mockGetDocs.mockImplementation(fail);
    expect((await markUserNotificationAsRead('n1')).success).toBe(false);
    expect((await markAllUserNotificationsAsRead('u1')).success).toBe(false);
  });
});
