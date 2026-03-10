import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './config.js';

/**
 * @typedef {Object} AdminDashboardStats
 * @property {number} totalUsers
 * @property {number} activeUsersLast7Days
 * @property {number} totalQuizzes
 * @property {number} quizzesCompleted
 * @property {number} approvalRate - percentage 0-100
 * @property {{ cohortId: string, cohortName: string, avgProgress: number }[]} progressByCohort
 */

/**
 * Count total registered users.
 * @returns {Promise<number>}
 */
export async function countTotalUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.size;
}

/**
 * Count users who completed at least one lesson in the last 7 days.
 * @returns {Promise<number>}
 */
export async function countActiveUsersLast7Days() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const ref = collection(db, 'progress');
  const q = query(ref, where('completed', '==', true));
  const snapshot = await getDocs(q);

  const activeUserIds = new Set();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.completedAt && data.completedAt.toDate) {
      const completedDate = data.completedAt.toDate();
      if (completedDate >= sevenDaysAgo) {
        activeUserIds.add(data.userId);
      }
    }
  }

  return activeUserIds.size;
}

/**
 * Count total quiz responses (completed quizzes).
 * @returns {Promise<number>}
 */
export async function countQuizzesCompleted() {
  const snapshot = await getDocs(collection(db, 'quizResponses'));
  return snapshot.size;
}

/**
 * Calculate average progress per cohort.
 * Returns an array with one entry per cohort, including the average completion
 * percentage of all users in that cohort.
 * @returns {Promise<{ cohortId: string, cohortName: string, avgProgress: number }[]>}
 */
export async function getProgressByCohort() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const cohortsSnap = await getDocs(collection(db, 'cohorts'));
  const progressSnap = await getDocs(
    query(collection(db, 'progress'), where('completed', '==', true)),
  );
  const modulesSnap = await getDocs(collection(db, 'modules'));

  const cohortMap = new Map();
  for (const doc of cohortsSnap.docs) {
    cohortMap.set(doc.id, doc.data().name);
  }

  let totalLessons = 0;
  for (const doc of modulesSnap.docs) {
    const data = doc.data();
    totalLessons += data.lessonCount || 0;
  }

  const progressByUser = new Map();
  for (const doc of progressSnap.docs) {
    const data = doc.data();
    const count = progressByUser.get(data.userId) || 0;
    progressByUser.set(data.userId, count + 1);
  }

  const cohortProgress = new Map();
  for (const doc of usersSnap.docs) {
    const user = doc.data();
    const cohortId = user.cohortId;
    if (!cohortId) continue;

    if (!cohortProgress.has(cohortId)) {
      cohortProgress.set(cohortId, { total: 0, sumPercent: 0 });
    }

    const entry = cohortProgress.get(cohortId);
    entry.total += 1;
    const completed = progressByUser.get(doc.id) || 0;
    const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    entry.sumPercent += percent;
  }

  const result = [];
  for (const [cohortId, stats] of cohortProgress) {
    result.push({
      cohortId,
      cohortName: cohortMap.get(cohortId) || cohortId,
      avgProgress: stats.total > 0 ? Math.round(stats.sumPercent / stats.total) : 0,
    });
  }

  return result;
}

/**
 * Fetch all progress records (admin).
 * @returns {Promise<{success: boolean, records?: Object[], error?: string}>}
 */
export async function fetchAllProgressRecords() {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'progress'), where('completed', '==', true)),
    );
    const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, records };
  } catch (err) {
    return { success: false, error: 'Error al cargar registros de progreso' };
  }
}

/**
 * Fetch all quiz response records (admin).
 * @returns {Promise<{success: boolean, records?: Object[], error?: string}>}
 */
export async function fetchAllQuizResponseRecords() {
  try {
    const snapshot = await getDocs(collection(db, 'quizResponses'));
    const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, records };
  } catch (err) {
    return { success: false, error: 'Error al cargar respuestas de quizzes' };
  }
}

/**
 * Fetch all quiz definitions (admin).
 * @returns {Promise<{success: boolean, quizzes?: Object[], error?: string}>}
 */
export async function fetchAllQuizDefinitions() {
  try {
    const snapshot = await getDocs(collection(db, 'quizzes'));
    const quizzes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, records: quizzes };
  } catch (err) {
    return { success: false, error: 'Error al cargar definiciones de quizzes' };
  }
}

/**
 * Fetch all admin dashboard stats in one call.
 * @returns {Promise<{success: boolean, stats?: AdminDashboardStats, error?: string}>}
 */
export async function fetchAdminDashboardStats() {
  try {
    const [totalUsers, activeUsersLast7Days, quizzesCompleted, progressByCohort] =
      await Promise.all([
        countTotalUsers(),
        countActiveUsersLast7Days(),
        countQuizzesCompleted(),
        getProgressByCohort(),
      ]);

    const totalQuizzes = (await getDocs(collection(db, 'quizzes'))).size;
    const approvalRate = totalQuizzes > 0 ? Math.round((quizzesCompleted / totalQuizzes) * 100) : 0;

    return {
      success: true,
      stats: {
        totalUsers,
        activeUsersLast7Days,
        totalQuizzes,
        quizzesCompleted,
        approvalRate,
        progressByCohort,
      },
    };
  } catch (err) {
    return { success: false, error: 'Error al cargar estadísticas del dashboard' };
  }
}
