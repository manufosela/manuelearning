import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock Firebase modules before importing auth functions.
 */
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => {
  const mockAuth = { currentUser: null };
  return {
    getAuth: vi.fn(() => mockAuth),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  increment: vi.fn((n) => n),
}));

vi.mock('../src/lib/firebase/invitation-codes.js', () => ({
  validateInvitationCode: vi.fn(),
  markCodeAsUsed: vi.fn(() => Promise.resolve(true)),
}));

import {
  loginWithGoogle,
  completeRegistration,
  logoutUser,
  onAuthChange,
  getCurrentUser,
  mapFirebaseError,
} from '../src/lib/firebase/auth.js';

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getAuth,
} from 'firebase/auth';

import { getDoc, setDoc } from 'firebase/firestore';
import { validateInvitationCode, markCodeAsUsed } from '../src/lib/firebase/invitation-codes.js';

describe('loginWithGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return isNewUser=false for existing users', async () => {
    const mockUser = { uid: 'test-uid', email: 'user@test.com' };
    signInWithPopup.mockResolvedValue({ user: mockUser });
    getDoc.mockResolvedValue({ exists: () => true });

    const result = await loginWithGoogle();
    expect(result.success).toBe(true);
    expect(result.isNewUser).toBe(false);
    expect(result.user).toEqual(mockUser);
  });

  it('should return isNewUser=true for new users', async () => {
    const mockUser = { uid: 'new-uid', email: 'new@test.com' };
    signInWithPopup.mockResolvedValue({ user: mockUser });
    getDoc.mockResolvedValue({ exists: () => false });

    const result = await loginWithGoogle();
    expect(result.success).toBe(true);
    expect(result.isNewUser).toBe(true);
  });

  it('should return error when popup is closed', async () => {
    signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

    const result = await loginWithGoogle();
    expect(result.success).toBe(false);
    expect(result.error).toContain('ventana de inicio');
  });

  it('should return error when popup is blocked', async () => {
    signInWithPopup.mockRejectedValue({ code: 'auth/popup-blocked' });

    const result = await loginWithGoogle();
    expect(result.success).toBe(false);
    expect(result.error).toContain('pop-ups');
  });
});

describe('completeRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail without user', async () => {
    const result = await completeRegistration(null, 'CODE1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('no autenticado');
  });

  it('should fail without invitation code', async () => {
    const mockUser = { uid: 'test-uid', email: 'user@test.com' };
    const result = await completeRegistration(mockUser, '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('invitacion es obligatorio');
  });

  it('should fail with invalid invitation code', async () => {
    validateInvitationCode.mockResolvedValue({ valid: false, error: 'Codigo no valido' });
    const mockUser = { uid: 'test-uid', email: 'user@test.com' };

    const result = await completeRegistration(mockUser, 'BADCODE');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Codigo no valido');
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('should create user profile with valid code', async () => {
    validateInvitationCode.mockResolvedValue({ valid: true, cohortId: 'cohort1', docId: 'doc1' });
    const mockUser = { uid: 'test-uid', email: 'user@test.com', displayName: 'Test User' };

    const result = await completeRegistration(mockUser, 'VALID123');
    expect(result.success).toBe(true);
    expect(setDoc).toHaveBeenCalled();
    expect(markCodeAsUsed).toHaveBeenCalledWith('doc1');
  });

  it('should use empty string when displayName is null', async () => {
    validateInvitationCode.mockResolvedValue({ valid: true, cohortId: 'cohort1', docId: 'doc1' });
    const mockUser = { uid: 'test-uid', email: 'user@test.com', displayName: null };

    const result = await completeRegistration(mockUser, 'VALID123');
    expect(result.success).toBe(true);
    expect(setDoc).toHaveBeenCalled();
  });
});

describe('logoutUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign out successfully', async () => {
    signOut.mockResolvedValue();

    const result = await logoutUser();
    expect(result.success).toBe(true);
    expect(signOut).toHaveBeenCalled();
  });

  it('should return error on signOut failure', async () => {
    signOut.mockRejectedValue(new Error('Network error'));

    const result = await logoutUser();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
});

describe('onAuthChange', () => {
  it('should subscribe to auth state changes', () => {
    const callback = vi.fn();
    const unsubscribe = vi.fn();
    onAuthStateChanged.mockReturnValue(unsubscribe);

    const unsub = onAuthChange(callback);
    expect(onAuthStateChanged).toHaveBeenCalledWith(expect.anything(), callback);
    expect(unsub).toBe(unsubscribe);
  });
});

describe('getCurrentUser', () => {
  it('should return null when no user is logged in', () => {
    const mockAuth = getAuth();
    mockAuth.currentUser = null;

    const user = getCurrentUser();
    expect(user).toBeNull();
  });

  it('should return user when logged in', () => {
    const mockAuth = getAuth();
    mockAuth.currentUser = { uid: 'test-uid', email: 'user@test.com' };

    const user = getCurrentUser();
    expect(user).toEqual({ uid: 'test-uid', email: 'user@test.com' });
  });
});

describe('mapFirebaseError', () => {
  it('should map auth/popup-closed-by-user', () => {
    const msg = mapFirebaseError('auth/popup-closed-by-user');
    expect(msg).toContain('ventana de inicio');
  });

  it('should map auth/popup-blocked', () => {
    const msg = mapFirebaseError('auth/popup-blocked');
    expect(msg).toContain('pop-ups');
  });

  it('should map auth/too-many-requests', () => {
    const msg = mapFirebaseError('auth/too-many-requests');
    expect(msg).toContain('Demasiados intentos');
  });

  it('should return generic message for unknown codes', () => {
    const msg = mapFirebaseError('auth/unknown-error');
    expect(msg).toContain('Error de autenticacion');
  });
});
