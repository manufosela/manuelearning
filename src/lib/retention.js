/**
 * @typedef {Object} StudentClassification
 * @property {'green'|'yellow'|'red'} status
 * @property {number} daysSinceActivity
 */

/**
 * Classify a student based on their last activity.
 * - green: <3 days
 * - yellow: 3-7 days
 * - red: >7 days or no activity
 *
 * @param {string|null} lastActivityDate - ISO date string
 * @returns {StudentClassification}
 */
export function classifyStudent(lastActivityDate) {
  if (!lastActivityDate) {
    return { status: 'red', daysSinceActivity: Infinity };
  }

  const now = new Date();
  const last = new Date(lastActivityDate);
  const diffMs = now.getTime() - last.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 3) return { status: 'green', daysSinceActivity: days };
  if (days <= 7) return { status: 'yellow', daysSinceActivity: days };
  return { status: 'red', daysSinceActivity: days };
}

/**
 * @typedef {Object} RetentionStats
 * @property {number} total
 * @property {number} green
 * @property {number} yellow
 * @property {number} red
 * @property {Array<{uid: string, displayName: string, lastActivity: string|null, progress: number, classification: StudentClassification}>} students
 */

/**
 * Compute retention stats from a list of students with activity data.
 * @param {Array<{uid: string, displayName: string, lastActivity: string|null, progress: number}>} students
 * @returns {RetentionStats}
 */
export function computeRetentionStats(students) {
  const classified = students.map((s) => ({
    ...s,
    classification: classifyStudent(s.lastActivity),
  }));

  classified.sort((a, b) => b.classification.daysSinceActivity - a.classification.daysSinceActivity);

  return {
    total: classified.length,
    green: classified.filter((s) => s.classification.status === 'green').length,
    yellow: classified.filter((s) => s.classification.status === 'yellow').length,
    red: classified.filter((s) => s.classification.status === 'red').length,
    students: classified,
  };
}
