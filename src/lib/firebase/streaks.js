import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config.js';

const COLLECTION = 'activityStreaks';

const STREAK_BADGES = [
  { days: 7, label: '7 días', icon: 'local_fire_department' },
  { days: 30, label: '30 días', icon: 'whatshot' },
  { days: 60, label: '60 días', icon: 'military_tech' },
];

/**
 * Calculate the new streak state given previous data and today's date.
 * Pure function, no side effects.
 * @param {Object|null} prev - Previous streak data { current, longest, lastActivityDate }
 * @param {string} todayStr - Today's date as YYYY-MM-DD
 * @returns {Object} Updated streak data
 */
export function calculateStreak(prev, todayStr) {
  if (!prev) {
    return { current: 1, longest: 1, lastActivityDate: todayStr };
  }

  const lastDate = prev.lastActivityDate;
  if (lastDate === todayStr) {
    return { ...prev };
  }

  const last = new Date(lastDate + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diffMs = today.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    const newCurrent = prev.current + 1;
    return {
      current: newCurrent,
      longest: Math.max(newCurrent, prev.longest),
      lastActivityDate: todayStr,
    };
  }

  return {
    current: 1,
    longest: prev.longest,
    lastActivityDate: todayStr,
  };
}

/**
 * Get earned streak badges based on longest streak.
 * @param {number} longestStreak
 * @returns {Array<{days: number, label: string, icon: string}>}
 */
export function getStreakBadges(longestStreak) {
  return STREAK_BADGES.filter((b) => longestStreak >= b.days);
}

/**
 * Fetch streak data for a user from Firestore.
 * @param {string} userId
 * @returns {Promise<{success: boolean, streak?: Object, error?: string}>}
 */
export async function getStreak(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const snap = await getDoc(doc(db, COLLECTION, userId));
    if (!snap.exists()) {
      return { success: true, streak: null };
    }
    return { success: true, streak: snap.data() };
  } catch {
    return { success: false, error: 'Error al cargar la racha' };
  }
}

/**
 * Update the activity streak for a user. Called when a lesson is completed.
 * @param {string} userId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateStreak(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const snap = await getDoc(doc(db, COLLECTION, userId));
    const prev = snap.exists() ? snap.data() : null;
    const updated = calculateStreak(prev, todayStr);

    await setDoc(doc(db, COLLECTION, userId), updated);
    return { success: true };
  } catch {
    return { success: false, error: 'Error al actualizar la racha' };
  }
}
