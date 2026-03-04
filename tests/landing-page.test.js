import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Tests para LCT-TSK-0002: Landing page de registro
 *
 * Criterios de aceptación:
 * 1. Se muestra landing con diseño rojo/gris, hero section, plan de estudios,
 *    sección de maestría y footer
 * 2. El botón "Regístrate ahora" navega al formulario de registro
 * 3. El diseño es responsive (clases CSS responsive presentes)
 */

/** @type {string} */
let indexHtml;

/** @type {Document} */
let doc;

beforeAll(async () => {
  const buildDir = path.resolve('dist');
  const indexPath = path.join(buildDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      'Build output not found. Run "npm run build" before running tests.'
    );
  }

  indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const parser = new DOMParser();
  doc = parser.parseFromString(indexHtml, 'text/html');
});

describe('Landing page - Estructura principal', () => {
  it('should have a hero section', () => {
    const hero = doc.querySelector('.hero');
    expect(hero).not.toBeNull();
  });

  it('should have the hero title with correct text', () => {
    const title = doc.querySelector('.hero__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toContain('Construcción Lean');
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

  it('should have hero call-to-action buttons', () => {
    const actions = doc.querySelector('.hero__actions');
    expect(actions).not.toBeNull();
    const buttons = actions.querySelectorAll('a, button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Landing page - Plan de estudios (Services section)', () => {
  it('should have the services section', () => {
    const services = doc.querySelector('.services');
    expect(services).not.toBeNull();
  });

  it('should have "Plan de estudios" heading', () => {
    const label = doc.querySelector('.services .section-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Plan de estudios');
  });

  it('should display at least 3 service cards', () => {
    const cards = doc.querySelectorAll('.service-card');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it('each service card should have title and text', () => {
    const cards = doc.querySelectorAll('.service-card');
    cards.forEach((card) => {
      expect(card.querySelector('.service-card__title')).not.toBeNull();
      expect(card.querySelector('.service-card__text')).not.toBeNull();
    });
  });
});

describe('Landing page - Sección de maestría (Why Lean)', () => {
  it('should have the why-lean section', () => {
    const section = doc.querySelector('.why-lean');
    expect(section).not.toBeNull();
  });

  it('should have "Maestría en Construcción Lean" title', () => {
    const title = doc.querySelector('.why-lean__title');
    expect(title).not.toBeNull();
    expect(title.textContent).toContain('Maestría en Construcción Lean');
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

  it('should show completion statistics', () => {
    const stat = doc.querySelector('.why-lean__stat-number');
    expect(stat).not.toBeNull();
    expect(stat.textContent).toContain('98%');
  });
});

describe('Landing page - Header y Footer', () => {
  it('should have a sticky header with brand', () => {
    const header = doc.querySelector('.site-header');
    expect(header).not.toBeNull();
    const brand = header.querySelector('.site-header__brand');
    expect(brand).not.toBeNull();
  });

  it('should have the registration button in header', () => {
    const nav = doc.querySelector('.site-header__nav');
    expect(nav).not.toBeNull();
    const regBtn = nav.querySelector('a, button');
    expect(regBtn).not.toBeNull();
    expect(regBtn.textContent).toContain('Regístrate');
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

  it('should have copyright in footer', () => {
    const bottom = doc.querySelector('.site-footer__bottom');
    expect(bottom).not.toBeNull();
    expect(bottom.textContent).toContain('ManuElearning');
  });
});

describe('Landing page - Registro navigation', () => {
  it('hero "Regístrate ahora" should link to /registro', () => {
    const heroActions = doc.querySelector('.hero__actions');
    const registerLink = heroActions.querySelector('a[href="/registro"]');
    expect(registerLink).not.toBeNull();
    expect(registerLink.textContent).toContain('Regístrate ahora');
  });

  it('header "Regístrate" should link to /registro', () => {
    const nav = doc.querySelector('.site-header__nav');
    const registerLink = nav.querySelector('a[href="/registro"]');
    expect(registerLink).not.toBeNull();
  });

  it('CTA "Inscríbete ya" should link to /registro', () => {
    const cta = doc.querySelector('.cta-banner');
    const registerLink = cta.querySelector('a[href="/registro"]');
    expect(registerLink).not.toBeNull();
  });
});

describe('Landing page - Responsive design', () => {
  /** @type {string} */
  let allCss;

  beforeAll(() => {
    const cssDir = path.join(path.resolve('dist'), '_astro');
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
      allCss = cssFiles
        .map((f) => fs.readFileSync(path.join(cssDir, f), 'utf-8'))
        .join('\n');
    } else {
      allCss = indexHtml;
    }
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
