import { describe, it, expect, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { SITE } from '../src/config/site.config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('SITE.contactEmail', () => {
  it('reads the contact email from PUBLIC_CONTACT_EMAIL', () => {
    vi.stubEnv('PUBLIC_CONTACT_EMAIL', 'hola@example.org');
    expect(SITE.contactEmail).toBe('hola@example.org');
  });

  it('fails loudly when PUBLIC_CONTACT_EMAIL is missing', () => {
    vi.stubEnv('PUBLIC_CONTACT_EMAIL', '');
    expect(() => SITE.contactEmail).toThrow('PUBLIC_CONTACT_EMAIL');
  });
});

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

describe('public repository privacy', () => {
  it('has no personal email address hardcoded in src/', () => {
    const personalEmail = /[\w.+-]+@(gmail|hotmail|outlook|yahoo)\.[a-z]+/i;
    const offenders = listFiles('src').filter((file) => personalEmail.test(readFileSync(file, 'utf-8')));
    expect(offenders).toEqual([]);
  });
});
