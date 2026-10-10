import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const COLLECTION = 'courses';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * A course groups the modules whose `course` field equals its slug.
 * @typedef {Object} Course
 * @property {string} slug - Document id and value of modules.course
 * @property {string} title
 * @property {string} [description]
 * @property {string} [icon] - Material Symbols icon name
 * @property {string} [color] - Hex color (#rrggbb)
 * @property {number} order
 * @property {boolean} published
 * @property {*} [createdAt]
 * @property {*} [updatedAt]
 */

/**
 * Validate course data before saving.
 * @param {Partial<Course>} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCourse(data) {
  if (!data || typeof data.slug !== 'string' || !SLUG_PATTERN.test(data.slug)) {
    return { valid: false, error: 'El slug es obligatorio: minúsculas, dígitos y guiones' };
  }
  if (!data.title || data.title.trim().length === 0) {
    return { valid: false, error: 'El título es obligatorio' };
  }
  if (typeof data.order !== 'number' || !Number.isFinite(data.order) || data.order < 0) {
    return { valid: false, error: 'El orden debe ser un número positivo' };
  }
  if (data.color !== undefined && !COLOR_PATTERN.test(data.color)) {
    return { valid: false, error: 'El color debe ser hexadecimal (#rrggbb)' };
  }
  return { valid: true };
}

const toCourse = (snap) => ({ slug: snap.id, ...snap.data() });

/**
 * Log a Firestore failure and build the user-facing error result.
 * @param {string} message - user-facing message
 * @param {unknown} err - original error
 * @returns {{ success: false, error: string }}
 */
function failure(message, err) {
  console.error(`[courses] ${message}`, err);
  return { success: false, error: message };
}

/**
 * Fetch published courses ordered for the public catalogue.
 * @returns {Promise<{success: boolean, courses?: Course[], error?: string}>}
 */
export async function fetchPublishedCourses() {
  try {
    const q = query(collection(db, COLLECTION), where('published', '==', true), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return { success: true, courses: snapshot.docs.map(toCourse) };
  } catch (err) {
    return failure('Error al cargar los cursos', err);
  }
}

/**
 * Fetch every course, published or not (admin).
 * @returns {Promise<{success: boolean, courses?: Course[], error?: string}>}
 */
export async function fetchAllCourses() {
  try {
    const q = query(collection(db, COLLECTION), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return { success: true, courses: snapshot.docs.map(toCourse) };
  } catch (err) {
    return failure('Error al cargar los cursos', err);
  }
}

/**
 * Fetch a single course by slug.
 * @param {string} slug
 * @returns {Promise<{success: boolean, course?: Course, error?: string}>}
 */
export async function fetchCourse(slug) {
  if (!slug) return { success: false, error: 'El slug es obligatorio' };

  try {
    const snap = await getDoc(doc(db, COLLECTION, slug));
    if (!snap.exists()) return { success: false, error: 'Curso no encontrado' };
    return { success: true, course: toCourse(snap) };
  } catch (err) {
    return failure('Error al cargar el curso', err);
  }
}

/**
 * Create or update a course (document id = slug).
 * @param {Course} data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveCourse(data) {
  const validation = validateCourse(data);
  if (!validation.valid) return { success: false, error: validation.error };

  try {
    await setDoc(
      doc(db, COLLECTION, data.slug),
      {
        slug: data.slug,
        title: data.title.trim(),
        description: data.description || '',
        icon: data.icon || 'school',
        color: data.color || '#d32f2f',
        order: data.order,
        published: data.published === true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    return failure('Error al guardar el curso', err);
  }
}

/**
 * Delete a course document. Its modules are not touched.
 * @param {string} slug
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteCourse(slug) {
  if (!slug) return { success: false, error: 'El slug es obligatorio' };

  try {
    await deleteDoc(doc(db, COLLECTION, slug));
    return { success: true };
  } catch (err) {
    return failure('Error al eliminar el curso', err);
  }
}
