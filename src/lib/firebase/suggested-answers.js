import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const SUGGESTED = 'suggestedAnswers';

/**
 * @typedef {Object} SuggestedAnswer
 * @property {string} [id]
 * @property {string} questionId
 * @property {string} answer
 * @property {string[]} [sources]
 * @property {'pending'|'approved'|'rejected'} status
 * @property {*} [createdAt]
 */

/**
 * Create a suggested answer.
 * @param {{questionId: string, answer: string, sources?: string[]}} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createSuggestedAnswer(data) {
  if (!data.questionId) return { success: false, error: 'questionId es obligatorio' };
  if (!data.answer || data.answer.trim().length === 0) {
    return { success: false, error: 'La respuesta sugerida es obligatoria' };
  }

  try {
    const ref = await addDoc(collection(db, SUGGESTED), {
      questionId: data.questionId,
      answer: data.answer.trim(),
      sources: data.sources || [],
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear la sugerencia' };
  }
}

/**
 * Fetch suggested answers for a question.
 * @param {string} questionId
 * @returns {Promise<{success: boolean, suggestions?: SuggestedAnswer[], error?: string}>}
 */
export async function fetchSuggestedByQuestion(questionId) {
  if (!questionId) return { success: false, error: 'questionId es obligatorio' };

  try {
    const ref = collection(db, SUGGESTED);
    const q = query(ref, where('questionId', '==', questionId));
    const snapshot = await getDocs(q);
    const suggestions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, suggestions };
  } catch (err) {
    return { success: false, error: 'Error al cargar sugerencias' };
  }
}

/**
 * Fetch all pending suggested answers.
 * @returns {Promise<{success: boolean, suggestions?: SuggestedAnswer[], error?: string}>}
 */
export async function fetchPendingSuggestions() {
  try {
    const ref = collection(db, SUGGESTED);
    const q = query(ref, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const suggestions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, suggestions };
  } catch (err) {
    return { success: false, error: 'Error al cargar sugerencias pendientes' };
  }
}

/**
 * Approve a suggested answer.
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function approveSuggestion(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, SUGGESTED, id), { status: 'approved' });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al aprobar la sugerencia' };
  }
}

/**
 * Reject a suggested answer.
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rejectSuggestion(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, SUGGESTED, id), { status: 'rejected' });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al rechazar la sugerencia' };
  }
}
