import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';
import { updateStreak } from './streaks.js';

const COLLECTION = 'progress';

/**
 * @typedef {Object} LessonProgress
 * @property {string} moduleId
 * @property {string} lessonId
 * @property {boolean} completed
 * @property {*} [completedAt]
 */

/**
 * Mark a lesson as completed for a user.
 * Document ID format: {userId}_{moduleId}_{lessonId}
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markLessonCompleted(userId, moduleId, lessonId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };
  if (!moduleId) return { success: false, error: 'moduleId es obligatorio' };
  if (!lessonId) return { success: false, error: 'lessonId es obligatorio' };

  try {
    const docId = `${userId}_${moduleId}_${lessonId}`;
    await setDoc(doc(db, COLLECTION, docId), {
      userId,
      moduleId,
      lessonId,
      completed: true,
      completedAt: serverTimestamp(),
    });
    updateStreak(userId).catch(() => {});
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al guardar el progreso' };
  }
}

/**
 * Check if a lesson is completed for a user.
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @returns {Promise<boolean>}
 */
export async function isLessonCompleted(userId, moduleId, lessonId) {
  if (!userId || !moduleId || !lessonId) return false;

  try {
    const docId = `${userId}_${moduleId}_${lessonId}`;
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists() && snap.data().completed === true;
  } catch {
    return false;
  }
}

/**
 * Get all completed lessons for a user.
 * @param {string} userId
 * @returns {Promise<{success: boolean, completedLessons?: LessonProgress[], error?: string}>}
 */
export async function getUserProgress(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, where('userId', '==', userId), where('completed', '==', true));
    const snapshot = await getDocs(q);

    const completedLessons = snapshot.docs.map((d) => d.data());
    return { success: true, completedLessons };
  } catch (err) {
    return { success: false, error: 'Error al cargar el progreso' };
  }
}

/**
 * Calculate progress percentage.
 * @param {number} completed
 * @param {number} total
 * @returns {number} Integer percentage 0-100
 */
export function calculateProgress(completed, total) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
