import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config.js';
import { validateInvitationCode, markCodeAsUsed } from './invitation-codes.js';

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success
 * @property {import('firebase/auth').User} [user]
 * @property {string} [error]
 */

/**
 * Register a new user with email, password and invitation code.
 * Validates the invitation code first, then creates the user and Firestore profile.
 * @param {string} email
 * @param {string} password
 * @param {string} [displayName]
 * @param {string} [invitationCode]
 * @returns {Promise<AuthResult>}
 */
export async function registerUser(email, password, displayName = '', invitationCode = '') {
  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (!invitationCode || invitationCode.trim().length === 0) {
    return { success: false, error: 'El código de invitación es obligatorio para registrarse' };
  }

  const codeValidation = await validateInvitationCode(invitationCode);
  if (!codeValidation.valid) {
    return { success: false, error: codeValidation.error };
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName,
      role: 'student',
      cohortId: codeValidation.cohortId,
      createdAt: serverTimestamp(),
    });

    await markCodeAsUsed(codeValidation.docId);

    return { success: true, user };
  } catch (err) {
    return { success: false, error: mapFirebaseError(err.code) };
  }
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthResult>}
 */
export async function loginUser(email, password) {
  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (err) {
    return { success: false, error: mapFirebaseError(err.code) };
  }
}

/**
 * Sign out the current user.
 * @returns {Promise<AuthResult>}
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe to auth state changes.
 * @param {function(import('firebase/auth').User|null): void} callback
 * @returns {function(): void} Unsubscribe function
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the currently authenticated user.
 * @returns {import('firebase/auth').User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Validate email and password before sending to Firebase.
 * @param {string} email
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCredentials(email, password) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'El email es obligatorio' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'El formato del email no es válido' };
  }

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'La contraseña es obligatoria' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  return { valid: true };
}

/**
 * Map Firebase error codes to user-friendly messages.
 * @param {string} code
 * @returns {string}
 */
export function mapFirebaseError(code) {
  const errors = {
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/invalid-email': 'El formato del email no es válido',
    'auth/weak-password': 'La contraseña es demasiado débil',
    'auth/user-not-found': 'No existe una cuenta con este email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
  };

  return errors[code] || 'Error de autenticación. Intenta de nuevo';
}
