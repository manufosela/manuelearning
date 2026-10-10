import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const HOSTING_URL = 'https://manu-elearning.web.app';

const CERTIFICATES = 'certificates';

/**
 * @typedef {Object} Certificate
 * @property {string} [id]
 * @property {string} userId
 * @property {string} userName
 * @property {string} courseSlug - Course the certificate was earned in (courses/{slug})
 * @property {string} courseName - Course title at issue time
 * @property {string} completedAt
 * @property {*} [createdAt]
 */

/**
 * Build certificate data with current date.
 * @param {string} userName
 * @param {string} courseName
 * @param {number|null} [averageGrade=null]
 * @returns {{userName: string, courseName: string, completedAt: string, averageGrade: number|null}}
 */
export function buildCertificateData(userName, courseName, averageGrade = null) {
  return {
    userName,
    courseName,
    completedAt: new Date().toISOString(),
    averageGrade: averageGrade ?? null,
  };
}

/**
 * Save a certificate record for one course.
 * @param {string} userId
 * @param {{userName: string, courseSlug: string, courseName: string, completedAt?: string, averageGrade?: number|null}} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function saveCertificate(userId, data) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };
  if (!data.userName) return { success: false, error: 'userName es obligatorio' };
  if (!data.courseSlug) return { success: false, error: 'courseSlug es obligatorio' };
  if (!data.courseName) return { success: false, error: 'courseName es obligatorio' };

  try {
    const docData = {
      userId,
      userName: data.userName,
      courseSlug: data.courseSlug,
      courseName: data.courseName,
      completedAt: data.completedAt || new Date().toISOString(),
      createdAt: serverTimestamp(),
    };
    if (data.averageGrade != null) docData.averageGrade = data.averageGrade;
    const ref = await addDoc(collection(db, CERTIFICATES), docData);
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al guardar el certificado' };
  }
}

/**
 * Get a user's certificate for one course.
 * Filters by course in memory: a user holds a handful of certificates, and the
 * rules already scope the query to the user's own documents.
 * @param {string} userId
 * @param {string} courseSlug
 * @returns {Promise<{success: boolean, certificate?: Certificate|null, error?: string}>}
 */
export async function getUserCertificate(userId, courseSlug) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };
  if (!courseSlug) return { success: false, error: 'courseSlug es obligatorio' };

  try {
    const ref = collection(db, CERTIFICATES);
    const q = query(ref, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const match = snapshot.docs.find((d) => d.data().courseSlug === courseSlug);
    if (!match) return { success: true, certificate: null };
    return { success: true, certificate: { id: match.id, ...match.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el certificado' };
  }
}

/**
 * Get a certificate by its document ID.
 * @param {string} id
 * @returns {Promise<{success: boolean, certificate?: Certificate|null, error?: string}>}
 */
export async function getCertificateById(id) {
  if (!id) return { success: false, error: 'id es obligatorio' };

  try {
    const snap = await getDoc(doc(db, CERTIFICATES, id));
    if (!snap.exists()) return { success: true, certificate: null };
    return { success: true, certificate: { id: snap.id, ...snap.data() } };
  } catch (err) {
    return { success: false, error: 'Error al cargar el certificado' };
  }
}

/**
 * Build the public verification URL for a certificate.
 * @param {string} id
 * @returns {string}
 */
export function buildVerificationUrl(id) {
  if (!id) return '';
  return `${HOSTING_URL}/verificar-certificado?id=${encodeURIComponent(id)}`;
}

/**
 * Build a LinkedIn share URL pre-filled with certificate info.
 * @param {{certUrl: string, courseName: string, userName: string}} options
 * @returns {string}
 */
export function buildLinkedInShareUrl({ certUrl, courseName, userName }) {
  if (!certUrl) return '';
  const title = `He completado el curso ${courseName}`;
  const summary = `${userName} ha obtenido el certificado de ${courseName}`;
  const url = new URL('https://www.linkedin.com/shareArticle');
  url.searchParams.set('mini', 'true');
  url.searchParams.set('url', certUrl);
  url.searchParams.set('title', title);
  url.searchParams.set('summary', summary);
  return url.toString();
}
