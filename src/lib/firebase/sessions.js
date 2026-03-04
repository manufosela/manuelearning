import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const SESSIONS = 'sessions';

/**
 * @typedef {Object} Session
 * @property {string} [id]
 * @property {string} title
 * @property {string} date
 * @property {string} time
 * @property {number} duration
 * @property {string} zoomUrl
 * @property {string} moduleId
 * @property {string} cohortId
 * @property {string} [quizId]
 * @property {*} [createdAt]
 */

/**
 * Validate session data.
 * @param {Partial<Session>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSession(data) {
  if (!data.title || data.title.trim().length === 0) {
    return { valid: false, error: 'El título es obligatorio' };
  }
  if (!data.date) {
    return { valid: false, error: 'La fecha es obligatoria' };
  }
  if (!data.time) {
    return { valid: false, error: 'La hora es obligatoria' };
  }
  if (!data.duration || data.duration <= 0) {
    return { valid: false, error: 'La duración debe ser mayor a 0' };
  }
  if (!data.zoomUrl) {
    return { valid: false, error: 'La URL de Zoom es obligatoria' };
  }
  if (!data.moduleId) {
    return { valid: false, error: 'El módulo es obligatorio' };
  }
  if (!data.cohortId) {
    return { valid: false, error: 'La cohorte es obligatoria' };
  }
  return { valid: true };
}

/**
 * Fetch all sessions ordered by date.
 * @returns {Promise<{success: boolean, sessions?: Session[], error?: string}>}
 */
export async function fetchAllSessions() {
  try {
    const ref = collection(db, SESSIONS);
    const q = query(ref, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, sessions };
  } catch (err) {
    return { success: false, error: 'Error al cargar sesiones' };
  }
}

/**
 * Fetch a single session.
 * @param {string} id
 * @returns {Promise<{success: boolean, session?: Session, error?: string}>}
 */
export async function fetchSession(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    const snap = await getDoc(doc(db, SESSIONS, id));
    if (!snap.exists()) return { success: false, error: 'Sesión no encontrada' };
    return { success: true, session: { id: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar la sesión' };
  }
}

/**
 * Create a new session.
 * @param {Omit<Session, 'id'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createSession(data) {
  const validation = validateSession(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const ref = await addDoc(collection(db, SESSIONS), {
      title: data.title.trim(),
      date: data.date,
      time: data.time,
      duration: data.duration,
      zoomUrl: data.zoomUrl,
      moduleId: data.moduleId,
      cohortId: data.cohortId,
      quizId: data.quizId || '',
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear la sesión' };
  }
}

/**
 * Update a session.
 * @param {string} id
 * @param {Partial<Session>} updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateSession(id, updates) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, SESSIONS, id), updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar la sesión' };
  }
}

/**
 * Delete a session.
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteSession(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await deleteDoc(doc(db, SESSIONS, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al eliminar la sesión' };
  }
}

/**
 * Fetch sessions filtered by cohort.
 * @param {string} cohortId
 * @returns {Promise<{success: boolean, sessions?: Session[], error?: string}>}
 */
export async function fetchSessionsByCohort(cohortId) {
  if (!cohortId) return { success: false, error: 'cohortId es obligatorio' };

  try {
    const ref = collection(db, SESSIONS);
    const q = query(ref, where('cohortId', '==', cohortId), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, sessions };
  } catch (err) {
    return { success: false, error: 'Error al cargar sesiones de la cohorte' };
  }
}
