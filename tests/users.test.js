import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
}));

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  orderBy: vi.fn(),
  query: vi.fn(),
}));

import {
  fetchAllUsers,
  fetchUser,
  updateUserRole,
  updateUserDisplayName,
  toggleLifetimeAccess,
  isAdmin,
} from '../src/lib/firebase/users.js';

describe('fetchAllUsers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return users list on success', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'u1', data: () => ({ email: 'a@test.com', role: 'admin', displayName: 'Admin' }) },
        { id: 'u2', data: () => ({ email: 'b@test.com', role: 'student', displayName: 'Student' }) },
      ],
    });

    const result = await fetchAllUsers();
    expect(result.success).toBe(true);
    expect(result.users).toHaveLength(2);
    expect(result.users[0].uid).toBe('u1');
    expect(result.users[1].role).toBe('student');
  });

  it('should return error on Firestore failure', async () => {
    mockGetDocs.mockRejectedValue(new Error('Network'));

    const result = await fetchAllUsers();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Error al cargar');
  });
});

describe('fetchUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty uid', async () => {
    const result = await fetchUser('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('UID es obligatorio');
  });

  it('should return user on success', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ email: 'a@test.com', role: 'admin' }),
    });

    const result = await fetchUser('u1');
    expect(result.success).toBe(true);
    expect(result.user.uid).toBe('u1');
    expect(result.user.role).toBe('admin');
  });

  it('should return error when user not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await fetchUser('nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('no encontrado');
  });

  it('should return error on Firestore failure', async () => {
    mockGetDoc.mockRejectedValue(new Error('Permission denied'));

    const result = await fetchUser('u1');
    expect(result.success).toBe(false);
  });
});

describe('updateUserRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty uid', async () => {
    const result = await updateUserRole('', 'admin');
    expect(result.success).toBe(false);
  });

  it('should reject invalid role', async () => {
    const result = await updateUserRole('u1', 'superadmin');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Rol no válido');
  });

  it('should update role to admin', async () => {
    mockUpdateDoc.mockResolvedValue();
    const result = await updateUserRole('u1', 'admin');
    expect(result.success).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('should update role to student', async () => {
    mockUpdateDoc.mockResolvedValue();
    const result = await updateUserRole('u1', 'student');
    expect(result.success).toBe(true);
  });

  it('should return error on Firestore failure', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Permission denied'));
    const result = await updateUserRole('u1', 'admin');
    expect(result.success).toBe(false);
  });
});

describe('toggleLifetimeAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty uid', async () => {
    expect((await toggleLifetimeAccess('', true)).success).toBe(false);
  });

  it('should enable lifetime access', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await toggleLifetimeAccess('u1', true)).success).toBe(true);
  });

  it('should disable lifetime access', async () => {
    mockUpdateDoc.mockResolvedValue();
    expect((await toggleLifetimeAccess('u1', false)).success).toBe(true);
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    expect((await toggleLifetimeAccess('u1', true)).success).toBe(false);
  });
});

describe('updateUserDisplayName', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should reject empty uid', async () => {
    const result = await updateUserDisplayName('', 'Test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('UID es obligatorio');
  });

  it('should reject empty name', async () => {
    const result = await updateUserDisplayName('u1', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('nombre es obligatorio');
  });

  it('should reject whitespace-only name', async () => {
    const result = await updateUserDisplayName('u1', '   ');
    expect(result.success).toBe(false);
  });

  it('should update display name', async () => {
    mockUpdateDoc.mockResolvedValue();
    const result = await updateUserDisplayName('u1', 'New Name');
    expect(result.success).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('err'));
    const result = await updateUserDisplayName('u1', 'New Name');
    expect(result.success).toBe(false);
  });
});

describe('isAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return true for admin user', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ email: 'a@test.com', role: 'admin' }),
    });

    const result = await isAdmin('u1');
    expect(result).toBe(true);
  });

  it('should return false for student user', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'u1',
      data: () => ({ email: 'a@test.com', role: 'student' }),
    });

    const result = await isAdmin('u1');
    expect(result).toBe(false);
  });

  it('should return false when user not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await isAdmin('nonexistent');
    expect(result).toBe(false);
  });
});
