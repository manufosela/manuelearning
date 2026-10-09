/**
 * Course manifest: pure logic to turn docs/<slug>/course.json plus its
 * markdown files into the structure the import script uploads to Firestore.
 * No Firebase dependency, so it is unit-testable.
 *
 * Manifest shape:
 * {
 *   slug, title, description?, icon?, color?, order?, published?,
 *   modules: [{
 *     title, description?,
 *     lessons: [{ title, description?, file, section?, videoUrl?, audience? }],
 *     quiz?: { title, lessonIndex?, questions: [{ text, type, options?, correctAnswer?, explanation? }] }
 *   }]
 * }
 * A lesson takes the whole markdown `file`, or only the `section` whose
 * heading line matches exactly (until the next heading of the same or a
 * higher level; with `sectionOnly: true`, until the next heading of any
 * level, e.g. the intro paragraph of a document before its first `##`).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

export const AUDIENCES = ['student', 'instructor'];
export const QUESTION_TYPES = ['open', 'multiple'];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * @param {object} question
 * @param {string} where
 * @returns {string[]}
 */
function validateQuestion(question, where) {
  const errors = [];
  if (!isNonEmptyString(question.text)) errors.push(`${where}: text es obligatorio`);
  if (!QUESTION_TYPES.includes(question.type)) errors.push(`${where}: type debe ser open o multiple`);
  if (question.type === 'multiple') {
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length < 2) errors.push(`${where}: multiple necesita al menos 2 options`);
    if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer >= options.length) {
      errors.push(`${where}: correctAnswer debe ser un índice válido de options`);
    }
  }
  return errors;
}

/**
 * @param {object} mod
 * @param {number} index
 * @returns {string[]}
 */
function validateModule(mod, index) {
  const where = `modules[${index}]`;
  const errors = [];
  if (!isNonEmptyString(mod.title)) errors.push(`${where}: title es obligatorio`);
  const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
  if (lessons.length === 0) errors.push(`${where}: lessons debe tener al menos una lección`);
  lessons.forEach((lesson, j) => {
    const lw = `${where}.lessons[${j}]`;
    if (!isNonEmptyString(lesson.title)) errors.push(`${lw}: title es obligatorio`);
    if (!isNonEmptyString(lesson.file)) errors.push(`${lw}: file es obligatorio`);
    if (lesson.audience !== undefined && !AUDIENCES.includes(lesson.audience)) {
      errors.push(`${lw}: audience debe ser student o instructor`);
    }
  });
  if (mod.quiz !== undefined) {
    const qw = `${where}.quiz`;
    if (!isNonEmptyString(mod.quiz.title)) errors.push(`${qw}: title es obligatorio`);
    const questions = Array.isArray(mod.quiz.questions) ? mod.quiz.questions : [];
    if (questions.length === 0) errors.push(`${qw}: questions debe tener al menos una pregunta`);
    questions.forEach((q, k) => errors.push(...validateQuestion(q, `${qw}.questions[${k}]`)));
    if (mod.quiz.lessonIndex !== undefined && !(Number.isInteger(mod.quiz.lessonIndex) && mod.quiz.lessonIndex >= 0 && mod.quiz.lessonIndex < lessons.length)) {
      errors.push(`${qw}: lessonIndex fuera de rango`);
    }
  }
  return errors;
}

/**
 * Validate a manifest object. Returns every problem found, not just the first.
 * @param {object} manifest
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') return { valid: false, errors: ['manifest debe ser un objeto'] };
  if (!isNonEmptyString(manifest.slug) || !SLUG_PATTERN.test(manifest.slug)) {
    errors.push('slug es obligatorio y solo admite minúsculas, dígitos y guiones');
  }
  if (!isNonEmptyString(manifest.title)) errors.push('title es obligatorio');
  const modules = Array.isArray(manifest.modules) ? manifest.modules : [];
  if (modules.length === 0) errors.push('modules debe tener al menos un módulo');
  modules.forEach((mod, i) => errors.push(...validateModule(mod, i)));
  return { valid: errors.length === 0, errors };
}

/**
 * Extract one section of a markdown document: from the line that equals
 * `heading` up to the next heading of the same or a higher level.
 * Headings inside fenced code blocks are ignored.
 * @param {string} markdown
 * @param {string} heading - exact heading line, e.g. "## Módulo 1"
 * @param {{ sectionOnly?: boolean }} [options] - stop at the next heading of any level
 * @returns {string}
 */
export function extractSection(markdown, heading, { sectionOnly = false } = {}) {
  const wanted = heading.trim();
  const level = wanted.match(/^#+/)?.[0].length;
  if (!level) throw new Error(`El encabezado "${heading}" debe empezar por #`);

  const lines = markdown.split('\n');
  let inFence = false;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const headingLevel = line.match(/^(#+)\s/)?.[1].length;
    if (start === -1) {
      if (line.trim() === wanted) start = i;
      continue;
    }
    if (headingLevel && (sectionOnly || headingLevel <= level)) return lines.slice(start, i).join('\n').trim();
  }
  if (start === -1) throw new Error(`Encabezado no encontrado: "${heading}"`);
  return lines.slice(start).join('\n').trim();
}

/**
 * Resolve a validated manifest into the data to upload, reading the markdown
 * files relative to `baseDir`.
 * @param {object} manifest
 * @param {string} baseDir
 * @returns {{ course: object, modules: object[] }}
 */
export function resolveManifest(manifest, baseDir) {
  const { valid, errors } = validateManifest(manifest);
  if (!valid) throw new Error(`Manifiesto inválido:\n- ${errors.join('\n- ')}`);

  const fileCache = new Map();
  const readMarkdown = (file) => {
    if (!fileCache.has(file)) fileCache.set(file, readFileSync(resolve(baseDir, file), 'utf-8'));
    return fileCache.get(file);
  };

  const course = {
    slug: manifest.slug,
    title: manifest.title,
    description: manifest.description ?? '',
    icon: manifest.icon ?? 'school',
    color: manifest.color ?? '#d32f2f',
    order: manifest.order ?? 0,
    published: manifest.published ?? true,
  };

  const modules = manifest.modules.map((mod, order) => {
    const lessons = mod.lessons.map((lesson, lessonOrder) => {
      const markdown = readMarkdown(lesson.file);
      return {
        title: lesson.title,
        description: lesson.description ?? '',
        order: lessonOrder,
        videoUrl: lesson.videoUrl ?? '',
        audience: lesson.audience ?? 'student',
        documentation: lesson.section
          ? extractSection(markdown, lesson.section, { sectionOnly: lesson.sectionOnly === true })
          : markdown.trim(),
      };
    });
    const resolved = { title: mod.title, description: mod.description ?? '', order, lessons };
    if (mod.quiz) {
      resolved.quiz = {
        title: mod.quiz.title,
        lessonIndex: mod.quiz.lessonIndex ?? lessons.length - 1,
        questions: mod.quiz.questions,
      };
    }
    return resolved;
  });

  return { course, modules };
}
