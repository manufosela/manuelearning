import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const NOTIFICATIONS = 'notifications';

/**
 * @typedef {Object} Notification
 * @property {string} [id]
 * @property {string} type
 * @property {string} message
 * @property {string} [questionId]
 * @property {string} [lessonId]
 * @property {boolean} read
 * @property {*} [createdAt]
 */

/**
 * Create a new notification.
 * @param {Omit<Notification, 'id'|'read'>} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createNotification(data) {
  if (!data.type) return { success: false, error: 'type es obligatorio' };
  if (!data.message || data.message.trim().length === 0) {
    return { success: false, error: 'message es obligatorio' };
  }

  try {
    const ref = await addDoc(collection(db, NOTIFICATIONS), {
      type: data.type,
      message: data.message.trim(),
      questionId: data.questionId || '',
      lessonId: data.lessonId || '',
      read: false,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear la notificación' };
  }
}

/**
 * Fetch unread notifications.
 * @returns {Promise<{success: boolean, notifications?: Notification[], error?: string}>}
 */
export async function fetchUnreadNotifications() {
  try {
    const ref = collection(db, NOTIFICATIONS);
    const q = query(ref, where('read', '==', false), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, notifications };
  } catch (err) {
    return { success: false, error: 'Error al cargar notificaciones' };
  }
}

/**
 * Count unread notifications.
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function countUnreadNotifications() {
  try {
    const ref = collection(db, NOTIFICATIONS);
    const q = query(ref, where('read', '==', false));
    const snapshot = await getDocs(q);
    return { success: true, count: snapshot.docs.length };
  } catch (err) {
    return { success: false, error: 'Error al contar notificaciones' };
  }
}

/**
 * Mark a single notification as read.
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markAsRead(id) {
  if (!id) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, NOTIFICATIONS, id), { read: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al marcar como leída' };
  }
}

/**
 * Mark all unread notifications as read.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markAllAsRead() {
  try {
    const ref = collection(db, NOTIFICATIONS);
    const q = query(ref, where('read', '==', false));
    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map((d) => updateDoc(doc(db, NOTIFICATIONS, d.id), { read: true }));
    await Promise.all(promises);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al marcar todas como leídas' };
  }
}
