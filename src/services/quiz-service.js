import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config.js';

const COLLECTION = 'quizzes';

/**
 * @typedef {Object} LessonQuiz
 * @property {string} lessonId
 * @property {string} question - The question text
 * @property {string[]} options - Array of answer options
 * @property {number} correctIndex - Index of the correct answer in options
 * @property {string} [explanation] - Optional explanation shown after answering
 * @property {*} [createdAt]
 * @property {*} [updatedAt]
 */

/**
 * Validate lesson quiz data.
 * @param {Partial<LessonQuiz>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLessonQuiz(data) {
  if (!data.lessonId) {
    return { valid: false, error: 'lessonId es obligatorio' };
  }
  if (!data.question || data.question.trim().length === 0) {
    return { valid: false, error: 'La pregunta es obligatoria' };
  }
  if (!Array.isArray(data.options) || data.options.length < 2) {
    return { valid: false, error: 'Se necesitan al menos 2 opciones de respuesta' };
  }
  for (const opt of data.options) {
    if (!opt || (typeof opt === 'string' && opt.trim().length === 0)) {
      return { valid: false, error: 'Todas las opciones deben tener texto' };
    }
  }
  if (data.correctIndex == null || !Number.isInteger(data.correctIndex)) {
    return { valid: false, error: 'El índice de respuesta correcta es obligatorio' };
  }
  if (data.correctIndex < 0 || data.correctIndex >= data.options.length) {
    return { valid: false, error: 'El índice de respuesta correcta está fuera de rango' };
  }
  return { valid: true };
}

/**
 * Get the quiz for a lesson.
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, quiz?: LessonQuiz|null, error?: string}>}
 */
export async function getLessonQuiz(lessonId) {
  if (!lessonId) return { success: false, error: 'lessonId es obligatorio' };

  try {
    const snap = await getDoc(doc(db, COLLECTION, lessonId));
    if (!snap.exists()) return { success: true, quiz: null };
    return { success: true, quiz: { lessonId: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el quiz de la lección' };
  }
}

/**
 * Save (create or update) the quiz for a lesson.
 * Uses the lessonId as document ID so each lesson has exactly one quiz.
 * @param {LessonQuiz} data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveLessonQuiz(data) {
  const validation = validateLessonQuiz(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const ref = doc(db, COLLECTION, data.lessonId);
    const existing = await getDoc(ref);

    await setDoc(ref, {
      question: data.question.trim(),
      options: data.options.map((o) => (typeof o === 'string' ? o.trim() : o)),
      correctIndex: data.correctIndex,
      explanation: data.explanation ? data.explanation.trim() : null,
      ...(existing.exists() ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() }),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al guardar el quiz de la lección' };
  }
}

/**
 * Delete the quiz for a lesson.
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteLessonQuiz(lessonId) {
  if (!lessonId) return { success: false, error: 'lessonId es obligatorio' };

  try {
    await deleteDoc(doc(db, COLLECTION, lessonId));
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al eliminar el quiz de la lección' };
  }
}

/**
 * Check if a user's answer is correct for a lesson quiz.
 * @param {string} lessonId
 * @param {number} selectedIndex - The index the user selected
 * @returns {Promise<{success: boolean, correct?: boolean, explanation?: string|null, error?: string}>}
 */
export async function checkLessonQuizAnswer(lessonId, selectedIndex) {
  if (!lessonId) return { success: false, error: 'lessonId es obligatorio' };
  if (selectedIndex == null || !Number.isInteger(selectedIndex)) {
    return { success: false, error: 'selectedIndex debe ser un entero' };
  }

  const { success, quiz, error } = await getLessonQuiz(lessonId);
  if (!success) return { success: false, error };
  if (!quiz) return { success: false, error: 'No hay quiz para esta lección' };

  return {
    success: true,
    correct: selectedIndex === quiz.correctIndex,
    explanation: quiz.explanation || null,
  };
}
