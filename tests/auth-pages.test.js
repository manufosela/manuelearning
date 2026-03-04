import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Tests para LCT-TSK-0003: Auth pages structure
 *
 * Verifies the built HTML output contains the correct auth page structures.
 */

const buildDir = path.resolve('dist');

/**
 * @param {string} pagePath
 * @returns {{ html: string, doc: Document }}
 */
function loadPage(pagePath) {
  const filePath = path.join(buildDir, pagePath, 'index.html');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Build output not found: ${filePath}. Run "npm run build" first.`);
  }
  const html = fs.readFileSync(filePath, 'utf-8');
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return { html, doc };
}

describe('Registration page (/registro)', () => {
  /** @type {{ html: string, doc: Document }} */
  let page;

  beforeAll(() => {
    page = loadPage('registro');
  });

  it('should have the auth-form element with register mode', () => {
    const authForm = page.doc.querySelector('auth-form[mode="register"]');
    expect(authForm).not.toBeNull();
  });

  it('should have a page title containing Registro', () => {
    const title = page.doc.querySelector('title');
    expect(title.textContent).toContain('Registro');
  });

  it('should have "Crear cuenta" heading', () => {
    const heading = page.doc.querySelector('.auth-header h1');
    expect(heading).not.toBeNull();
    expect(heading.textContent).toContain('Crear cuenta');
  });

  it('should have the person_add icon', () => {
    const icon = page.doc.querySelector('.auth-icon');
    expect(icon).not.toBeNull();
    expect(icon.textContent).toContain('person_add');
  });
});

describe('Login page (/login)', () => {
  /** @type {{ html: string, doc: Document }} */
  let page;

  beforeAll(() => {
    page = loadPage('login');
  });

  it('should have the auth-form element with login mode', () => {
    const authForm = page.doc.querySelector('auth-form[mode="login"]');
    expect(authForm).not.toBeNull();
  });

  it('should have a page title containing Login', () => {
    const title = page.doc.querySelector('title');
    expect(title.textContent).toContain('Login');
  });

  it('should have "Iniciar sesión" heading', () => {
    const heading = page.doc.querySelector('.auth-header h1');
    expect(heading).not.toBeNull();
    expect(heading.textContent).toContain('Iniciar sesión');
  });
});

describe('Dashboard page (/dashboard)', () => {
  /** @type {{ html: string, doc: Document }} */
  let page;

  beforeAll(() => {
    page = loadPage('dashboard');
  });

  it('should have the auth-guard element', () => {
    const guard = page.doc.querySelector('auth-guard');
    expect(guard).not.toBeNull();
  });

  it('should have a logout button', () => {
    const logoutBtn = page.doc.querySelector('#logout-btn');
    expect(logoutBtn).not.toBeNull();
    expect(logoutBtn.textContent).toContain('Cerrar sesión');
  });

  it('should have a page title containing Dashboard', () => {
    const title = page.doc.querySelector('title');
    expect(title.textContent).toContain('Dashboard');
  });

  it('should have student dashboard component', () => {
    const dashboard = page.doc.querySelector('student-dashboard-view');
    expect(dashboard).not.toBeNull();
  });
});
