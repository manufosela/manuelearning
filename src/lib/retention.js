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
 * Compute engagement score (0-100) based on multiple signals.
 *
 * Factors and weights:
 *   - Recency (40%): days since last activity, decays exponentially
 *   - Progress (30%): % of course completed
 *   - Velocity (20%): lessons completed per active week
 *   - Consistency (10%): ratio of active weeks vs total enrollment weeks
 *
 * @param {Object} params
 * @param {string|null} params.lastActivity - ISO date
 * @param {number} params.progress - 0-100
 * @param {number} params.lessonsCompleted - Total lessons completed
 * @param {string|null} params.enrolledAt - ISO date of enrollment
 * @param {string[]} [params.activityDates] - Array of ISO date strings of activity
 * @returns {{ score: number, churnRisk: 'low'|'medium'|'high'|'critical', factors: Object }}
 */
export function computeEngagement({
  lastActivity,
  progress,
  lessonsCompleted,
  enrolledAt,
  activityDates = [],
}) {
  const now = new Date();

  // ── Recency (40%) ──
  let recencyScore = 0;
  if (lastActivity) {
    const daysSince = (now - new Date(lastActivity)) / (1000 * 60 * 60 * 24);
    // Exponential decay: 100 at 0 days, ~50 at 5 days, ~10 at 14 days
    recencyScore = Math.max(0, 100 * Math.exp(-0.15 * daysSince));
  }

  // ── Progress (30%) ──
  const progressScore = Math.min(100, Math.max(0, progress || 0));

  // ── Velocity (20%) ──
  let velocityScore = 0;
  if (enrolledAt) {
    const weeksEnrolled = Math.max(1, (now - new Date(enrolledAt)) / (1000 * 60 * 60 * 24 * 7));
    const lessonsPerWeek = (lessonsCompleted || 0) / weeksEnrolled;
    // 2+ lessons/week = 100, 1 = 50, linear
    velocityScore = Math.min(100, lessonsPerWeek * 50);
  }

  // ── Consistency (10%) ──
  let consistencyScore = 0;
  if (enrolledAt && activityDates.length > 0) {
    const weeksEnrolled = Math.max(1, (now - new Date(enrolledAt)) / (1000 * 60 * 60 * 24 * 7));
    const activeWeeks = new Set(
      activityDates.map((d) => {
        const date = new Date(d);
        const yearWeek = `${date.getFullYear()}-W${Math.ceil(((date - new Date(date.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24) + 1) / 7)}`;
        return yearWeek;
      })
    ).size;
    consistencyScore = Math.min(100, (activeWeeks / Math.ceil(weeksEnrolled)) * 100);
  }

  const score = Math.round(
    recencyScore * 0.4 +
    progressScore * 0.3 +
    velocityScore * 0.2 +
    consistencyScore * 0.1
  );

  // ── Churn risk ──
  let churnRisk;
  if (score >= 60) churnRisk = 'low';
  else if (score >= 40) churnRisk = 'medium';
  else if (score >= 20) churnRisk = 'high';
  else churnRisk = 'critical';

  return {
    score,
    churnRisk,
    factors: {
      recency: Math.round(recencyScore),
      progress: Math.round(progressScore),
      velocity: Math.round(velocityScore),
      consistency: Math.round(consistencyScore),
    },
  };
}

/**
 * @typedef {Object} RetentionStats
 * @property {number} total
 * @property {number} green
 * @property {number} yellow
 * @property {number} red
 * @property {Object} engagement - Engagement distribution
 * @property {number} engagement.avgScore
 * @property {number} engagement.low
 * @property {number} engagement.medium
 * @property {number} engagement.high
 * @property {number} engagement.critical
 * @property {Array} students
 */

/**
 * Compute retention stats from a list of students with activity data.
 * @param {Array<{uid: string, displayName: string, lastActivity: string|null, progress: number, lessonsCompleted?: number, enrolledAt?: string|null, activityDates?: string[]}>} students
 * @returns {RetentionStats}
 */
export function computeRetentionStats(students) {
  const classified = students.map((s) => {
    const classification = classifyStudent(s.lastActivity);
    const engagement = computeEngagement({
      lastActivity: s.lastActivity,
      progress: s.progress,
      lessonsCompleted: s.lessonsCompleted || 0,
      enrolledAt: s.enrolledAt || null,
      activityDates: s.activityDates || [],
    });
    return { ...s, classification, engagement };
  });

  classified.sort((a, b) => a.engagement.score - b.engagement.score);

  const scores = classified.map((s) => s.engagement.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    total: classified.length,
    green: classified.filter((s) => s.classification.status === 'green').length,
    yellow: classified.filter((s) => s.classification.status === 'yellow').length,
    red: classified.filter((s) => s.classification.status === 'red').length,
    engagement: {
      avgScore,
      low: classified.filter((s) => s.engagement.churnRisk === 'low').length,
      medium: classified.filter((s) => s.engagement.churnRisk === 'medium').length,
      high: classified.filter((s) => s.engagement.churnRisk === 'high').length,
      critical: classified.filter((s) => s.engagement.churnRisk === 'critical').length,
    },
    students: classified,
  };
}
