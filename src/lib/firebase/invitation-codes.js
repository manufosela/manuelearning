import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
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

/**
 * Fetch all invitation codes for a cohort.
 * @param {string} cohortId
 * @returns {Promise<{success: boolean, codes?: InvitationCode[], error?: string}>}
 */
export async function fetchCodesByCohort(cohortId) {
  try {
    const codesRef = collection(db, 'invitationCodes');
    const q = query(codesRef, where('cohortId', '==', cohortId));
    const snapshot = await getDocs(q);

    const codes = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return { success: true, codes };
  } catch (err) {
    return { success: false, error: 'Error al cargar codigos de invitacion' };
  }
}

/**
 * Generate a random invitation code string.
 * @returns {string}
 */
export function generateCodeString() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new invitation code for a cohort.
 * @param {string} cohortId
 * @param {number} [maxUses=10]
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
 */
export async function createInvitationCode(cohortId, maxUses = 10) {
  if (!cohortId) {
    return { success: false, error: 'cohortId es obligatorio' };
  }

  const code = generateCodeString();

  try {
    await addDoc(collection(db, 'invitationCodes'), {
      code,
      cohortId,
      maxUses,
      usedCount: 0,
      active: true,
    });

    return { success: true, code };
  } catch (err) {
    return { success: false, error: 'Error al crear codigo de invitacion' };
  }
}

/**
 * Toggle the active state of an invitation code.
 * @param {string} docId
 * @param {boolean} active
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleCodeActive(docId, active) {
  try {
    const codeRef = doc(db, 'invitationCodes', docId);
    await updateDoc(codeRef, { active });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar el codigo' };
  }
}
