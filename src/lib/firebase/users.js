import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './config.js';

/**
 * @typedef {Object} UserProfile
 * @property {string} uid
 * @property {string} email
 * @property {string} displayName
 * @property {string} role - 'student' | 'admin'
 * @property {string} [cohortId]
 * @property {*} createdAt
 */

/**
 * Fetch all users from Firestore.
 * @returns {Promise<{success: boolean, users?: UserProfile[], error?: string}>}
 */
export async function fetchAllUsers() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const users = snapshot.docs.map((docSnap) => ({
      uid: docSnap.id,
      ...docSnap.data(),
    }));

    return { success: true, users };
  } catch (err) {
    return { success: false, error: 'Error al cargar usuarios' };
  }
}

/**
 * Fetch a single user profile by UID.
 * @param {string} uid
 * @returns {Promise<{success: boolean, user?: UserProfile, error?: string}>}
 */
export async function fetchUser(uid) {
  if (!uid) {
    return { success: false, error: 'UID es obligatorio' };
  }

  try {
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    return { success: true, user: { uid: docSnap.id, ...docSnap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el usuario' };
  }
}

/**
 * Update a user's role.
 * @param {string} uid
 * @param {string} role - 'student' | 'admin'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUserRole(uid, role) {
  if (!uid) {
    return { success: false, error: 'UID es obligatorio' };
  }

  const validRoles = ['student', 'admin'];
  if (!validRoles.includes(role)) {
    return { success: false, error: 'Rol no válido. Usa student o admin' };
  }

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar el rol' };
  }
}

/**
 * Toggle lifetime access for a user.
 * @param {string} uid
 * @param {boolean} lifetimeAccess
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleLifetimeAccess(uid, lifetimeAccess) {
  if (!uid) return { success: false, error: 'UID es obligatorio' };

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { lifetimeAccess: !!lifetimeAccess });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al actualizar acceso vitalicio' };
  }
}

/**
 * Check if a user has admin role.
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isAdmin(uid) {
  const result = await fetchUser(uid);
  return result.success && result.user?.role === 'admin';
}
