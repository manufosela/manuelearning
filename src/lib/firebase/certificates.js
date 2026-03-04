import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';
import { SITE } from '../../config/site.config.js';

const CERTIFICATES = 'certificates';

/**
 * @typedef {Object} Certificate
 * @property {string} [id]
 * @property {string} userId
 * @property {string} userName
 * @property {string} courseName
 * @property {string} completedAt
 * @property {*} [createdAt]
 */

/**
 * Build certificate data with current date.
 * @param {string} userName
 * @param {string} courseName
 * @returns {{userName: string, courseName: string, completedAt: string}}
 */
export function buildCertificateData(userName, courseName) {
  return {
    userName,
    courseName,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Save a certificate record.
 * @param {string} userId
 * @param {{userName: string, courseName: string, completedAt?: string}} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function saveCertificate(userId, data) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };
  if (!data.userName) return { success: false, error: 'userName es obligatorio' };

  try {
    const ref = await addDoc(collection(db, CERTIFICATES), {
      userId,
      userName: data.userName,
      courseName: data.courseName || SITE.courseName,
      completedAt: data.completedAt || new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al guardar el certificado' };
  }
}

/**
 * Get a user's certificate.
 * @param {string} userId
 * @returns {Promise<{success: boolean, certificate?: Certificate|null, error?: string}>}
 */
export async function getUserCertificate(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const ref = collection(db, CERTIFICATES);
    const q = query(ref, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.docs.length === 0) return { success: true, certificate: null };
    return { success: true, certificate: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el certificado' };
  }
}
