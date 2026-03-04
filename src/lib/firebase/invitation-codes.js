import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './config.js';

/**
 * @typedef {Object} InvitationCode
 * @property {string} code
 * @property {string} cohortId
 * @property {number} maxUses
 * @property {number} usedCount
 * @property {boolean} active
 */

/**
 * @typedef {Object} CodeValidationResult
 * @property {boolean} valid
 * @property {string} [cohortId]
 * @property {string} [docId]
 * @property {string} [error]
 */

/**
 * Validate an invitation code.
 * Checks that the code exists, is active, and has remaining uses.
 * @param {string} code - The invitation code to validate
 * @returns {Promise<CodeValidationResult>}
 */
export async function validateInvitationCode(code) {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return { valid: false, error: 'El código de invitación es obligatorio' };
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const codesRef = collection(db, 'invitationCodes');
    const q = query(codesRef, where('code', '==', normalizedCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { valid: false, error: 'Código de invitación no válido' };
    }

    const codeDoc = snapshot.docs[0];
    const data = /** @type {InvitationCode} */ (codeDoc.data());

    if (!data.active) {
      return { valid: false, error: 'Este código ha sido desactivado' };
    }

    if (data.usedCount >= data.maxUses) {
      return { valid: false, error: 'Este código ha alcanzado el límite de usos' };
    }

    return {
      valid: true,
      cohortId: data.cohortId,
      docId: codeDoc.id,
    };
  } catch (err) {
    return { valid: false, error: 'Error al validar el código. Intenta de nuevo' };
  }
}

/**
 * Mark an invitation code as used (increment usedCount).
 * @param {string} docId - Firestore document ID of the invitation code
 * @returns {Promise<boolean>}
 */
export async function markCodeAsUsed(docId) {
  try {
    const codeRef = doc(db, 'invitationCodes', docId);
    await updateDoc(codeRef, { usedCount: increment(1) });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Normalize invitation code for comparison.
 * @param {string} code
 * @returns {string}
 */
export function normalizeCode(code) {
  return (code || '').trim().toUpperCase();
}
