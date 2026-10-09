import { describe, it, expect, beforeAll } from 'vitest';
import { parseAstroPages } from './helpers/astro-source.js';

/**
 * Tests para MEL-TSK-0033: Página 404 personalizada (fuente, no dist/).
 *
 * Criterios de aceptación:
 * - Un usuario que navega a una ruta inexistente ve una página 404
 *   con mensaje claro y enlace para volver al inicio o dashboard
 */

/** @type {string} */
let html;

/** @type {Document} */
let doc;

beforeAll(() => {
  ({ html, doc } = parseAstroPages('src/layouts/MainLayout.astro', 'src/pages/404.astro'));
});

describe('404 page - Structure', () => {
  it('should have a page title containing 404', () => {
    expect(html).toMatch(/title="404 \|/);
  });

  it('should display the 404 error code prominently', () => {
    const errorCode = doc.querySelector('.error-page__code');
    expect(errorCode).not.toBeNull();
    expect(errorCode.textContent).toContain('404');
  });

  it('should have a clear message explaining the page was not found', () => {
    const message = doc.querySelector('.error-page__title');
    expect(message).not.toBeNull();
    expect(message.textContent.length).toBeGreaterThan(0);
  });

  it('should have a descriptive subtitle', () => {
    const subtitle = doc.querySelector('.error-page__subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent.length).toBeGreaterThan(0);
  });
});

describe('404 page - Navigation', () => {
  it('should have a link to go back to the home page', () => {
    const homeLink = doc.querySelector('a[href="/"]');
    expect(homeLink).not.toBeNull();
  });

  it('should have a link to the dashboard', () => {
    const dashboardLink = doc.querySelector('a[href="/dashboard"]');
    expect(dashboardLink).not.toBeNull();
  });
});

describe('404 page - Layout', () => {
  it('should use the MainLayout with header and footer', () => {
    const header = doc.querySelector('.site-header');
    expect(header).not.toBeNull();
    const footer = doc.querySelector('.site-footer');
    expect(footer).not.toBeNull();
  });

  it('should have a Material Symbols icon', () => {
    const icon = doc.querySelector('.error-page .material-symbols-outlined');
    expect(icon).not.toBeNull();
  });
});
