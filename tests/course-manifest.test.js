import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  validateManifest,
  extractSection,
  resolveManifest,
} from '../scripts/lib/course-manifest.js';

const validManifest = () => ({
  slug: 'karajan-v4',
  title: 'Gobernanza con Karajan v4',
  modules: [
    {
      title: 'Módulo 1',
      lessons: [{ title: 'Intro', file: 'manual.md', section: '## Módulo 1' }],
      quiz: {
        title: 'Test módulo 1',
        questions: [
          { text: '¿Qué es el falso verde?', type: 'multiple', options: ['A', 'B'], correctAnswer: 1 },
          { text: 'Explica un caso', type: 'open' },
        ],
      },
    },
  ],
});

describe('validateManifest', () => {
  it('accepts a complete manifest', () => {
    expect(validateManifest(validManifest())).toEqual({ valid: true, errors: [] });
  });

  it('rejects a non-object', () => {
    expect(validateManifest(null).valid).toBe(false);
  });

  it('requires a slug with lowercase, digits and hyphens only', () => {
    const manifest = { ...validManifest(), slug: 'Karajan V4' };
    expect(validateManifest(manifest).errors).toContain('slug es obligatorio y solo admite minúsculas, dígitos y guiones');
  });

  it('requires title, modules and lessons', () => {
    const { errors } = validateManifest({ slug: 'x', modules: [{ lessons: [] }] });
    expect(errors).toContain('title es obligatorio');
    expect(errors).toContain('modules[0]: title es obligatorio');
    expect(errors).toContain('modules[0]: lessons debe tener al menos una lección');
  });

  it('requires file and a known audience on each lesson', () => {
    const manifest = validManifest();
    manifest.modules[0].lessons[0] = { title: 'Sin fichero', audience: 'admin' };
    const { errors } = validateManifest(manifest);
    expect(errors).toContain('modules[0].lessons[0]: file es obligatorio');
    expect(errors).toContain('modules[0].lessons[0]: audience debe ser student o instructor');
  });

  it('validates quiz questions: type, options and correctAnswer', () => {
    const manifest = validManifest();
    manifest.modules[0].quiz.questions = [
      { text: 'Una opción', type: 'multiple', options: ['A'], correctAnswer: 3 },
      { text: '', type: 'essay' },
    ];
    const { errors } = validateManifest(manifest);
    expect(errors).toContain('modules[0].quiz.questions[0]: multiple necesita al menos 2 options');
    expect(errors).toContain('modules[0].quiz.questions[0]: correctAnswer debe ser un índice válido de options');
    expect(errors).toContain('modules[0].quiz.questions[1]: text es obligatorio');
    expect(errors).toContain('modules[0].quiz.questions[1]: type debe ser open o multiple');
  });

  it('rejects a quiz lessonIndex out of range', () => {
    const manifest = validManifest();
    manifest.modules[0].quiz.lessonIndex = 5;
    expect(validateManifest(manifest).errors).toContain('modules[0].quiz: lessonIndex fuera de rango');
  });
});

describe('extractSection', () => {
  const markdown = [
    '# Manual',
    'Intro.',
    '## Módulo 1',
    'Texto 1.',
    '### Sub 1.1',
    'Detalle.',
    '```',
    '## no es un encabezado',
    '```',
    '## Módulo 2',
    'Texto 2.',
  ].join('\n');

  it('returns the heading and its content until the next heading of the same level', () => {
    const section = extractSection(markdown, '## Módulo 1');
    expect(section.startsWith('## Módulo 1')).toBe(true);
    expect(section).toContain('### Sub 1.1');
    expect(section).toContain('## no es un encabezado');
    expect(section).not.toContain('Texto 2.');
  });

  it('stops at a higher-level heading', () => {
    const doc = '## A\nuno\n# Raíz\ndos';
    expect(extractSection(doc, '## A')).toBe('## A\nuno');
  });

  it('with sectionOnly stops at the next heading of any level', () => {
    expect(extractSection(markdown, '# Manual', { sectionOnly: true })).toBe('# Manual\nIntro.');
    expect(extractSection(markdown, '## Módulo 1', { sectionOnly: true })).toBe('## Módulo 1\nTexto 1.');
  });

  it('returns until the end of the document for the last section', () => {
    expect(extractSection(markdown, '## Módulo 2')).toBe('## Módulo 2\nTexto 2.');
  });

  it('throws when the heading is missing or malformed', () => {
    expect(() => extractSection(markdown, '## Módulo 9')).toThrow('Encabezado no encontrado');
    expect(() => extractSection(markdown, 'Módulo 1')).toThrow('debe empezar por #');
  });
});

describe('resolveManifest', () => {
  let dir;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'course-manifest-'));
    writeFileSync(join(dir, 'manual.md'), '# Manual\nPresentación.\n\n## Módulo 1\nContenido 1.\n\n## Módulo 2\nContenido 2.\n');
    writeFileSync(join(dir, 'extra.md'), '# Extra\nTodo el fichero.\n');
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('builds course metadata with defaults and ordered modules and lessons', () => {
    const manifest = validManifest();
    manifest.modules[0].lessons.push({ title: 'Pack', file: 'extra.md', audience: 'instructor' });
    manifest.modules[0].lessons.push({ title: 'Presentación', file: 'manual.md', section: '# Manual', sectionOnly: true });
    const { course, modules } = resolveManifest(manifest, dir);

    expect(course).toEqual({
      slug: 'karajan-v4',
      title: 'Gobernanza con Karajan v4',
      description: '',
      icon: 'school',
      color: '#d32f2f',
      order: 0,
      published: true,
    });
    expect(modules[0].order).toBe(0);
    expect(modules[0].lessons[0]).toMatchObject({ order: 0, audience: 'student', documentation: '## Módulo 1\nContenido 1.' });
    expect(modules[0].lessons[1]).toMatchObject({ order: 1, audience: 'instructor', documentation: '# Extra\nTodo el fichero.' });
    expect(modules[0].lessons[2]).toMatchObject({ order: 2, documentation: '# Manual\nPresentación.' });
  });

  it('links the quiz to the last lesson by default', () => {
    const { modules } = resolveManifest(validManifest(), dir);
    expect(modules[0].quiz).toMatchObject({ title: 'Test módulo 1', lessonIndex: 0 });
    expect(modules[0].quiz.questions).toHaveLength(2);
  });

  it('throws with every validation error when the manifest is invalid', () => {
    expect(() => resolveManifest({ slug: 'x' }, dir)).toThrow(/Manifiesto inválido:[\s\S]*title es obligatorio/);
  });
});
