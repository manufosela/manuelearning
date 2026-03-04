import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const COLLECTION = 'cohorts';

/**
 * @typedef {Object} Cohort
 * @property {string} [id] - Firestore document ID
 * @property {string} name - Display name (e.g. "Cohorte Marzo 2026")
 * @property {string} code - Format YYYY-MM (e.g. "2026-03")
 * @property {string} startDate - ISO date string
 * @property {string} expiryDate - ISO date string
 * @property {boolean} active
 * @property {*} [createdAt]
 */

/**
 * Validate cohort data before creating/updating.
 * @param {Partial<Cohort>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCohort(data) {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: 'El nombre es obligatorio' };
  }

  if (!data.code || !/^\d{4}-\d{2}$/.test(data.code)) {
    return { valid: false, error: 'El código debe tener formato YYYY-MM' };
  }

  if (!data.startDate) {
    return { valid: false, error: 'La fecha de inicio es obligatoria' };
  }

  if (!data.expiryDate) {
    return { valid: false, error: 'La fecha de caducidad es obligatoria' };
  }

  if (new Date(data.expiryDate) <= new Date(data.startDate)) {
    return { valid: false, error: 'La fecha de caducidad debe ser posterior a la de inicio' };
  }

  return { valid: true };
}

/**
 * Fetch all cohorts ordered by startDate descending.
 * @returns {Promise<{success: boolean, cohorts?: Cohort[], error?: string}>}
 */
export async function fetchAllCohorts() {
  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);

    const cohorts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, cohorts };
  } catch (err) {
    return { success: false, error: 'Error al cargar cohortes' };
  }
}

/**
 * Fetch a single cohort by ID.
 * @param {string} id
 * @returns {Promise<{success: boolean, cohort?: Cohort, error?: string}>}
 */
export async function fetchCohort(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return { success: false, error: 'Cohorte no encontrada' };
    return { success: true, cohort: { id: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar la cohorte' };
  }
}

/**
 * Create a new cohort.
 * @param {Omit<Cohort, 'id'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createCohort(data) {
  const validation = validateCohort(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      name: data.name.trim(),
      code: data.code,
      startDate: data.startDate,
      expiryDate: data.expiryDate,
      active: data.active !== false,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear la cohorte' };
  }
}

/**
 * Update an existing cohort.
 * @param {string} id
 * @param {Partial<Cohort>} updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateCohort(id, updates) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, COLLECTION, id), updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar la cohorte' };
  }
}
