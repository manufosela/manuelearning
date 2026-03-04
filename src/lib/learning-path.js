/**
 * @typedef {{ moduleId: string, lessonId: string }} LessonRef
 * @typedef {{ moduleId: string, moduleTitle: string, lessonId: string, lessonTitle: string, index: number }} PathItem
 */

/**
 * Get the next lesson in the sequential path.
 * @param {Array<{id: string, order: number}>} modules - Sorted by order
 * @param {Record<string, Array<{id: string, order: number}>>} lessonsByModule
 * @param {string} currentModuleId
 * @param {string} currentLessonId
 * @returns {LessonRef|null}
 */
export function getNextLesson(modules, lessonsByModule, currentModuleId, currentLessonId) {
  const moduleIndex = modules.findIndex((m) => m.id === currentModuleId);
  if (moduleIndex === -1) return null;

  const lessons = lessonsByModule[currentModuleId] || [];
  const lessonIndex = lessons.findIndex((l) => l.id === currentLessonId);
  if (lessonIndex === -1) return null;

  if (lessonIndex < lessons.length - 1) {
    return { moduleId: currentModuleId, lessonId: lessons[lessonIndex + 1].id };
  }

  for (let i = moduleIndex + 1; i < modules.length; i++) {
    const nextLessons = lessonsByModule[modules[i].id] || [];
    if (nextLessons.length > 0) {
      return { moduleId: modules[i].id, lessonId: nextLessons[0].id };
    }
  }

  return null;
}

/**
 * Get the previous lesson in the sequential path.
 * @param {Array<{id: string, order: number}>} modules - Sorted by order
 * @param {Record<string, Array<{id: string, order: number}>>} lessonsByModule
 * @param {string} currentModuleId
 * @param {string} currentLessonId
 * @returns {LessonRef|null}
 */
export function getPrevLesson(modules, lessonsByModule, currentModuleId, currentLessonId) {
  const moduleIndex = modules.findIndex((m) => m.id === currentModuleId);
  if (moduleIndex === -1) return null;

  const lessons = lessonsByModule[currentModuleId] || [];
  const lessonIndex = lessons.findIndex((l) => l.id === currentLessonId);
  if (lessonIndex === -1) return null;

  if (lessonIndex > 0) {
    return { moduleId: currentModuleId, lessonId: lessons[lessonIndex - 1].id };
  }

  for (let i = moduleIndex - 1; i >= 0; i--) {
    const prevLessons = lessonsByModule[modules[i].id] || [];
    if (prevLessons.length > 0) {
      return { moduleId: modules[i].id, lessonId: prevLessons[prevLessons.length - 1].id };
    }
  }

  return null;
}

/**
 * Build a flat sequential learning path from modules and lessons.
 * @param {Array<{id: string, title: string, order: number}>} modules
 * @param {Record<string, Array<{id: string, title: string, order: number}>>} lessonsByModule
 * @returns {PathItem[]}
 */
export function buildLearningPath(modules, lessonsByModule) {
  const path = [];
  let index = 0;

  for (const mod of modules) {
    const lessons = lessonsByModule[mod.id] || [];
    for (const lesson of lessons) {
      path.push({
        moduleId: mod.id,
        moduleTitle: mod.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        index: index++,
      });
    }
  }

  return path;
}
