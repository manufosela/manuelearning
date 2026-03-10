import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';
import { createUserNotification } from './user-notifications.js';

const COLLECTION = 'badges';

/**
 * Badge types awarded for completing modules and courses.
 * @typedef {'module_complete' | 'course_complete'} BadgeType
 */

/**
 * @typedef {Object} Badge
 * @property {string} [id]
 * @property {string} userId
 * @property {BadgeType} type
 * @property {string} refId - moduleId or courseName
 * @property {string} refTitle - module or course title
 * @property {*} [awardedAt]
 */

/**
 * Check if a badge has already been awarded to a user.
 * @param {string} userId
 * @param {BadgeType} type
 * @param {string} refId - moduleId or courseName
 * @returns {Promise<boolean>}
 */
export async function isBadgeAwarded(userId, type, refId) {
  if (!userId || !type || !refId) return false;

  try {
    const docId = `${userId}_${type}_${refId}`;
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Award a badge to a user. No-op if already awarded.
 * @param {string} userId
 * @param {BadgeType} type
 * @param {string} refId - moduleId or courseName
 * @param {string} refTitle - display title
 * @returns {Promise<{success: boolean, alreadyAwarded?: boolean, error?: string}>}
 */
export async function awardBadge(userId, type, refId, refTitle) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };
  if (!type) return { success: false, error: 'type es obligatorio' };
  if (!refId) return { success: false, error: 'refId es obligatorio' };

  try {
    const docId = `${userId}_${type}_${refId}`;
    const snap = await getDoc(doc(db, COLLECTION, docId));
    if (snap.exists()) return { success: true, alreadyAwarded: true };

    await setDoc(doc(db, COLLECTION, docId), {
      userId,
      type,
      refId,
      refTitle: refTitle || refId,
      awardedAt: serverTimestamp(),
    });

    const label = type === 'module_complete' ? 'módulo' : 'curso';
    createUserNotification(userId, {
      type: 'badge_earned',
      message: `🏆 ¡Felicidades! Has completado el ${label}: ${refTitle || refId}`,
    }).catch(() => {});

    return { success: true };
  } catch {
    return { success: false, error: 'Error al otorgar el badge' };
  }
}

/**
 * Get all badges for a user, ordered by award date descending.
 * @param {string} userId
 * @returns {Promise<{success: boolean, badges?: Badge[], error?: string}>}
 */
export async function getUserBadges(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const ref = collection(db, COLLECTION);
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('awardedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const badges = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, badges };
  } catch {
    return { success: false, error: 'Error al cargar los badges' };
  }
}
