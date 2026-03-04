import { onAuthChange } from './firebase/auth.js';

/**
 * Returns a promise that resolves with the authenticated user
 * once Firebase Auth confirms the session. Rejects if no user.
 * @returns {Promise<import('firebase/auth').User>}
 */
export function waitForAuth() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthChange((user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        reject(new Error('No authenticated user'));
      }
    });
  });
}
