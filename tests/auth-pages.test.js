import { describe, it, expect, beforeAll } from 'vitest';
import { parseAstroPages } from './helpers/astro-source.js';

/**
 * Tests de estructura de las páginas de auth (MEL-TSK-0003, actualizados en
 * MEL-BUG-0005). Se analiza el marcado fuente de src/pages/*.astro, no dist/,
 * para que la suite no dependa de un build previo.
 */

/**
 * @param {string} pageName - page file name without extension (e.g. 'login')
 * @returns {{ html: string, doc: Document }}
 */
function loadPage(pageName) {
  return parseAstroPages(`src/pages/${pageName}.astro`);
}

describe('Registration page (/registro)', () => {
  /** @type {{ html: string, doc: Document }} */
  let page;

  beforeAll(() => {
    page = loadPage('registro');
  });

  it('should have the auth-form element', () => {
    const authForm = page.doc.querySelector('auth-form');
    expect(authForm).not.toBeNull();
  });

  it('should have a page title containing Registro', () => {
    expect(page.html).toMatch(/title=\{`Registro \|/);
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

  it('should have the auth-form element', () => {
    const authForm = page.doc.querySelector('auth-form');
    expect(authForm).not.toBeNull();
  });

  it('should have a page title containing Login', () => {
    expect(page.html).toMatch(/title=\{`Login \|/);
  });

  it('should have "Acceder" heading', () => {
    const heading = page.doc.querySelector('.auth-header h1');
    expect(heading).not.toBeNull();
    expect(heading.textContent).toContain('Acceder');
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
    expect(page.html).toMatch(/title=\{`Dashboard \|/);
  });

  it('should have student dashboard component', () => {
    const dashboard = page.doc.querySelector('student-dashboard-view');
    expect(dashboard).not.toBeNull();
  });
});
