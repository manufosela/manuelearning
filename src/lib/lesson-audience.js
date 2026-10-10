import { isAdmin } from './firebase/users.js';

/**
 * Decide which lessons a user may list: admins see the instructor material
 * too, everyone else only student lessons (Firestore rules enforce the same).
 * @param {string|null|undefined} uid
 * @returns {Promise<{ audience: 'all'|'student' }>}
 */
export async function lessonQueryFor(uid) {
  if (!uid) return { audience: 'student' };
  return (await isAdmin(uid)) ? { audience: 'all' } : { audience: 'student' };
}
