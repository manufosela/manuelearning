import { describe, it, expect, vi, afterEach } from 'vitest';

let authCallback;
const unsubscribe = vi.fn();
vi.mock('../src/lib/firebase/auth.js', () => ({
  onAuthChange: (cb) => { authCallback = cb; return unsubscribe; },
}));

const { downloadFile, exportCsv } = await import('../src/lib/csv-export.js');
const {
  requestNotificationPermission,
  showBrowserNotification,
  formatNotification,
} = await import('../src/lib/notification-utils.js');
const { waitForAuth } = await import('../src/lib/auth-ready.js');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('csv download', () => {
  it('downloads the CSV with a BOM through a temporary link', async () => {
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revoked = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportCsv(['nombre'], [['Ana, P.']], 'alumnos.csv');

    const blob = created.mock.calls[0][0];
    expect(await blob.text()).toBe('﻿nombre\n"Ana, P."');
    expect(click).toHaveBeenCalled();
    expect(revoked).toHaveBeenCalledWith('blob:x');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('accepts another mime type', () => {
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:y');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadFile('{}', 'a.json', 'application/json');
    expect(created.mock.calls[0][0].type).toBe('application/json');
  });
});

describe('browser notifications', () => {
  const stubNotification = (permission, requested = 'granted') => {
    const Ctor = vi.fn(function Notification(title, options) { this.title = title; this.options = options; });
    Ctor.permission = permission;
    Ctor.requestPermission = vi.fn(() => Promise.resolve(requested));
    vi.stubGlobal('Notification', Ctor);
    return Ctor;
  };

  it('returns the known permission without asking again', async () => {
    stubNotification('granted');
    expect(await requestNotificationPermission()).toBe('granted');
    const denied = stubNotification('denied');
    expect(await requestNotificationPermission()).toBe('denied');
    expect(denied.requestPermission).not.toHaveBeenCalled();
  });

  it('asks the user when the permission is still undecided', async () => {
    const Ctor = stubNotification('default', 'granted');
    expect(await requestNotificationPermission()).toBe('granted');
    expect(Ctor.requestPermission).toHaveBeenCalled();
  });

  it('shows a notification with the app icon only when granted', () => {
    stubNotification('default');
    expect(showBrowserNotification('Hola')).toBeNull();
    stubNotification('granted');
    const shown = showBrowserNotification('Hola', { body: 'Nueva clase' });
    expect(shown.title).toBe('Hola');
    expect(shown.options).toEqual({ icon: '/icons/icon-192x192.svg', body: 'Nueva clase' });
  });

  it('reports unsupported browsers', async () => {
    vi.stubGlobal('Notification', undefined);
    delete globalThis.window.Notification;
    expect(await requestNotificationPermission()).toBe('unsupported');
    expect(showBrowserNotification('Hola')).toBeNull();
  });

  it('formats an ISO date string as well as a Firestore timestamp', () => {
    const iso = new Date(Date.now() - 2 * 3600_000).toISOString();
    expect(formatNotification({ type: 'new_lesson', createdAt: iso })).toEqual({ icon: 'school', timeAgo: 'Hace 2 h' });
  });
});

describe('waitForAuth', () => {
  it('resolves with the signed-in user and stops listening', async () => {
    const pending = waitForAuth();
    authCallback({ uid: 'u1' });
    await expect(pending).resolves.toEqual({ uid: 'u1' });
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('rejects when nobody is signed in', async () => {
    const pending = waitForAuth();
    authCallback(null);
    await expect(pending).rejects.toThrow('No authenticated user');
  });
});
