import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Static checks over firestore.rules for security decisions that must not
 * regress silently. (Behavioural tests would need the Firestore emulator.)
 */
const rules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf-8');

/**
 * @param {string} matchPath - e.g. '/certificates/{certId}'
 * @returns {string} body of the match block (first level only)
 */
function matchBlock(matchPath) {
  const header = `match ${matchPath} {`;
  const start = rules.indexOf(header);
  if (start === -1) throw new Error(`No match block for ${matchPath}`);
  let depth = 0;
  for (let i = start + header.length - 1; i < rules.length; i++) {
    if (rules[i] === '{') depth++;
    if (rules[i] === '}') depth--;
    if (depth === 0) return rules.slice(start, i + 1);
  }
  throw new Error(`Unbalanced block for ${matchPath}`);
}

describe('certificates rules', () => {
  const block = matchBlock('/certificates/{certId}');

  it('lets anyone get a single certificate by id (public verification page)', () => {
    expect(block).toMatch(/allow get: if true;/);
  });

  it('keeps listing restricted to the owner or an admin', () => {
    expect(block).toMatch(/allow list: if isSignedIn\(\)\s*&& \(resource\.data\.userId == request\.auth\.uid \|\| isAdmin\(\)\);/);
  });

  it('never allows updating or deleting certificates', () => {
    expect(block).toMatch(/allow update, delete: if false;/);
  });
});

describe('users rules', () => {
  const block = matchBlock('/users/{uid}');
  const create = block.match(/allow create: ([\s\S]*?);/)?.[1] ?? '';

  it('only lets a user create their own profile', () => {
    expect(create).toMatch(/^if isOwner\(uid\)/);
  });

  it('forces the self-created profile to be a pending student (no privilege escalation)', () => {
    expect(create).toMatch(/request\.resource\.data\.role == 'student'/);
    expect(create).toMatch(/request\.resource\.data\.status == 'pending'/);
  });

  it('binds the profile email to the signed-in account', () => {
    expect(create).toMatch(/request\.resource\.data\.email == request\.auth\.token\.email/);
  });

  it('limits the self-created profile to the registration fields', () => {
    expect(create).toMatch(
      /request\.resource\.data\.keys\(\)\.hasOnly\(\['email', 'displayName', 'role', 'status', 'cohortId', 'createdAt'\]\)/,
    );
  });

  it('only allows an active self-created profile through an accepted invitation', () => {
    expect(create).toMatch(/request\.resource\.data\.status == 'active'\s*&& isAcceptedInvitation\(request\.resource\.data\.invitationId, request\.resource\.data\.cohortId\)/);
  });

  it('checks the invitation before the batch and its consumption after it', () => {
    const fn = rules.match(/function isAcceptedInvitation\([\s\S]*?\n    }/)?.[0] ?? '';
    expect(fn).toMatch(/before\.status == 'pending'/);
    expect(fn).toMatch(/before\.expiresAt > request\.time/);
    expect(fn).toMatch(/before\.email == request\.auth\.token\.email\.lower\(\)/);
    expect(fn).toMatch(/before\.cohortId == cohortId/);
    expect(fn).toMatch(/after\.status == 'accepted'/);
    expect(fn).toMatch(/after\.acceptedBy == request\.auth\.uid/);
  });
});

describe('invitations rules', () => {
  const block = matchBlock('/invitations/{token}');

  it('lets a signed-in user read an invitation only by its secret token', () => {
    expect(block).toMatch(/allow get: if isSignedIn\(\);/);
    expect(block).toMatch(/allow list: if isAdmin\(\);/);
  });

  it('lets only admins create invitations, and never delete them', () => {
    expect(block).toMatch(/allow create: if isAdmin\(\)/);
    expect(block).toMatch(/allow delete: if false;/);
  });

  it('lets the invitee only accept their own pending invitation while creating their profile', () => {
    const invitee = block.match(/allow update: if isSignedIn\(\)([\s\S]*?);/)?.[1] ?? '';
    expect(invitee).toMatch(/resource\.data\.status == 'pending'/);
    expect(invitee).toMatch(/resource\.data\.expiresAt > request\.time/);
    expect(invitee).toMatch(/resource\.data\.email == request\.auth\.token\.email\.lower\(\)/);
    expect(invitee).toMatch(/affectedKeys\(\)\.hasOnly\(\['status', 'acceptedBy', 'acceptedAt'\]\)/);
    expect(invitee).toMatch(/request\.resource\.data\.acceptedBy == request\.auth\.uid/);
    expect(invitee).toMatch(/getAfter\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\)\.data\.invitationId == token/);
  });
});

describe('lessons rules', () => {
  it('only lets students read student lessons', () => {
    expect(rules).toMatch(/allow read: if isAdmin\(\) \|\| \(isSignedIn\(\) && resource\.data\.audience == 'student'\);/);
  });
});
