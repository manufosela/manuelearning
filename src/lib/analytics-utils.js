/**
 * @module analytics-utils
 * Pure utility functions for student analytics calculations.
 */

/**
 * Convert a Firestore timestamp or date-like value to a JS Date.
 * @param {*} val
 * @returns {Date|null}
 */
function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

/**
 * Compute weekly lesson completions for the last N weeks.
 * @param {Array<{completedAt: *}>} completedLessons
 * @param {number} [weeks=4]
 * @returns {Array<{weekLabel: string, count: number}>}
 */
export function computeWeeklyCompletions(completedLessons, weeks = 4) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const results = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - w * 7);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const count = completedLessons.filter((l) => {
      const date = toDate(l.completedAt);
      return date && date >= weekStart && date <= weekEnd;
    }).length;

    const startDay = weekStart.getDate();
    const startMonth = weekStart.toLocaleString('es', { month: 'short' });
    results.push({ weekLabel: `${startDay} ${startMonth}`, count });
  }

  return results;
}

/**
 * Determine if a quiz answer is correct.
 * Handles both lesson quiz format ({selectedIndex, isCorrect}) and
 * multiple choice with correctAnswer index.
 * @param {*} answer
 * @param {Object} question
 * @returns {boolean|null} null if correctness cannot be determined
 */
function isAnswerCorrect(answer, question) {
  if (answer && typeof answer === 'object' && 'isCorrect' in answer) {
    return answer.isCorrect;
  }
  if (question.type === 'multiple' && question.correctAnswer != null) {
    const selected = typeof answer === 'number' ? answer : parseInt(answer, 10);
    return selected === question.correctAnswer;
  }
  return null;
}

/**
 * Compute overall quiz success rate and per-module quiz performance.
 * @param {Array<{quizId: string, moduleId: string, questions: Array, userAnswers: Array}>} quizResults
 * @param {Array<{moduleId: string, moduleTitle: string}>} moduleStats
 * @returns {{ successRate: number, totalAnswered: number, totalCorrect: number, byModule: Array<{moduleId: string, moduleTitle: string, correct: number, total: number, percent: number}> }}
 */
export function computeQuizPerformance(quizResults, moduleStats) {
  let totalCorrect = 0;
  let totalAnswered = 0;
  const moduleMap = new Map();

  for (const result of quizResults) {
    const modId = result.moduleId;
    if (!moduleMap.has(modId)) {
      moduleMap.set(modId, { correct: 0, total: 0 });
    }
    const modData = moduleMap.get(modId);

    const questions = result.questions || [];
    const answers = result.userAnswers || [];

    for (let i = 0; i < questions.length; i++) {
      const correct = isAnswerCorrect(answers[i], questions[i]);
      if (correct !== null) {
        totalAnswered++;
        modData.total++;
        if (correct) {
          totalCorrect++;
          modData.correct++;
        }
      }
    }
  }

  const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const moduleTitleMap = new Map(moduleStats.map((m) => [m.moduleId, m.moduleTitle]));

  const byModule = [...moduleMap.entries()]
    .map(([moduleId, data]) => ({
      moduleId,
      moduleTitle: moduleTitleMap.get(moduleId) || moduleId,
      correct: data.correct,
      total: data.total,
      percent: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }))
    .sort((a, b) => a.moduleTitle.localeCompare(b.moduleTitle));

  return { successRate, totalAnswered, totalCorrect, byModule };
}

/**
 * Estimate completion date based on current learning pace.
 * Uses the average weekly rate from the last 4 weeks.
 * @param {Array<{completedAt: *}>} completedLessons
 * @param {number} totalLessons
 * @returns {{ estimatedDate: string|null, weeksRemaining: number|null, lessonsPerWeek: number }}
 */
export function estimateCompletionDate(completedLessons, totalLessons) {
  const weekly = computeWeeklyCompletions(completedLessons, 4);
  const totalRecent = weekly.reduce((sum, w) => sum + w.count, 0);
  const lessonsPerWeek = totalRecent / 4;

  const remaining = totalLessons - completedLessons.length;

  if (remaining <= 0) {
    return { estimatedDate: null, weeksRemaining: 0, lessonsPerWeek: Math.round(lessonsPerWeek * 10) / 10 };
  }

  if (lessonsPerWeek <= 0) {
    return { estimatedDate: null, weeksRemaining: null, lessonsPerWeek: 0 };
  }

  const weeksRemaining = Math.ceil(remaining / lessonsPerWeek);
  const estimated = new Date();
  estimated.setDate(estimated.getDate() + weeksRemaining * 7);

  const estimatedDate = estimated.toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    estimatedDate,
    weeksRemaining,
    lessonsPerWeek: Math.round(lessonsPerWeek * 10) / 10,
  };
}
