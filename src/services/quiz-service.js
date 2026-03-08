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
 * @typedef {Object} LessonQuizQuestion
 * @property {string} question - The question text
 * @property {string[]} options - Array of answer options
 * @property {number} correctIndex - Index of the correct answer in options
 * @property {string} [explanation] - Optional explanation shown after answering
 */

/**
 * @typedef {Object} LessonQuiz
 * @property {string} lessonId
 * @property {LessonQuizQuestion[]} questions - Array of 1-3 questions
 * @property {*} [createdAt]
 * @property {*} [updatedAt]
 */

/**
 * Validate a single question object.
 * @param {Partial<LessonQuizQuestion>} q
 * @param {number} index
 * @returns {{ valid: boolean, error?: string }}
 */
function validateQuestion(q, index) {
  const prefix = `Pregunta ${index + 1}:`;
  if (!q.question || q.question.trim().length === 0) {
    return { valid: false, error: `${prefix} el texto es obligatorio` };
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    return { valid: false, error: `${prefix} se necesitan al menos 2 opciones` };
  }
  for (const opt of q.options) {
    if (!opt || (typeof opt === 'string' && opt.trim().length === 0)) {
      return { valid: false, error: `${prefix} todas las opciones deben tener texto` };
    }
  }
  if (q.correctIndex == null || !Number.isInteger(q.correctIndex)) {
    return { valid: false, error: `${prefix} el índice de respuesta correcta es obligatorio` };
  }
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    return { valid: false, error: `${prefix} el índice de respuesta correcta está fuera de rango` };
  }
  return { valid: true };
}

/**
 * Validate lesson quiz data.
 * @param {Partial<LessonQuiz>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLessonQuiz(data) {
  if (!data.lessonId) {
    return { valid: false, error: 'lessonId es obligatorio' };
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    return { valid: false, error: 'Se necesita al menos 1 pregunta' };
  }
  if (data.questions.length > 3) {
    return { valid: false, error: 'Un quiz puede tener máximo 3 preguntas' };
  }
  for (let i = 0; i < data.questions.length; i++) {
    const result = validateQuestion(data.questions[i], i);
    if (!result.valid) return result;
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

    const questions = data.questions.map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => (typeof o === 'string' ? o.trim() : o)),
      correctIndex: q.correctIndex,
      explanation: q.explanation ? q.explanation.trim() : null,
    }));

    await setDoc(ref, {
      questions,
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
 * Check answers for a lesson quiz (supports multiple questions).
 * @param {string} lessonId
 * @param {number[]} selectedIndexes - Array of selected indexes, one per question
 * @returns {Promise<{success: boolean, results?: Array<{correct: boolean, explanation: string|null}>, error?: string}>}
 */
export async function checkLessonQuizAnswers(lessonId, selectedIndexes) {
  if (!lessonId) return { success: false, error: 'lessonId es obligatorio' };
  if (!Array.isArray(selectedIndexes) || selectedIndexes.length === 0) {
    return { success: false, error: 'selectedIndexes debe ser un array no vacío' };
  }

  const { success, quiz, error } = await getLessonQuiz(lessonId);
  if (!success) return { success: false, error };
  if (!quiz) return { success: false, error: 'No hay quiz para esta lección' };

  if (selectedIndexes.length !== quiz.questions.length) {
    return { success: false, error: 'El número de respuestas no coincide con el número de preguntas' };
  }

  const results = quiz.questions.map((q, i) => ({
    correct: selectedIndexes[i] === q.correctIndex,
    explanation: q.explanation || null,
  }));

  return { success: true, results };
}
