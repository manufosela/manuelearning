import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  formatNotification,
} from '../src/lib/notification-utils.js';

describe('isNotificationSupported', () => {
  it('should return true when Notification API is available', () => {
    globalThis.Notification = { permission: 'default' };
    expect(isNotificationSupported()).toBe(true);
  });

  it('should return false when Notification API is missing', () => {
    delete globalThis.Notification;
    expect(isNotificationSupported()).toBe(false);
  });
});

describe('getNotificationPermission', () => {
  it('should return "granted" when permission is granted', () => {
    globalThis.Notification = { permission: 'granted' };
    expect(getNotificationPermission()).toBe('granted');
  });

  it('should return "denied" when permission is denied', () => {
    globalThis.Notification = { permission: 'denied' };
    expect(getNotificationPermission()).toBe('denied');
  });

  it('should return "default" when permission is default', () => {
    globalThis.Notification = { permission: 'default' };
    expect(getNotificationPermission()).toBe('default');
  });

  it('should return "unsupported" when API is not available', () => {
    delete globalThis.Notification;
    expect(getNotificationPermission()).toBe('unsupported');
  });
});

describe('formatNotification', () => {
  it('should return correct icon for new_session type', () => {
    const result = formatNotification({ type: 'new_session', message: 'test' });
    expect(result.icon).toBe('videocam');
  });

  it('should return correct icon for new_module type', () => {
    const result = formatNotification({ type: 'new_module', message: 'test' });
    expect(result.icon).toBe('menu_book');
  });

  it('should return correct icon for new_lesson type', () => {
    const result = formatNotification({ type: 'new_lesson', message: 'test' });
    expect(result.icon).toBe('school');
  });

  it('should return correct icon for announcement type', () => {
    const result = formatNotification({ type: 'announcement', message: 'test' });
    expect(result.icon).toBe('campaign');
  });

  it('should return default icon for unknown type', () => {
    const result = formatNotification({ type: 'unknown', message: 'test' });
    expect(result.icon).toBe('notifications');
  });

  it('should return empty timeAgo when no createdAt', () => {
    const result = formatNotification({ type: 'new_session', message: 'test' });
    expect(result.timeAgo).toBe('');
  });

  it('should return "Ahora" for recent timestamp', () => {
    const now = { seconds: Math.floor(Date.now() / 1000) };
    const result = formatNotification({ type: 'new_session', message: 'test', createdAt: now });
    expect(result.timeAgo).toBe('Ahora');
  });

  it('should return minutes for timestamp a few minutes ago', () => {
    const fiveMinAgo = { seconds: Math.floor(Date.now() / 1000) - 300 };
    const result = formatNotification({ type: 'new_session', message: 'test', createdAt: fiveMinAgo });
    expect(result.timeAgo).toBe('Hace 5 min');
  });

  it('should return hours for timestamp a few hours ago', () => {
    const twoHoursAgo = { seconds: Math.floor(Date.now() / 1000) - 7200 };
    const result = formatNotification({ type: 'new_session', message: 'test', createdAt: twoHoursAgo });
    expect(result.timeAgo).toBe('Hace 2 h');
  });

  it('should return days for timestamp a day ago', () => {
    const oneDayAgo = { seconds: Math.floor(Date.now() / 1000) - 86400 };
    const result = formatNotification({ type: 'new_session', message: 'test', createdAt: oneDayAgo });
    expect(result.timeAgo).toBe('Hace 1 d');
  });
});
