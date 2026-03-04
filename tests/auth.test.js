import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock Firebase modules before importing auth functions.
 * This allows testing auth logic without actual Firebase connection.
 */
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => {
  const mockAuth = { currentUser: null };
  return {
    getAuth: vi.fn(() => mockAuth),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
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
  validateCredentials,
  mapFirebaseError,
  registerUser,
  loginUser,
  logoutUser,
  onAuthChange,
  getCurrentUser,
} from '../src/lib/firebase/auth.js';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getAuth,
} from 'firebase/auth';

import { setDoc } from 'firebase/firestore';
import { validateInvitationCode, markCodeAsUsed } from '../src/lib/firebase/invitation-codes.js';

describe('validateCredentials', () => {
  it('should reject empty email', () => {
    const result = validateCredentials('', 'password123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('email es obligatorio');
  });

  it('should reject null email', () => {
    const result = validateCredentials(null, 'password123');
    expect(result.valid).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = validateCredentials('notanemail', 'password123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('formato del email');
  });

  it('should reject email without domain', () => {
    const result = validateCredentials('user@', 'password123');
    expect(result.valid).toBe(false);
  });

  it('should reject empty password', () => {
    const result = validateCredentials('user@test.com', '');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('contraseña es obligatoria');
  });

  it('should reject short password', () => {
    const result = validateCredentials('user@test.com', '12345');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('al menos 6 caracteres');
  });

  it('should accept valid credentials', () => {
    const result = validateCredentials('user@test.com', 'password123');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should trim email whitespace', () => {
    const result = validateCredentials('  user@test.com  ', 'password123');
    expect(result.valid).toBe(true);
  });
});

describe('mapFirebaseError', () => {
  it('should map auth/email-already-in-use', () => {
    const msg = mapFirebaseError('auth/email-already-in-use');
    expect(msg).toContain('ya está registrado');
  });

  it('should map auth/user-not-found', () => {
    const msg = mapFirebaseError('auth/user-not-found');
    expect(msg).toContain('No existe una cuenta');
  });

  it('should map auth/wrong-password', () => {
    const msg = mapFirebaseError('auth/wrong-password');
    expect(msg).toContain('Contraseña incorrecta');
  });

  it('should map auth/invalid-credential', () => {
    const msg = mapFirebaseError('auth/invalid-credential');
    expect(msg).toContain('Credenciales inválidas');
  });

  it('should map auth/too-many-requests', () => {
    const msg = mapFirebaseError('auth/too-many-requests');
    expect(msg).toContain('Demasiados intentos');
  });

  it('should return generic message for unknown codes', () => {
    const msg = mapFirebaseError('auth/unknown-error');
    expect(msg).toContain('Error de autenticación');
  });
});

describe('registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail with invalid email', async () => {
    const result = await registerUser('invalid', 'password123', '', 'CODE1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('formato del email');
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('should fail with short password', async () => {
    const result = await registerUser('user@test.com', '123', '', 'CODE1');
    expect(result.success).toBe(false);
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('should fail without invitation code', async () => {
    const result = await registerUser('user@test.com', 'password123', 'Name');
    expect(result.success).toBe(false);
    expect(result.error).toContain('código de invitación es obligatorio');
  });

  it('should fail with invalid invitation code', async () => {
    validateInvitationCode.mockResolvedValue({ valid: false, error: 'Código no válido' });

    const result = await registerUser('user@test.com', 'password123', 'Name', 'BADCODE');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Código no válido');
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('should create user with cohortId on valid invitation code', async () => {
    validateInvitationCode.mockResolvedValue({ valid: true, cohortId: 'cohort1', docId: 'doc1' });
    const mockUser = { uid: 'test-uid', email: 'user@test.com' };
    createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await registerUser('user@test.com', 'password123', 'Test User', 'VALID123');

    expect(result.success).toBe(true);
    expect(result.user).toEqual(mockUser);
    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalled();
    expect(markCodeAsUsed).toHaveBeenCalledWith('doc1');
  });

  it('should return mapped error on Firebase failure', async () => {
    validateInvitationCode.mockResolvedValue({ valid: true, cohortId: 'c1', docId: 'd1' });
    createUserWithEmailAndPassword.mockRejectedValue({
      code: 'auth/email-already-in-use',
    });

    const result = await registerUser('user@test.com', 'password123', '', 'CODE1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('ya está registrado');
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail with invalid credentials format', async () => {
    const result = await loginUser('', 'password');
    expect(result.success).toBe(false);
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('should return user on successful login', async () => {
    const mockUser = { uid: 'test-uid', email: 'user@test.com' };
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    const result = await loginUser('user@test.com', 'password123');
    expect(result.success).toBe(true);
    expect(result.user).toEqual(mockUser);
  });

  it('should return mapped error on wrong credentials', async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: 'auth/invalid-credential',
    });

    const result = await loginUser('user@test.com', 'wrongpass');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Credenciales inválidas');
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
