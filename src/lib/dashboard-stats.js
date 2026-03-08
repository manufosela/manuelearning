import { calculateProgress } from './firebase/progress.js';
import { buildLearningPath } from './learning-path.js';

/**
 * @typedef {Object} ModuleStat
 * @property {string} moduleId
 * @property {string} moduleTitle
 * @property {string} course
 * @property {number} completed
 * @property {number} total
 * @property {number} percent
 */

/**
 * @typedef {Object} CourseGroup
 * @property {string} course
 * @property {ModuleStat[]} modules
 * @property {number} totalLessons
 * @property {number} completedCount
 * @property {number} percent
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} globalPercent
 * @property {number} totalLessons
 * @property {number} completedCount
 * @property {ModuleStat[]} moduleStats
 * @property {CourseGroup[]} courseGroups
 * @property {{ moduleId: string, lessonId: string, lessonTitle: string }|null} nextLesson
 * @property {{ moduleId: string, lessonId: string, lessonTitle: string }|null} lastCompleted
 */

/**
 * Compute dashboard statistics from modules, lessons and progress data.
 * @param {Array<{id: string, title: string, order: number}>} modules
 * @param {Record<string, Array<{id: string, title: string, order: number}>>} lessonsByModule
 * @param {Array<{moduleId: string, lessonId: string}>} completedLessons
 * @returns {DashboardStats}
 */
export function computeDashboardStats(modules, lessonsByModule, completedLessons) {
  const path = buildLearningPath(modules, lessonsByModule);
  const completedSet = new Set(completedLessons.map((c) => `${c.moduleId}_${c.lessonId}`));

  const totalLessons = path.length;
  const completedCount = path.filter((p) => completedSet.has(`${p.moduleId}_${p.lessonId}`)).length;
  const globalPercent = calculateProgress(completedCount, totalLessons);

  const moduleStats = modules.map((mod) => {
    const lessons = lessonsByModule[mod.id] || [];
    const modCompleted = lessons.filter((l) => completedSet.has(`${mod.id}_${l.id}`)).length;
    const firstIncomplete = lessons.find((l) => !completedSet.has(`${mod.id}_${l.id}`));
    return {
      moduleId: mod.id,
      moduleTitle: mod.title,
      course: mod.course || '',
      completed: modCompleted,
      total: lessons.length,
      percent: calculateProgress(modCompleted, lessons.length),
      firstIncompleteLesson: firstIncomplete ? { lessonId: firstIncomplete.id, lessonTitle: firstIncomplete.title } : null,
    };
  });

  const courseMap = new Map();
  for (const stat of moduleStats) {
    const key = stat.course || 'Sin curso';
    if (!courseMap.has(key)) {
      courseMap.set(key, []);
    }
    courseMap.get(key).push(stat);
  }

  const courseGroups = [...courseMap.entries()].map(([course, mods]) => {
    const totalLessonsInCourse = mods.reduce((sum, m) => sum + m.total, 0);
    const completedInCourse = mods.reduce((sum, m) => sum + m.completed, 0);
    return {
      course,
      modules: mods,
      totalLessons: totalLessonsInCourse,
      completedCount: completedInCourse,
      percent: calculateProgress(completedInCourse, totalLessonsInCourse),
    };
  });

  let nextLesson = null;
  for (const item of path) {
    if (!completedSet.has(`${item.moduleId}_${item.lessonId}`)) {
      nextLesson = { moduleId: item.moduleId, lessonId: item.lessonId, lessonTitle: item.lessonTitle };
      break;
    }
  }

  let lastCompleted = null;
  for (let i = path.length - 1; i >= 0; i--) {
    const item = path[i];
    if (completedSet.has(`${item.moduleId}_${item.lessonId}`)) {
      lastCompleted = { moduleId: item.moduleId, lessonId: item.lessonId, lessonTitle: item.lessonTitle };
      break;
    }
  }

  return {
    globalPercent,
    totalLessons,
    completedCount,
    moduleStats,
    courseGroups,
    nextLesson,
    lastCompleted,
  };
}
