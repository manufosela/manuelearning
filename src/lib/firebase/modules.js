import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config.js';
import { computeSwap } from '../reorder-utils.js';

const COLLECTION = 'modules';

/**
 * @typedef {Object} Module
 * @property {string} [id]
 * @property {string} title
 * @property {string} [description]
 * @property {number} order
 * @property {*} [createdAt]
 */

/**
 * @typedef {Object} Lesson
 * @property {string} [id]
 * @property {string} title
 * @property {string} [description]
 * @property {number} order
 * @property {string} [videoUrl]
 * @property {string} [documentation]
 * @property {*} [createdAt]
 */

/**
 * Validate module data.
 * @param {Partial<Module>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateModule(data) {
  if (!data.title || data.title.trim().length === 0) {
    return { valid: false, error: 'El título es obligatorio' };
  }

  if (data.order === undefined || data.order === null || typeof data.order !== 'number' || data.order < 0) {
    return { valid: false, error: 'El orden debe ser un número positivo' };
  }

  return { valid: true };
}

/**
 * Validate lesson data.
 * @param {Partial<Lesson>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLesson(data) {
  if (!data.title || data.title.trim().length === 0) {
    return { valid: false, error: 'El título es obligatorio' };
  }

  if (data.order === undefined || data.order === null || typeof data.order !== 'number' || data.order < 0) {
    return { valid: false, error: 'El orden debe ser un número positivo' };
  }

  return { valid: true };
}

/**
 * Fetch all modules ordered by order ascending.
 * @returns {Promise<{success: boolean, modules?: Module[], error?: string}>}
 */
export async function fetchAllModules() {
  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    const modules = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, modules };
  } catch (err) {
    return { success: false, error: 'Error al cargar módulos' };
  }
}

/**
 * Fetch modules filtered by course name.
 * @param {string} courseName
 * @returns {Promise<{success: boolean, modules?: Module[], error?: string}>}
 */
export async function fetchModulesByCourse(courseName) {
  if (!courseName) return fetchAllModules();

  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, where('course', '==', courseName), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    const modules = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, modules };
  } catch (err) {
    return { success: false, error: 'Error al cargar módulos del curso' };
  }
}

/**
 * Fetch distinct course names from modules.
 * @returns {Promise<{success: boolean, courses?: string[], error?: string}>}
 */
export async function fetchCourseList() {
  try {
    const ref = collection(db, COLLECTION);
    const snapshot = await getDocs(ref);

    const courseSet = new Set();
    snapshot.docs.forEach((d) => {
      const course = d.data().course;
      if (course) courseSet.add(course);
    });

    return { success: true, courses: [...courseSet].sort() };
  } catch (err) {
    return { success: false, error: 'Error al cargar lista de cursos' };
  }
}

/**
 * Fetch a single module by ID.
 * @param {string} id
 * @returns {Promise<{success: boolean, module?: Module, error?: string}>}
 */
export async function fetchModule(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return { success: false, error: 'Módulo no encontrado' };
    return { success: true, module: { id: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el módulo' };
  }
}

/**
 * Create a new module.
 * @param {Omit<Module, 'id'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createModule(data) {
  const validation = validateModule(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      title: data.title.trim(),
      description: data.description || '',
      order: data.order,
      course: data.course || '',
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear el módulo' };
  }
}

/**
 * Update an existing module.
 * @param {string} id
 * @param {Partial<Module>} updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateModule(id, updates) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, COLLECTION, id), updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar el módulo' };
  }
}

/**
 * Delete a module.
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteModule(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await deleteDoc(doc(db, COLLECTION, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al eliminar el módulo' };
  }
}

/* ── Lessons (subcollection of a module) ────────────────────── */

/**
 * Fetch all lessons for a module.
 * @param {string} moduleId
 * @returns {Promise<{success: boolean, lessons?: Lesson[], error?: string}>}
 */
export async function fetchLessons(moduleId) {
  if (!moduleId) return { success: false, error: 'ID del módulo es obligatorio' };

  try {
    const ref = collection(db, COLLECTION, moduleId, 'lessons');
    const q = query(ref, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    const lessons = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, lessons };
  } catch (err) {
    return { success: false, error: 'Error al cargar las clases' };
  }
}

/**
 * Fetch a single lesson.
 * @param {string} moduleId
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, lesson?: Lesson, error?: string}>}
 */
export async function fetchLesson(moduleId, lessonId) {
  if (!moduleId) return { success: false, error: 'ID del módulo es obligatorio' };
  if (!lessonId) return { success: false, error: 'ID de la clase es obligatorio' };

  try {
    const snap = await getDoc(doc(db, COLLECTION, moduleId, 'lessons', lessonId));
    if (!snap.exists()) return { success: false, error: 'Clase no encontrada' };
    return { success: true, lesson: { id: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar la clase' };
  }
}

/**
 * Create a lesson in a module.
 * @param {string} moduleId
 * @param {Omit<Lesson, 'id'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createLesson(moduleId, data) {
  if (!moduleId) return { success: false, error: 'ID del módulo es obligatorio' };

  const validation = validateLesson(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    const ref = await addDoc(collection(db, COLLECTION, moduleId, 'lessons'), {
      title: data.title.trim(),
      description: data.description || '',
      order: data.order,
      videoUrl: data.videoUrl || '',
      documentation: data.documentation || '',
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear la clase' };
  }
}

/**
 * Update a lesson.
 * @param {string} moduleId
 * @param {string} lessonId
 * @param {Partial<Lesson>} updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateLesson(moduleId, lessonId, updates) {
  if (!moduleId) return { success: false, error: 'ID del módulo es obligatorio' };
  if (!lessonId) return { success: false, error: 'ID de la clase es obligatorio' };

  try {
    await updateDoc(doc(db, COLLECTION, moduleId, 'lessons', lessonId), updates);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar la clase' };
  }
}

/**
 * Delete a lesson.
 * @param {string} moduleId
 * @param {string} lessonId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteLesson(moduleId, lessonId) {
  if (!moduleId) return { success: false, error: 'ID del módulo es obligatorio' };
  if (!lessonId) return { success: false, error: 'ID de la clase es obligatorio' };

  try {
    await deleteDoc(doc(db, COLLECTION, moduleId, 'lessons', lessonId));
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al eliminar la clase' };
  }
}

/* ── Reordering ────────────────────────────────────────────── */

/**
 * Move a module up or down by swapping order with its neighbor.
 * @param {{ id: string, order: number }[]} modules - Current modules sorted by order
 * @param {string} moduleId
 * @param {'up' | 'down'} direction
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function reorderModule(modules, moduleId, direction) {
  const swap = computeSwap(modules, moduleId, direction);
  if (!swap) return { success: false, error: 'No se puede mover en esa dirección' };

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION, swap.item.id), { order: swap.item.order });
    batch.update(doc(db, COLLECTION, swap.neighbor.id), { order: swap.neighbor.order });
    await batch.commit();
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al reordenar el módulo' };
  }
}

/**
 * Move a lesson up or down by swapping order with its neighbor.
 * @param {string} moduleId
 * @param {{ id: string, order: number }[]} lessons - Current lessons sorted by order
 * @param {string} lessonId
 * @param {'up' | 'down'} direction
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function reorderLesson(moduleId, lessons, lessonId, direction) {
  const swap = computeSwap(lessons, lessonId, direction);
  if (!swap) return { success: false, error: 'No se puede mover en esa dirección' };

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION, moduleId, 'lessons', swap.item.id), { order: swap.item.order });
    batch.update(doc(db, COLLECTION, moduleId, 'lessons', swap.neighbor.id), { order: swap.neighbor.order });
    await batch.commit();
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al reordenar la clase' };
  }
}
