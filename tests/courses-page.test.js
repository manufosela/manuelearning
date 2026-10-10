import { describe, it, expect } from 'vitest';
import { parseAstroPages } from './helpers/astro-source.js';

describe('Courses page (/cursos)', () => {
  const { html, doc } = parseAstroPages('src/pages/cursos.astro');

  it('renders the catalogue from the courses collection', () => {
    expect(doc.querySelector('.courses-page course-list')).not.toBeNull();
  });

  it('has no hardcoded course cards left', () => {
    expect(doc.querySelector('.course-card')).toBeNull();
    expect(html).not.toMatch(/const courses = \[/);
  });

  it('keeps the card styles global so they reach the light-DOM cards', () => {
    expect(html).toMatch(/<style is:global>[\s\S]*\.course-card \{/);
  });
});
