import { describe, it, expect } from 'vitest';
import { USER_STATUSES, isValidUserStatus, accessStateFor } from '../src/lib/user-status.js';

describe('USER_STATUSES', () => {
  it('lists the statuses the admin can set', () => {
    expect(USER_STATUSES).toEqual(['pending', 'active', 'inactive']);
  });
});

describe('isValidUserStatus', () => {
  it('accepts every known status', () => {
    for (const status of USER_STATUSES) expect(isValidUserStatus(status)).toBe(true);
  });

  it('rejects unknown statuses', () => {
    expect(isValidUserStatus('suspended')).toBe(false);
    expect(isValidUserStatus('')).toBe(false);
    expect(isValidUserStatus(undefined)).toBe(false);
  });
});

describe('accessStateFor', () => {
  it('blocks pending users until an admin approves them', () => {
    expect(accessStateFor('pending')).toBe('pending');
  });

  it('blocks deactivated users', () => {
    expect(accessStateFor('inactive')).toBe('inactive');
  });

  it('lets active users in', () => {
    expect(accessStateFor('active')).toBe('active');
  });

  it('lets legacy profiles without status in', () => {
    expect(accessStateFor(undefined)).toBe('active');
  });
});
