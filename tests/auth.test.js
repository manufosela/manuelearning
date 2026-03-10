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
  orderBy: vi.fn(),
}));

vi.mock('../src/lib/firebase/cohorts.js', () => ({
  fetchAllCohorts: vi.fn(),
}));

import {
  loginWithGoogle,
  completeRegistration,
  fetchActiveConvocatorias,
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
import { fetchAllCohorts } from '../src/lib/firebase/cohorts.js';

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
    const result = await completeRegistration(null, 'cohort1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('no autenticado');
  });

  it('should create user profile with cohortId', async () => {
    const mockUser = { uid: 'test-uid', email: 'user@test.com', displayName: 'Test User' };

    const result = await completeRegistration(mockUser, 'cohort1');
    expect(result.success).toBe(true);
    expect(setDoc).toHaveBeenCalled();
    const callArgs = setDoc.mock.calls[0][1];
    expect(callArgs.status).toBe('pending');
    expect(callArgs.cohortId).toBe('cohort1');
  });

  it('should create user profile without cohortId (empty string)', async () => {
    const mockUser = { uid: 'test-uid', email: 'user@test.com', displayName: 'Test User' };

    const result = await completeRegistration(mockUser, '');
    expect(result.success).toBe(true);
    expect(setDoc).toHaveBeenCalled();
    const callArgs = setDoc.mock.calls[0][1];
    expect(callArgs.status).toBe('pending');
    expect(callArgs.cohortId).toBe('');
  });

  it('should create user profile without cohortId (null)', async () => {
    const mockUser = { uid: 'test-uid', email: 'user@test.com', displayName: 'Test User' };

    const result = await completeRegistration(mockUser, null);
    expect(result.success).toBe(true);
    const callArgs = setDoc.mock.calls[0][1];
    expect(callArgs.cohortId).toBe('');
  });

  it('should use empty string when displayName is null', async () => {
    const mockUser = { uid: 'test-uid', email: 'user@test.com', displayName: null };

    const result = await completeRegistration(mockUser, 'cohort1');
    expect(result.success).toBe(true);
    const callArgs = setDoc.mock.calls[0][1];
    expect(callArgs.displayName).toBe('');
  });
});

describe('fetchActiveConvocatorias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return only active non-expired cohorts', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
    const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    fetchAllCohorts.mockResolvedValue({
      success: true,
      cohorts: [
        { id: 'c1', name: 'Activa futura', active: true, expiryDate: future },
        { id: 'c2', name: 'Inactiva', active: false, expiryDate: future },
        { id: 'c3', name: 'Expirada', active: true, expiryDate: past },
        { id: 'c4', name: 'Activa hoy', active: true, expiryDate: today },
      ],
    });

    const result = await fetchActiveConvocatorias();
    expect(result.success).toBe(true);
    expect(result.cohorts).toHaveLength(2);
    expect(result.cohorts.map((c) => c.id)).toEqual(['c1', 'c4']);
  });

  it('should propagate error from fetchAllCohorts', async () => {
    fetchAllCohorts.mockResolvedValue({ success: false, error: 'Error al cargar' });

    const result = await fetchActiveConvocatorias();
    expect(result.success).toBe(false);
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
