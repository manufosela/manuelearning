import { describe, it, expect, beforeAll } from 'vitest';
import { parseAstroPages } from './helpers/astro-source.js';

/**
 * Admin pages structure, analysed from the .astro sources (layout + page),
 * not from dist/ (MEL-BUG-0005).
 * @param {string} pagePath - path under src/pages without extension
 * @returns {{ html: string, doc: Document }}
 */
function loadPage(pagePath) {
  return parseAstroPages('src/layouts/AdminLayout.astro', `src/pages/${pagePath}.astro`);
}

describe('Admin Users page (/admin/users)', () => {
  /** @type {{ html: string, doc: Document }} */
  let page;

  beforeAll(() => {
    page = loadPage('admin/users');
  });

  it('should have the admin-guard element', () => {
    const guard = page.doc.querySelector('admin-guard');
    expect(guard).not.toBeNull();
  });

  it('should have the admin-users-list component', () => {
    const list = page.doc.querySelector('admin-users-list');
    expect(list).not.toBeNull();
  });

  it('should have "Gestión de usuarios" heading', () => {
    const heading = page.doc.querySelector('.admin-users__header h1');
    expect(heading).not.toBeNull();
    expect(heading.textContent).toContain('Gestión de usuarios');
  });

  it('should have admin sidebar with navigation', () => {
    const sidebar = page.doc.querySelector('.admin-sidebar');
    expect(sidebar).not.toBeNull();
    const navLinks = sidebar.querySelectorAll('.admin-nav-link');
    expect(navLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('should have a link to users section in sidebar', () => {
    const usersLink = page.doc.querySelector('a[href="/admin/users"]');
    expect(usersLink).not.toBeNull();
  });

  it('should have a link to dashboard in sidebar', () => {
    const dashLink = page.doc.querySelector('a[href="/dashboard"]');
    expect(dashLink).not.toBeNull();
  });

  it('should have title containing Admin', () => {
    expect(page.html).toMatch(/title="[^"]*Admin"/);
  });
});
