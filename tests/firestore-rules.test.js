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

describe('lessons rules', () => {
  it('only lets students read student lessons', () => {
    expect(rules).toMatch(/allow read: if isAdmin\(\) \|\| \(isSignedIn\(\) && resource\.data\.audience == 'student'\);/);
  });
});
