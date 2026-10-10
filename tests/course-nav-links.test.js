import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseAstroPages } from './helpers/astro-source.js';

const mockFetchPublishedCourses = vi.fn();

vi.mock('../src/lib/firebase/courses.js', () => ({
  fetchPublishedCourses: (...a) => mockFetchPublishedCourses(...a),
}));

await import('../src/components/course-nav-links.js');

const docker = { slug: 'docker', title: 'Docker desde cero' };
const karajan = { slug: 'karajan-v4', title: 'Karajan v4' };

/** @returns {Promise<HTMLElement>} */
async function mount() {
  const el = document.createElement('course-nav-links');
  document.body.appendChild(el);
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('course-nav-links', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a light-DOM link per published course', async () => {
    mockFetchPublishedCourses.mockResolvedValue({ success: true, courses: [docker, karajan] });

    const el = await mount();
    const links = el.querySelectorAll('li a');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('/curso?c=karajan-v4');
    expect(links[1].textContent).toBe('Karajan v4');
  });

  it('renders nothing when courses cannot be loaded', async () => {
    mockFetchPublishedCourses.mockResolvedValue({ success: false, error: 'boom' });

    const el = await mount();
    expect(el.querySelectorAll('li')).toHaveLength(0);
  });
});

describe('Footer course links (MainLayout)', () => {
  const { doc } = parseAstroPages('src/layouts/MainLayout.astro');
  const coursesSection = [...doc.querySelectorAll('.site-footer__links')].find(
    (section) => section.querySelector('h4')?.textContent === 'Cursos'
  );

  it('lists published courses dynamically and keeps the "Ver todos" link', () => {
    expect(coursesSection.querySelector('course-nav-links')).not.toBeNull();
    expect(coursesSection.querySelector('a[href="/cursos"]')).not.toBeNull();
  });

  it('has no hardcoded per-course links', () => {
    expect(coursesSection.querySelector('a[href^="/curso?c="]')).toBeNull();
  });

  it('styles footer links globally so the Lit-rendered ones are styled too', () => {
    const { html } = parseAstroPages('src/layouts/MainLayout.astro');
    expect(html).toContain('.site-footer__links :global(li)');
    expect(html).toContain('.site-footer__links :global(a):hover');
  });
});
