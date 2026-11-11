/**
 * Account statuses a user profile can have. 'pending' waits for admin
 * approval, 'inactive' has been deactivated by an admin.
 */
export const USER_STATUSES = ['pending', 'active', 'inactive'];

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function isValidUserStatus(status) {
  return USER_STATUSES.includes(/** @type {string} */ (status));
}

/**
 * What the auth guard lets a user see. Profiles created before statuses
 * existed have none and are treated as active.
 * @param {string|undefined} status
 * @returns {'pending' | 'inactive' | 'active'}
 */
export function accessStateFor(status) {
  if (status === 'pending' || status === 'inactive') return status;
  return 'active';
}
