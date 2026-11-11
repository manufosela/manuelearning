import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config.js';
import { normalizeEmail, isValidEmail, invitationExpiry } from '../invitations.js';

const COLLECTION = 'invitations';

/**
 * @typedef {Object} Invitation
 * @property {string} id - secret token, also the document id
 * @property {string} email
 * @property {string} cohortId
 * @property {'pending' | 'accepted' | 'revoked'} status
 * @property {Date} expiresAt
 */

/**
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 * @returns {Invitation}
 */
function toInvitation(snap) {
  const { email, cohortId, status, expiresAt } = snap.data();
  return { id: snap.id, email, cohortId, status, expiresAt: expiresAt.toDate() };
}

/**
 * Create a pending invitation for an email, valid for INVITATION_TTL_DAYS.
 * @param {{email: string, cohortId: string, createdBy: string}} params
 * @returns {Promise<{success: boolean, invitation?: Invitation, error?: string}>}
 */
export async function createInvitation({ email, cohortId, createdBy }) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return { success: false, error: 'El email no es válido' };

  const token = crypto.randomUUID();
  const expiresAt = invitationExpiry(new Date());
  try {
    await setDoc(doc(db, COLLECTION, token), {
      email: normalized,
      cohortId,
      status: 'pending',
      createdBy,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    return { success: true, invitation: { id: token, email: normalized, cohortId, status: 'pending', expiresAt } };
  } catch (err) {
    console.error('createInvitation failed', err);
    return { success: false, error: 'Error al crear la invitación' };
  }
}

/** @returns {Promise<{success: boolean, invitations?: Invitation[], error?: string}>} */
export async function fetchPendingInvitations() {
  try {
    const q = query(collection(db, COLLECTION), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return { success: true, invitations: snap.docs.map(toInvitation) };
  } catch (err) {
    console.error('fetchPendingInvitations failed', err);
    return { success: false, error: 'Error al cargar las invitaciones' };
  }
}

/**
 * @param {string} token
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function revokeInvitation(token) {
  if (!token) return { success: false, error: 'Falta la invitación' };
  try {
    await updateDoc(doc(db, COLLECTION, token), { status: 'revoked' });
    return { success: true };
  } catch (err) {
    console.error('revokeInvitation failed', err);
    return { success: false, error: 'Error al revocar la invitación' };
  }
}

/**
 * Read an invitation by its token; invitation is null when it does not exist.
 * @param {string} token
 * @returns {Promise<{success: boolean, invitation?: Invitation | null, error?: string}>}
 */
export async function fetchInvitation(token) {
  if (!token) return { success: true, invitation: null };
  try {
    const snap = await getDoc(doc(db, COLLECTION, token));
    return { success: true, invitation: snap.exists() ? toInvitation(snap) : null };
  } catch (err) {
    console.error('fetchInvitation failed', err);
    return { success: false, error: 'Error al leer la invitación' };
  }
}

/**
 * Create the invitee's active profile and consume the invitation atomically.
 * The rules reject the batch unless the invitation is valid for this account.
 * @param {{uid: string, email: string, displayName: string | null}} user
 * @param {Invitation} invitation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function acceptInvitation(user, invitation) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: user.displayName ?? '',
    role: 'student',
    status: 'active',
    cohortId: invitation.cohortId,
    createdAt: serverTimestamp(),
    invitationId: invitation.id,
  });
  batch.update(doc(db, COLLECTION, invitation.id), {
    status: 'accepted',
    acceptedBy: user.uid,
    acceptedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
    return { success: true };
  } catch (err) {
    console.error('acceptInvitation failed', err);
    return { success: false, error: 'No se ha podido aceptar la invitación' };
  }
}
