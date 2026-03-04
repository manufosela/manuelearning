import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config.js';
import { validateInvitationCode, markCodeAsUsed } from './invitation-codes.js';

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success
 * @property {import('firebase/auth').User} [user]
 * @property {boolean} [isNewUser] - true if the user has no Firestore profile yet
 * @property {string} [error]
 */

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google. If the user has no Firestore profile, returns isNewUser=true
 * so the caller can request an invitation code before creating the profile.
 * @returns {Promise<AuthResult>}
 */
export async function loginWithGoogle() {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { success: true, user, isNewUser: false };
    }

    return { success: true, user, isNewUser: true };
  } catch (err) {
    return { success: false, error: mapFirebaseError(err.code) };
  }
}

/**
 * Complete registration for a new Google user by validating the invitation code
 * and creating their Firestore profile.
 * @param {import('firebase/auth').User} user
 * @param {string} invitationCode
 * @returns {Promise<AuthResult>}
 */
export async function completeRegistration(user, invitationCode) {
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' };
  }

  if (!invitationCode || invitationCode.trim().length === 0) {
    return { success: false, error: 'El codigo de invitacion es obligatorio' };
  }

  const codeValidation = await validateInvitationCode(invitationCode);
  if (!codeValidation.valid) {
    return { success: false, error: codeValidation.error };
  }

  try {
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName || '',
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
 * Map Firebase error codes to user-friendly messages.
 * @param {string} code
 * @returns {string}
 */
export function mapFirebaseError(code) {
  const errors = {
    'auth/popup-closed-by-user': 'Se cerro la ventana de inicio de sesion',
    'auth/popup-blocked': 'El navegador bloqueo la ventana emergente. Permite pop-ups e intenta de nuevo',
    'auth/cancelled-popup-request': 'Se cancelo la solicitud de inicio de sesion',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email usando otro metodo',
    'auth/too-many-requests': 'Demasiados intentos. Intenta mas tarde',
  };

  return errors[code] || 'Error de autenticacion. Intenta de nuevo';
}
