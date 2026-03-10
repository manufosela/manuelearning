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
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

vi.mock('../src/lib/firebase/user-notifications.js', () => ({
  createUserNotification: vi.fn(() => Promise.resolve({ success: true })),
}));

import { isBadgeAwarded, awardBadge, getUserBadges } from '../src/lib/firebase/badges.js';

describe('isBadgeAwarded', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return false for empty params', async () => {
    expect(await isBadgeAwarded('', 'module_complete', 'mod1')).toBe(false);
    expect(await isBadgeAwarded('u1', '', 'mod1')).toBe(false);
    expect(await isBadgeAwarded('u1', 'module_complete', '')).toBe(false);
  });

  it('should return true when badge exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    expect(await isBadgeAwarded('u1', 'module_complete', 'mod1')).toBe(true);
  });

  it('should return false when badge does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await isBadgeAwarded('u1', 'module_complete', 'mod1')).toBe(false);
  });

  it('should return false on error', async () => {
    mockGetDoc.mockRejectedValue(new Error('err'));
    expect(await isBadgeAwarded('u1', 'module_complete', 'mod1')).toBe(false);
  });
});

describe('awardBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    const result = await awardBadge('', 'module_complete', 'mod1', 'Module 1');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should reject empty type', async () => {
    const result = await awardBadge('u1', '', 'mod1', 'Module 1');
    expect(result.success).toBe(false);
  });

  it('should reject empty refId', async () => {
    const result = await awardBadge('u1', 'module_complete', '', 'Module 1');
    expect(result.success).toBe(false);
  });

  it('should return alreadyAwarded when badge exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    const result = await awardBadge('u1', 'module_complete', 'mod1', 'Module 1');
    expect(result.success).toBe(true);
    expect(result.alreadyAwarded).toBe(true);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('should create badge and notification when not yet awarded', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue();
    const result = await awardBadge('u1', 'module_complete', 'mod1', 'Module 1');
    expect(result.success).toBe(true);
    expect(result.alreadyAwarded).toBeUndefined();
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('should handle Firestore errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('err'));
    const result = await awardBadge('u1', 'module_complete', 'mod1', 'Module 1');
    expect(result.success).toBe(false);
  });
});

describe('getUserBadges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty userId', async () => {
    const result = await getUserBadges('');
    expect(result.success).toBe(false);
  });

  it('should return badges list', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'u1_module_complete_mod1', data: () => ({ userId: 'u1', type: 'module_complete', refId: 'mod1', refTitle: 'Module 1', awardedAt: 'TS' }) },
        { id: 'u1_course_complete_c1', data: () => ({ userId: 'u1', type: 'course_complete', refId: 'c1', refTitle: 'Course 1', awardedAt: 'TS' }) },
      ],
    });
    const result = await getUserBadges('u1');
    expect(result.success).toBe(true);
    expect(result.badges).toHaveLength(2);
    expect(result.badges[0].id).toBe('u1_module_complete_mod1');
  });

  it('should handle errors', async () => {
    mockGetDocs.mockRejectedValue(new Error('err'));
    const result = await getUserBadges('u1');
    expect(result.success).toBe(false);
  });
});
