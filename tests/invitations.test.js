import { describe, it, expect } from 'vitest';
import {
  INVITATION_TTL_DAYS,
  normalizeEmail,
  isValidEmail,
  invitationExpiry,
  buildInvitationLink,
  buildInvitationMessage,
  invitationEmailFor,
  invitationProblem,
  INVITATION_PROBLEM_MESSAGES,
} from '../src/lib/invitations.js';

const NOW = new Date('2026-11-11T10:00:00Z');
const pending = (overrides = {}) => ({
  email: 'ana@example.com',
  status: 'pending',
  expiresAt: new Date('2026-12-11T10:00:00Z'),
  ...overrides,
});

describe('normalizeEmail / isValidEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com');
  });

  it('accepts a plain address and rejects malformed ones', () => {
    expect(isValidEmail('ana@example.com')).toBe(true);
    expect(isValidEmail('ana@')).toBe(false);
    expect(isValidEmail('ana example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('invitationExpiry', () => {
  it(`expires ${INVITATION_TTL_DAYS} days after creation`, () => {
    expect(INVITATION_TTL_DAYS).toBe(30);
    expect(invitationExpiry(NOW).toISOString()).toBe('2026-12-11T10:00:00.000Z');
  });
});

describe('buildInvitationLink', () => {
  it('points to the invitation page with the token', () => {
    expect(buildInvitationLink('https://manuelearning.com', 'abc-123'))
      .toBe('https://manuelearning.com/invitacion?token=abc-123');
  });

  it('fails loudly without origin or token', () => {
    expect(() => buildInvitationLink('', 'abc')).toThrow();
    expect(() => buildInvitationLink('https://x.com', '')).toThrow();
  });
});

describe('buildInvitationMessage', () => {
  const message = buildInvitationMessage({
    link: 'https://manuelearning.com/invitacion?token=abc',
    siteName: 'ManuElearning',
    cohortName: 'Karajan v4 · 2026-11',
    expiresAt: new Date('2026-12-11T10:00:00Z'),
  });

  it('has a subject naming the site', () => {
    expect(message.subject).toContain('ManuElearning');
  });

  it('includes link, cohort, expiry date and the Google account hint', () => {
    expect(message.body).toContain('https://manuelearning.com/invitacion?token=abc');
    expect(message.body).toContain('Karajan v4 · 2026-11');
    expect(message.body).toContain('11 de diciembre de 2026');
    expect(message.body).toContain('cuenta de Google');
  });

  it('omits the cohort line when there is no cohort', () => {
    const noCohort = buildInvitationMessage({
      link: 'https://x.com/invitacion?token=a',
      siteName: 'ManuElearning',
      cohortName: '',
      expiresAt: new Date('2026-12-11T10:00:00Z'),
    });
    expect(noCohort.body).not.toContain('convocatoria');
  });
});

describe('invitationEmailFor', () => {
  it('builds link and message for a stored invitation', () => {
    const email = invitationEmailFor(
      { id: 'tok', expiresAt: new Date('2026-12-11T10:00:00Z') },
      { origin: 'https://manuelearning.com', siteName: 'ManuElearning', cohortName: 'C1' },
    );
    expect(email.link).toBe('https://manuelearning.com/invitacion?token=tok');
    expect(email.subject).toBe('Invitación a ManuElearning');
    expect(email.body).toContain(email.link);
    expect(email.body).toContain('C1');
  });
});

describe('invitationProblem', () => {
  it('returns null for a valid pending invitation of the same email', () => {
    expect(invitationProblem(pending(), 'Ana@example.com', NOW)).toBeNull();
  });

  it('detects every reason an invitation is not usable', () => {
    expect(invitationProblem(null, 'ana@example.com', NOW)).toBe('not-found');
    expect(invitationProblem(pending({ status: 'revoked' }), 'ana@example.com', NOW)).toBe('revoked');
    expect(invitationProblem(pending({ status: 'accepted' }), 'ana@example.com', NOW)).toBe('accepted');
    expect(invitationProblem(pending({ expiresAt: new Date('2026-11-10T10:00:00Z') }), 'ana@example.com', NOW))
      .toBe('expired');
    expect(invitationProblem(pending(), 'otra@example.com', NOW)).toBe('wrong-email');
  });

  it('has a user-facing message for every problem', () => {
    for (const problem of ['not-found', 'revoked', 'accepted', 'expired', 'wrong-email']) {
      expect(INVITATION_PROBLEM_MESSAGES[problem]).toBeTruthy();
    }
  });
});
