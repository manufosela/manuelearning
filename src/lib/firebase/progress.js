import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config.js';
import { updateStreak } from './streaks.js';
import { awardBadge } from './badges.js';
import { fetchLessons, fetchAllModules } from './modules.js';

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
    checkAndAwardBadges(userId, moduleId).catch(() => {});
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al guardar el progreso' };
  }
}

/**
 * Check if a module is fully completed and award badges.
 * Also checks if the entire course is completed.
 * @param {string} userId
 * @param {string} moduleId
 */
async function checkAndAwardBadges(userId, moduleId) {
  const lessonsResult = await fetchLessons(moduleId);
  if (!lessonsResult.success || !lessonsResult.lessons?.length) return;

  const totalLessons = lessonsResult.lessons.length;
  const progressRef = collection(db, COLLECTION);
  const q = query(
    progressRef,
    where('userId', '==', userId),
    where('moduleId', '==', moduleId),
    where('completed', '==', true)
  );
  const snapshot = await getDocs(q);

  if (snapshot.size < totalLessons) return;

  // Module fully completed — fetch module title for the badge
  const moduleDoc = await getDoc(doc(db, 'modules', moduleId));
  const moduleTitle = moduleDoc.exists() ? moduleDoc.data().title : moduleId;
  await awardBadge(userId, 'module_complete', moduleId, moduleTitle);

  // Check if entire course is completed
  const courseName = moduleDoc.exists() ? moduleDoc.data().course : null;
  if (!courseName) return;

  const modulesResult = await fetchAllModules();
  if (!modulesResult.success) return;

  const courseModules = modulesResult.modules.filter((m) => m.course === courseName);
  if (courseModules.length === 0) return;

  for (const mod of courseModules) {
    const modLessons = await fetchLessons(mod.id);
    if (!modLessons.success || !modLessons.lessons?.length) return;

    const modQ = query(
      progressRef,
      where('userId', '==', userId),
      where('moduleId', '==', mod.id),
      where('completed', '==', true)
    );
    const modSnap = await getDocs(modQ);
    if (modSnap.size < modLessons.lessons.length) return;
  }

  // All modules in course completed
  await awardBadge(userId, 'course_complete', courseName, courseName);
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

/**
 * Save the last watched video position for a lesson.
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @param {number} seconds - current video time in seconds
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveVideoPosition(userId, moduleId, lessonId, seconds) {
  if (!userId || !moduleId || !lessonId) return { success: false, error: 'Parámetros requeridos' };

  try {
    const docId = `${userId}_${moduleId}_${lessonId}`;
    const ref = doc(db, COLLECTION, docId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, { videoPosition: seconds });
    } else {
      await setDoc(ref, {
        userId,
        moduleId,
        lessonId,
        completed: false,
        videoPosition: seconds,
      });
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Error al guardar posición' };
  }
}

/**
 * Get the last watched video position for a lesson.
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @returns {Promise<number>} seconds, 0 if not found
 */
export async function getVideoPosition(userId, moduleId, lessonId) {
  if (!userId || !moduleId || !lessonId) return 0;

  try {
    const docId = `${userId}_${moduleId}_${lessonId}`;
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists() ? (snap.data().videoPosition || 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Add a video bookmark for a lesson.
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @param {number} seconds
 * @param {string} note
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addVideoBookmark(userId, moduleId, lessonId, seconds, note) {
  if (!userId || !moduleId || !lessonId) return { success: false, error: 'Parámetros requeridos' };

  try {
    const docId = `${userId}_${moduleId}_${lessonId}`;
    const ref = doc(db, COLLECTION, docId);
    const snap = await getDoc(ref);
    const bookmark = { seconds, note: note || '', createdAt: new Date().toISOString() };

    if (snap.exists()) {
      await updateDoc(ref, { bookmarks: arrayUnion(bookmark) });
    } else {
      await setDoc(ref, {
        userId,
        moduleId,
        lessonId,
        completed: false,
        bookmarks: [bookmark],
      });
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Error al guardar marcador' };
  }
}

/**
 * Remove a video bookmark.
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @param {Object} bookmark - exact bookmark object to remove
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeVideoBookmark(userId, moduleId, lessonId, bookmark) {
  if (!userId || !moduleId || !lessonId) return { success: false, error: 'Parámetros requeridos' };

  try {
    const docId = `${userId}_${moduleId}_${lessonId}`;
    await updateDoc(doc(db, COLLECTION, docId), { bookmarks: arrayRemove(bookmark) });
    return { success: true };
  } catch {
    return { success: false, error: 'Error al eliminar marcador' };
  }
}

/**
 * Get all bookmarks for a lesson.
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @returns {Promise<Array<{seconds: number, note: string, createdAt: string}>>}
 */
export async function getVideoBookmarks(userId, moduleId, lessonId) {
  if (!userId || !moduleId || !lessonId) return [];

  try {
    const docId = `${userId}_${moduleId}_${lessonId}`;
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists() ? (snap.data().bookmarks || []) : [];
  } catch {
    return [];
  }
}
