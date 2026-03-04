/**
 * Pure utilities for browser Notification API.
 * No Firebase dependency - safe for unit testing.
 */

/**
 * Check if the browser supports the Notification API.
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get the current notification permission status.
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * @returns {Promise<'granted' | 'denied' | 'default' | 'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/**
 * Show a browser notification if permission is granted.
 * @param {string} title
 * @param {{ body?: string, icon?: string, tag?: string }} [options]
 * @returns {globalThis.Notification | null}
 */
export function showBrowserNotification(title, options = {}) {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  return new Notification(title, {
    icon: '/icons/icon-192x192.svg',
    ...options,
  });
}

/**
 * Format a notification for display.
 * @param {{ type: string, message: string, createdAt?: { seconds?: number } | string }} notif
 * @returns {{ icon: string, timeAgo: string }}
 */
export function formatNotification(notif) {
  const icons = {
    new_session: 'videocam',
    new_module: 'menu_book',
    new_lesson: 'school',
    announcement: 'campaign',
  };

  const icon = icons[notif.type] || 'notifications';

  let timeAgo = '';
  if (notif.createdAt) {
    const ts = typeof notif.createdAt === 'object' && notif.createdAt.seconds
      ? notif.createdAt.seconds * 1000
      : new Date(notif.createdAt).getTime();
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) timeAgo = 'Ahora';
    else if (minutes < 60) timeAgo = `Hace ${minutes} min`;
    else if (minutes < 1440) timeAgo = `Hace ${Math.floor(minutes / 60)} h`;
    else timeAgo = `Hace ${Math.floor(minutes / 1440)} d`;
  }

  return { icon, timeAgo };
}
