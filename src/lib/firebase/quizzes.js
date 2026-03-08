import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const QUIZZES = 'quizzes';
const RESPONSES = 'quizResponses';

/**
 * @typedef {Object} QuizQuestion
 * @property {string} text
 * @property {'open'|'multiple'} type
 * @property {string[]} [options]
 * @property {number} [correctAnswer]
 * @property {string} [explanation]
 */

/**
 * @typedef {Object} Quiz
 * @property {string} [id]
 * @property {string} title
 * @property {string} moduleId
 * @property {string} lessonId
 * @property {QuizQuestion[]} questions
 * @property {*} [createdAt]
 */

/**
 * Validate quiz data.
 * @param {Partial<Quiz>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateQuiz(data) {
  if (!data.title || data.title.trim().length === 0) {
    return { valid: false, error: 'El título es obligatorio' };
  }

  if (!data.moduleId) {
    return { valid: false, error: 'El módulo es obligatorio' };
  }

  if (!data.questions || data.questions.length === 0) {
    return { valid: false, error: 'Debe tener al menos una pregunta' };
  }

  for (const q of data.questions) {
    if (!q.text || q.text.trim().length === 0) {
      return { valid: false, error: 'Todas las preguntas deben tener texto' };
    }
    if (q.type === 'multiple' && (!q.options || q.options.length === 0)) {
      return { valid: false, error: 'Las preguntas de selección múltiple necesitan opciones' };
    }
  }

  return { valid: true };
}

/**
 * Fetch quizzes for a specific lesson.
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, quizzes?: Quiz[], error?: string}>}
 */
export async function fetchQuizzesByLessonId(lessonId) {
  if (!lessonId) return { success: false, error: 'lessonId es obligatorio' };

  try {
    const ref = collection(db, QUIZZES);
    const q = query(ref, where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);
    const quizzes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, quizzes };
  } catch (err) {
    return { success: false, error: 'Error al cargar quizzes de la lección' };
  }
}

/**
 * Fetch all quizzes.
 * @returns {Promise<{success: boolean, quizzes?: Quiz[], error?: string}>}
 */
export async function fetchAllQuizzes() {
  try {
    const ref = collection(db, QUIZZES);
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const quizzes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, quizzes };
  } catch (err) {
    return { success: false, error: 'Error al cargar quizzes' };
  }
}

/**
 * Fetch a single quiz.
 * @param {string} id
 * @returns {Promise<{success: boolean, quiz?: Quiz, error?: string}>}
 */
export async function fetchQuiz(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    const snap = await getDoc(doc(db, QUIZZES, id));
    if (!snap.exists()) return { success: false, error: 'Quiz no encontrado' };
    return { success: true, quiz: { id: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el quiz' };
  }
}

/**
 * Create a new quiz.
 * @param {Omit<Quiz, 'id'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createQuiz(data) {
  const validation = validateQuiz(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const ref = await addDoc(collection(db, QUIZZES), {
      title: data.title.trim(),
      moduleId: data.moduleId,
      lessonId: data.lessonId || '',
      questions: data.questions,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear el quiz' };
  }
}

/**
 * Update a quiz.
 * @param {string} id
 * @param {Partial<Quiz>} updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateQuiz(id, updates) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, QUIZZES, id), updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar el quiz' };
  }
}

/**
 * Delete a quiz.
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteQuiz(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await deleteDoc(doc(db, QUIZZES, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al eliminar el quiz' };
  }
}

/**
 * Fetch quiz for a specific lesson.
 * @param {string} moduleId
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, quiz?: Quiz|null, error?: string}>}
 */
export async function fetchQuizByLesson(moduleId, lessonId) {
  if (!moduleId || !lessonId) return { success: false, error: 'moduleId y lessonId son obligatorios' };

  try {
    const ref = collection(db, QUIZZES);
    const q = query(ref, where('moduleId', '==', moduleId), where('lessonId', '==', lessonId));
    const snapshot = await getDocs(q);

    if (snapshot.docs.length === 0) return { success: true, quiz: null };
    return { success: true, quiz: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el quiz de la clase' };
  }
}

/* ── Quiz Responses ─────────────────────────────────────────── */

/**
 * Submit a quiz response.
 * @param {string} userId
 * @param {string} quizId
 * @param {string[]} answers
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function submitQuizResponse(userId, quizId, answers) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };
  if (!quizId) return { success: false, error: 'quizId es obligatorio' };
  if (!answers || answers.length === 0) return { success: false, error: 'Las respuestas son obligatorias' };

  try {
    const ref = await addDoc(collection(db, RESPONSES), {
      userId,
      quizId,
      answers,
      completedAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al enviar las respuestas' };
  }
}

/**
 * Get a user's response to a quiz.
 * @param {string} userId
 * @param {string} quizId
 * @returns {Promise<{success: boolean, response?: Object|null, error?: string}>}
 */
export async function getUserQuizResponse(userId, quizId) {
  if (!userId || !quizId) return { success: false, error: 'userId y quizId son obligatorios' };

  try {
    const ref = collection(db, RESPONSES);
    const q = query(ref, where('userId', '==', userId), where('quizId', '==', quizId));
    const snapshot = await getDocs(q);

    if (snapshot.docs.length === 0) return { success: true, response: null };
    return { success: true, response: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar la respuesta' };
  }
}

/**
 * Get all responses for a quiz (admin).
 * @param {string} quizId
 * @returns {Promise<{success: boolean, responses?: Object[], error?: string}>}
 */
export async function getQuizResponses(quizId) {
  if (!quizId) return { success: false, error: 'quizId es obligatorio' };

  try {
    const ref = collection(db, RESPONSES);
    const q = query(ref, where('quizId', '==', quizId));
    const snapshot = await getDocs(q);

    const responses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, responses };
  } catch (err) {
    return { success: false, error: 'Error al cargar las respuestas' };
  }
}

/* ── Post-Lesson Quiz Responses ────────────────────────────── */

/**
 * @typedef {Object} QuestionResponse
 * @property {number} selectedIndex - Index of the selected option
 * @property {boolean} isCorrect - Whether the answer was correct
 */

/**
 * @typedef {Object} LessonQuizResponse
 * @property {string} [id]
 * @property {string} lessonId
 * @property {string} lessonTitle
 * @property {string} quizId
 * @property {string} studentId
 * @property {string} studentEmail
 * @property {QuestionResponse[]} answers - Array of answers, one per question
 * @property {*} [answeredAt]
 */

/**
 * Submit a post-lesson quiz response for a student.
 * @param {Omit<LessonQuizResponse, 'id'|'answeredAt'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function submitLessonQuizResponse(data) {
  if (!data.lessonId) return { success: false, error: 'lessonId es obligatorio' };
  if (!data.quizId) return { success: false, error: 'quizId es obligatorio' };
  if (!data.studentId) return { success: false, error: 'studentId es obligatorio' };
  if (!data.studentEmail) return { success: false, error: 'studentEmail es obligatorio' };
  if (!Array.isArray(data.answers) || data.answers.length === 0) {
    return { success: false, error: 'answers es obligatorio' };
  }

  try {
    const docId = `${data.studentId}_${data.lessonId}_${data.quizId}`;
    const ref = doc(db, RESPONSES, docId);
    await setDoc(ref, {
      lessonId: data.lessonId,
      lessonTitle: data.lessonTitle || '',
      quizId: data.quizId,
      studentId: data.studentId,
      studentEmail: data.studentEmail,
      answers: data.answers,
      answeredAt: serverTimestamp(),
    });
    return { success: true, id: docId };
  } catch (err) {
    return { success: false, error: 'Error al guardar la respuesta del quiz' };
  }
}

/**
 * Check if a student has already answered a specific lesson quiz.
 * @param {string} studentId
 * @param {string} lessonId
 * @param {string} quizId
 * @returns {Promise<{success: boolean, answered?: boolean, error?: string}>}
 */
export async function hasStudentAnsweredQuiz(studentId, lessonId, quizId) {
  if (!studentId || !lessonId || !quizId) return { success: false, error: 'studentId, lessonId y quizId son obligatorios' };

  try {
    const docId = `${studentId}_${lessonId}_${quizId}`;
    const snap = await getDoc(doc(db, RESPONSES, docId));
    return { success: true, answered: snap.exists() };
  } catch (err) {
    return { success: false, error: 'Error al verificar respuesta del quiz' };
  }
}

/**
 * Retrieve a student's previous response to a lesson quiz.
 * @param {string} studentId
 * @param {string} lessonId
 * @param {string} quizId
 * @returns {Promise<{success: boolean, response?: LessonQuizResponse|null, error?: string}>}
 */
export async function getStudentQuizResponse(studentId, lessonId, quizId) {
  if (!studentId || !lessonId || !quizId) return { success: false, error: 'studentId, lessonId y quizId son obligatorios' };

  try {
    const docId = `${studentId}_${lessonId}_${quizId}`;
    const snap = await getDoc(doc(db, RESPONSES, docId));

    if (!snap.exists()) return { success: true, response: null };
    return { success: true, response: { id: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al obtener la respuesta del quiz' };
  }
}

/**
 * @typedef {Object} QuizResultDetail
 * @property {string} responseId
 * @property {string} quizId
 * @property {string} quizTitle
 * @property {QuizQuestion[]} questions
 * @property {string[]} userAnswers
 * @property {*} completedAt
 */

/**
 * Get all quiz results for a user, including quiz details.
 * @param {string} userId
 * @returns {Promise<{success: boolean, results?: QuizResultDetail[], error?: string}>}
 */
export async function getUserQuizResults(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const ref = collection(db, RESPONSES);
    const q = query(ref, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.docs.length === 0) {
      return { success: true, results: [] };
    }

    const results = [];
    for (const responseDoc of snapshot.docs) {
      const responseData = responseDoc.data();
      const quizSnap = await getDoc(doc(db, QUIZZES, responseData.quizId));

      if (quizSnap.exists()) {
        const quizData = quizSnap.data();
        results.push({
          responseId: responseDoc.id,
          quizId: responseData.quizId,
          quizTitle: quizData.title,
          questions: quizData.questions || [],
          userAnswers: responseData.answers || [],
          completedAt: responseData.completedAt,
        });
      }
    }

    return { success: true, results };
  } catch (err) {
    return { success: false, error: 'Error al cargar los resultados de quizzes' };
  }
}
