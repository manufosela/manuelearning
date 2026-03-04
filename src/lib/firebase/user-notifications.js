import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const COLLECTION = 'userNotifications';

/**
 * @typedef {Object} UserNotification
 * @property {string} [id]
 * @property {string} userId
 * @property {string} type - 'new_session' | 'new_module' | 'new_lesson' | 'announcement'
 * @property {string} message
 * @property {boolean} read
 * @property {*} [createdAt]
 */

/**
 * Create a notification for a specific user.
 * @param {string} userId
 * @param {{ type: string, message: string }} data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function createUserNotification(userId, data) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };
  if (!data.type) return { success: false, error: 'type es obligatorio' };
  if (!data.message || data.message.trim().length === 0) {
    return { success: false, error: 'message es obligatorio' };
  }

  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      userId,
      type: data.type,
      message: data.message.trim(),
      read: false,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: 'Error al crear la notificación' };
  }
}

/**
 * Create notifications for multiple users at once.
 * @param {string[]} userIds
 * @param {{ type: string, message: string }} data
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function notifyUsers(userIds, data) {
  if (!userIds || userIds.length === 0) {
    return { success: false, error: 'No hay usuarios para notificar' };
  }

  try {
    const promises = userIds.map((uid) => createUserNotification(uid, data));
    const results = await Promise.all(promises);
    const count = results.filter((r) => r.success).length;
    return { success: true, count };
  } catch (err) {
    return { success: false, error: 'Error al notificar usuarios' };
  }
}

/**
 * Fetch notifications for the current user (most recent first, limited).
 * @param {string} userId
 * @param {number} [maxResults=20]
 * @returns {Promise<{success: boolean, notifications?: UserNotification[], error?: string}>}
 */
export async function fetchUserNotifications(userId, maxResults = 20) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const ref = collection(db, COLLECTION);
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, notifications };
  } catch (err) {
    return { success: false, error: 'Error al cargar notificaciones' };
  }
}

/**
 * Count unread notifications for a user.
 * @param {string} userId
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function countUnreadUserNotifications(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, where('userId', '==', userId), where('read', '==', false));
    const snapshot = await getDocs(q);
    return { success: true, count: snapshot.docs.length };
  } catch (err) {
    return { success: false, error: 'Error al contar notificaciones' };
  }
}

/**
 * Mark a user notification as read.
 * @param {string} notifId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markUserNotificationAsRead(notifId) {
  if (!notifId) return { success: false, error: 'ID es obligatorio' };

  try {
    await updateDoc(doc(db, COLLECTION, notifId), { read: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al marcar como leída' };
  }
}

/**
 * Mark all unread notifications for a user as read.
 * @param {string} userId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markAllUserNotificationsAsRead(userId) {
  if (!userId) return { success: false, error: 'userId es obligatorio' };

  try {
    const ref = collection(db, COLLECTION);
    const q = query(ref, where('userId', '==', userId), where('read', '==', false));
    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map((d) =>
      updateDoc(doc(db, COLLECTION, d.id), { read: true })
    );
    await Promise.all(promises);
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error al marcar todas como leídas' };
  }
}
