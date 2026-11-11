import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const api = {
  fetchUserNotifications: vi.fn(), countUnreadUserNotifications: vi.fn(),
  markUserNotificationAsRead: vi.fn(), markAllUserNotificationsAsRead: vi.fn(),
};
vi.mock('../src/lib/firebase/user-notifications.js', () => Object.fromEntries(
  Object.keys(api).map((k) => [k, (...a) => api[k](...a)]),
));
const browser = { permission: 'default', request: vi.fn(), show: vi.fn() };
vi.mock('../src/lib/notification-utils.js', async (importOriginal) => ({
  formatNotification: (await importOriginal()).formatNotification,
  getNotificationPermission: () => browser.permission,
  requestNotificationPermission: (...a) => browser.request(...a),
  showBrowserNotification: (...a) => browser.show(...a),
}));
vi.mock('../src/lib/auth-ready.js', () => ({ waitForAuth: vi.fn(() => Promise.resolve({ uid: 'u1' })) }));

await import('../src/components/notification-center.js');

const NOTIFS = [
  { id: 'n1', type: 'new_lesson', message: 'Nueva clase: Volúmenes', read: false, createdAt: new Date(Date.now() - 120_000).toISOString() },
  { id: 'n2', type: 'announcement', message: 'Sesión el jueves', read: true },
];
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (el, s) => el.shadowRoot.querySelector(s);
const settle = async (el) => { for (let i = 0; i < 4; i++) await flush(); await el.updateComplete; };

async function mount({ expand = true } = {}) {
  const el = document.createElement('notification-center');
  document.body.appendChild(el);
  await settle(el);
  if (expand) { $(el, '.notif-header').click(); await settle(el); }
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  browser.permission = 'default';
  api.fetchUserNotifications.mockResolvedValue({ success: true, notifications: NOTIFS });
  api.countUnreadUserNotifications.mockResolvedValue({ success: true, count: 1 });
  api.markUserNotificationAsRead.mockResolvedValue({ success: true });
  api.markAllUserNotificationsAsRead.mockResolvedValue({ success: true });
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('notification-center', () => {
  it('shows the unread badge and the list when expanded', async () => {
    const el = await mount();
    expect($(el, '.notif-badge').textContent).toBe('1');
    expect(el.shadowRoot.querySelectorAll('.notif-item')).toHaveLength(2);
    expect($(el, '.notif-item--unread .notif-item-time').textContent).toBe('Hace 2 min');
    $(el, '.notif-header').click();
    await el.updateComplete;
    expect($(el, '.notif-list')).toBeNull();
  });

  it('shows the empty state and reloads when there was nothing', async () => {
    api.fetchUserNotifications.mockResolvedValue({ success: true, notifications: [] });
    const el = await mount();
    expect($(el, '.notif-empty').textContent).toContain('No tienes notificaciones');
    expect(api.fetchUserNotifications).toHaveBeenCalledTimes(2);
  });

  it('marks one and then all notifications as read', async () => {
    const el = await mount();
    $(el, '.notif-item-mark').click();
    await settle(el);
    expect(api.markUserNotificationAsRead).toHaveBeenCalledWith('n1');
    expect($(el, '.notif-item--unread')).toBeNull();
    expect($(el, '.notif-badge')).toBeNull();

    api.countUnreadUserNotifications.mockResolvedValue({ success: true, count: 3 });
    el._loadUnreadCount();
    await settle(el);
    $(el, '.btn-text').click();
    await settle(el);
    expect(api.markAllUserNotificationsAsRead).toHaveBeenCalledWith('u1');
    expect($(el, '.notif-badge')).toBeNull();
  });

  it('asks for browser notifications and shows each permission state', async () => {
    browser.request.mockResolvedValue('granted');
    const el = await mount();
    $(el, '.push-btn').click();
    await settle(el);
    expect($(el, '.push-btn--active').textContent).toBe('Activadas');
    document.body.innerHTML = '';
    browser.permission = 'denied';
    expect($(await mount(), '.push-btn').textContent).toContain('Bloqueadas');
  });

  it('polls the unread count and notifies the browser when it grows', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    browser.permission = 'granted';
    const el = await mount({ expand: false });
    api.countUnreadUserNotifications.mockResolvedValue({ success: true, count: 2 });
    vi.advanceTimersByTime(60_000);
    await settle(el);
    expect(browser.show).toHaveBeenCalledWith('ManuElearning', { body: 'Tienes nuevas notificaciones', tag: 'new-notif' });
    expect($(el, '.notif-badge').textContent).toBe('2');
    el.remove();
    vi.advanceTimersByTime(60_000);
    expect(api.countUnreadUserNotifications).toHaveBeenCalledTimes(2);
  });
});
