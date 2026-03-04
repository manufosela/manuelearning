import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './config.js';
import { createNotification } from './notifications.js';

const QUESTIONS = 'questions';

/**
 * @typedef {Object} Answer
 * @property {string} text
 * @property {string} userId
 * @property {string} userName
 * @property {*} [createdAt]
 */

/**
 * @typedef {Object} Question
 * @property {string} [id]
 * @property {string} text
 * @property {string} userId
 * @property {string} userName
 * @property {string} lessonId
 * @property {string} moduleId
 * @property {Answer[]} [answers]
 * @property {*} [createdAt]
 */

/**
 * Validate question data.
 * @param {Partial<Question>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateQuestion(data) {
  if (!data.text || data.text.trim().length === 0) {
    return { valid: false, error: 'El texto de la pregunta es obligatorio' };
  }
  if (!data.userId) {
    return { valid: false, error: 'userId es obligatorio' };
  }
  if (!data.lessonId) {
    return { valid: false, error: 'lessonId es obligatorio' };
  }
  if (!data.moduleId) {
    return { valid: false, error: 'moduleId es obligatorio' };
  }
  return { valid: true };
}

/**
 * Fetch all questions (admin).
 * @returns {Promise<{success: boolean, questions?: Question[], error?: string}>}
 */
export async function fetchAllQuestions() {
  try {
    const ref = collection(db, QUESTIONS);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, questions };
  } catch (err) {
    return { success: false, error: 'Error al cargar preguntas' };
  }
}

/**
 * Fetch questions for a lesson.
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, questions?: Question[], error?: string}>}
 */
export async function fetchQuestionsByLesson(lessonId) {
  if (!lessonId) return { success: false, error: 'lessonId es obligatorio' };

  try {
    const ref = collection(db, QUESTIONS);
    const q = query(ref, where('lessonId', '==', lessonId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, questions };
  } catch (err) {
    return { success: false, error: 'Error al cargar preguntas' };
  }
}

/**
 * Create a new question.
 * @param {Omit<Question, 'id'|'answers'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createQuestion(data) {
  const validation = validateQuestion(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const ref = await addDoc(collection(db, QUESTIONS), {
      text: data.text.trim(),
      userId: data.userId,
      userName: data.userName || '',
      lessonId: data.lessonId,
      moduleId: data.moduleId,
      answers: [],
      createdAt: serverTimestamp(),
    });

    createNotification({
      type: 'new_question',
      message: `Nueva pregunta de ${data.userName || 'Anónimo'}: ${data.text.trim().slice(0, 100)}`,
      questionId: ref.id,
      lessonId: data.lessonId,
    }).catch(() => {});

    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear la pregunta' };
  }
}

/**
 * Add an answer to a question.
 * @param {string} questionId
 * @param {Omit<Answer, 'createdAt'>} answer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addAnswer(questionId, answer) {
  if (!questionId) return { success: false, error: 'questionId es obligatorio' };
  if (!answer.text || answer.text.trim().length === 0) {
    return { success: false, error: 'El texto de la respuesta es obligatorio' };
  }

  try {
    await updateDoc(doc(db, QUESTIONS, questionId), {
      answers: arrayUnion({
        text: answer.text.trim(),
        userId: answer.userId,
        userName: answer.userName || '',
        createdAt: new Date().toISOString(),
      }),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al añadir la respuesta' };
  }
}

/**
 * Delete a question.
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteQuestion(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await deleteDoc(doc(db, QUESTIONS, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al eliminar la pregunta' };
  }
}
