import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseAstroPages } from './helpers/astro-source.js';

/**
 * Tests de estructura de la landing (MEL-TSK-0002, actualizados en MEL-BUG-0005).
 *
 * Se analiza el marcado fuente de src/pages/index.astro y del layout, no la
 * salida de dist/: así la suite no depende de un build previo ni de un
 * servidor local, y no se queda obsoleta en silencio cuando cambia el build.
 */

/** @type {Document} */
let doc;

beforeAll(() => {
  ({ doc } = parseAstroPages('src/layouts/MainLayout.astro', 'src/pages/index.astro'));
});

describe('Landing page - Estructura principal', () => {
  it('should have a hero section', () => {
    const hero = doc.querySelector('.hero');
    expect(hero).not.toBeNull();
  });

  it('should have the hero title with correct text', () => {
    const title = doc.querySelector('.hero__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toContain('Aprende tecnología de verdad');
  });

  it('should have the hero badge', () => {
    const badge = doc.querySelector('.hero__badge');
    expect(badge).not.toBeNull();
  });

  it('should have a hero description', () => {
    const desc = doc.querySelector('.hero__description');
    expect(desc).not.toBeNull();
    expect(desc.textContent.length).toBeGreaterThan(0);
  });

  it('should have a hero call-to-action button', () => {
    const actions = doc.querySelector('.hero__actions');
    expect(actions).not.toBeNull();
    const buttons = actions.querySelectorAll('a, button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Landing page - Cursos (Services section)', () => {
  it('should have the services section', () => {
    const services = doc.querySelector('.services');
    expect(services).not.toBeNull();
  });

  it('should have "Cursos" heading', () => {
    const label = doc.querySelector('.services .section-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Cursos');
  });

  it('should display at least 2 service cards', () => {
    const cards = doc.querySelectorAll('.service-card');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it('should not advertise the retired JavaScript demo course', () => {
    const titles = [...doc.querySelectorAll('.service-card__title')].map((t) => t.textContent);
    expect(titles.some((t) => /javascript/i.test(t))).toBe(false);
  });

  it('each service card should have title and text', () => {
    const cards = doc.querySelectorAll('.service-card');
    cards.forEach((card) => {
      expect(card.querySelector('.service-card__title')).not.toBeNull();
      expect(card.querySelector('.service-card__text')).not.toBeNull();
    });
  });
});

describe('Landing page - Sección "¿Para quién es esto?" (Why Lean)', () => {
  it('should have the why-lean section', () => {
    const section = doc.querySelector('.why-lean');
    expect(section).not.toBeNull();
  });

  it('should have the "Para quien quiere aprender" title', () => {
    const title = doc.querySelector('.why-lean__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toContain('Para quien quiere aprender');
  });

  it('should show an image of a professional', () => {
    const img = doc.querySelector('.why-lean__image img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toContain('engineer-tablet');
  });

  it('should list course features with check icons', () => {
    const features = doc.querySelectorAll('.why-lean__features li');
    expect(features.length).toBeGreaterThanOrEqual(3);
  });

  it('should show experience statistics', () => {
    const stats = doc.querySelectorAll('.why-lean__stat-number');
    expect(stats.length).toBeGreaterThanOrEqual(3);
    stats.forEach((stat) => expect(stat.textContent).toMatch(/^\+\d+$/));
  });
});

describe('Landing page - Header y Footer', () => {
  it('should have a sticky header with brand', () => {
    const header = doc.querySelector('.site-header');
    expect(header).not.toBeNull();
    const brand = header.querySelector('.site-header__brand');
    expect(brand).not.toBeNull();
  });

  it('should have the login button in header', () => {
    const loginBtn = doc.querySelector('.site-header__actions #header-login-btn');
    expect(loginBtn).not.toBeNull();
    expect(loginBtn.getAttribute('href')).toBe('/login');
    expect(loginBtn.textContent).toContain('Acceder');
  });

  it('should have a footer with grid sections', () => {
    const footer = doc.querySelector('.site-footer');
    expect(footer).not.toBeNull();
    const grid = footer.querySelector('.site-footer__grid');
    expect(grid).not.toBeNull();
  });

  it('should have footer link sections (Cursos, Recursos, Contacto)', () => {
    const linkSections = doc.querySelectorAll('.site-footer__links h4');
    const headings = Array.from(linkSections).map((h) => h.textContent);
    expect(headings).toContain('Cursos');
    expect(headings).toContain('Recursos');
    expect(headings).toContain('Contacto');
  });

  it('should have copyright and legal links in footer', () => {
    const bottom = doc.querySelector('.site-footer__bottom');
    expect(bottom).not.toBeNull();
    expect(bottom.textContent).toContain('Todos los derechos reservados');
    expect(bottom.querySelector('a[href="/privacidad"]')).not.toBeNull();
  });
});

describe('Landing page - Navegación', () => {
  it('hero button should link to /cursos', () => {
    const heroActions = doc.querySelector('.hero__actions');
    const coursesLink = heroActions.querySelector('a[href="/cursos"]');
    expect(coursesLink).not.toBeNull();
    expect(coursesLink.textContent).toContain('Ver cursos');
  });

  it('header button should link to /login', () => {
    const loginLink = doc.querySelector('.site-header__actions a[href="/login"]');
    expect(loginLink).not.toBeNull();
  });

  it('access CTA should link to /solicitar-acceso', () => {
    const cta = doc.querySelector('#cta-access');
    expect(cta).not.toBeNull();
    expect(cta.getAttribute('href')).toBe('/solicitar-acceso');
    expect(cta.textContent).toContain('Solicitar acceso');
  });
});

describe('Landing page - Responsive design', () => {
  /** @type {string} */
  let allCss;

  beforeAll(() => {
    allCss = [
      'src/styles/global.css',
      'src/layouts/MainLayout.astro',
      'src/pages/index.astro',
    ]
      .map((f) => fs.readFileSync(path.resolve(f), 'utf-8'))
      .join('\n');
  });

  it('should have viewport meta tag', () => {
    const viewport = doc.querySelector('meta[name="viewport"]');
    expect(viewport).not.toBeNull();
    expect(viewport.getAttribute('content')).toContain('width=device-width');
  });

  it('should use clamp() for responsive typography', () => {
    expect(allCss).toContain('clamp(');
  });

  it('should have responsive grid in services (CSS media queries)', () => {
    expect(allCss).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
  });
});
