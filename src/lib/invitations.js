/**
 * Pure helpers for admin invitations: the link, the copy-paste email and
 * the reasons an invitation cannot be accepted.
 */

export const INVITATION_TTL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' });

/**
 * @typedef {'not-found' | 'revoked' | 'accepted' | 'expired' | 'wrong-email'} InvitationProblem
 */

/** @type {Record<InvitationProblem, string>} */
export const INVITATION_PROBLEM_MESSAGES = {
  'not-found': 'Esta invitación no existe. Revisa que el enlace esté completo.',
  revoked: 'Esta invitación ha sido revocada. Pide una nueva al administrador.',
  accepted: 'Esta invitación ya se ha usado. Entra con tu cuenta desde Acceder.',
  expired: 'Esta invitación ha caducado. Pide una nueva al administrador.',
  'wrong-email': 'Esta invitación es para otro correo. Entra con la cuenta de Google del correo invitado.',
};

/** @param {string} email @returns {string} */
export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/** @param {string} email @returns {boolean} */
export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

/** @param {Date} createdAt @returns {Date} */
export function invitationExpiry(createdAt) {
  return new Date(createdAt.getTime() + INVITATION_TTL_DAYS * DAY_MS);
}

/**
 * @param {string} origin - e.g. window.location.origin
 * @param {string} token - invitation document id
 * @returns {string}
 */
export function buildInvitationLink(origin, token) {
  if (!origin || !token) throw new Error('El enlace de invitación necesita origen y token');
  return `${origin}/invitacion?token=${encodeURIComponent(token)}`;
}

/**
 * Email the admin copies and sends by hand.
 * @param {{link: string, siteName: string, cohortName: string, expiresAt: Date}} params
 * @returns {{subject: string, body: string}}
 */
export function buildInvitationMessage({ link, siteName, cohortName, expiresAt }) {
  const cohortLine = cohortName ? `Entrarás directamente en la convocatoria ${cohortName}.\n\n` : '';
  const body = `Hola:\n\n`
    + `Te invito a ${siteName}, mi plataforma de formación.\n\n`
    + cohortLine
    + `Para aceptar la invitación, abre este enlace y entra con la cuenta de Google de este correo:\n\n`
    + `${link}\n\n`
    + `El enlace es personal y caduca el ${dateFormatter.format(expiresAt)}.\n\n`
    + `¡Nos vemos dentro!`;
  return { subject: `Invitación a ${siteName}`, body };
}

/**
 * Link and copy-paste email for a stored invitation.
 * @param {{id: string, expiresAt: Date}} invitation
 * @param {{origin: string, siteName: string, cohortName: string}} context
 * @returns {{link: string, subject: string, body: string}}
 */
export function invitationEmailFor(invitation, { origin, siteName, cohortName }) {
  const link = buildInvitationLink(origin, invitation.id);
  return { link, ...buildInvitationMessage({ link, siteName, cohortName, expiresAt: invitation.expiresAt }) };
}

/**
 * Why an invitation cannot be accepted by the given account, or null if it can.
 * @param {{email: string, status: string, expiresAt: Date} | null} invitation
 * @param {string} email - email of the signed-in account
 * @param {Date} now
 * @returns {InvitationProblem | null}
 */
export function invitationProblem(invitation, email, now) {
  if (!invitation) return 'not-found';
  if (invitation.status === 'revoked') return 'revoked';
  if (invitation.status === 'accepted') return 'accepted';
  if (invitation.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (invitation.email !== normalizeEmail(email)) return 'wrong-email';
  return null;
}
