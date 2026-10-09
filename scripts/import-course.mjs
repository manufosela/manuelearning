/**
 * Import a course into Firestore from docs/<slug>/course.json and its
 * markdown files (see scripts/lib/course-manifest.js for the manifest shape).
 *
 * Usage:
 *   node scripts/import-course.mjs <slug> [--dry-run] [--replace] [--dir <path>]
 *
 *   --dry-run  Print what would be written, write nothing.
 *   --replace  Delete the course's existing modules, lessons, quizzes and the
 *              students' progress on them before importing. Without it the
 *              import refuses to run when the course already has modules.
 *   --dir      Directory holding course.json (default: docs/<slug>).
 *
 * Prerequisites: serviceAccountKey.json in the project root.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveManifest } from './lib/course-manifest.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const DRY_RUN = args.includes('--dry-run');
const REPLACE = args.includes('--replace');
const dirFlag = args.indexOf('--dir');
const courseDir = dirFlag === -1 ? resolve(ROOT, 'docs', slug ?? '') : resolve(ROOT, args[dirFlag + 1]);

if (!slug) {
  console.error('Uso: node scripts/import-course.mjs <slug> [--dry-run] [--replace] [--dir <path>]');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(courseDir, 'course.json'), 'utf-8'));
if (manifest.slug !== slug) {
  console.error(`El manifiesto declara slug "${manifest.slug}" pero se pidió "${slug}"`);
  process.exit(1);
}
const { course, modules } = resolveManifest(manifest, courseDir);

const serviceAccount = JSON.parse(readFileSync(resolve(ROOT, 'serviceAccountKey.json'), 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
console.log(`Proyecto ${serviceAccount.project_id} — curso "${course.title}" (${slug})${DRY_RUN ? ' [DRY RUN]' : ''}`);

const lessonCount = modules.reduce((acc, m) => acc + m.lessons.length, 0);
const quizCount = modules.filter((m) => m.quiz).length;
console.log(`  ${modules.length} módulos, ${lessonCount} lecciones, ${quizCount} quizzes`);

async function deleteExisting() {
  const existing = await db.collection('modules').where('course', '==', slug).get();
  if (existing.empty) return;
  if (!REPLACE) {
    console.error(`El curso ya tiene ${existing.size} módulos en Firestore. Usa --replace para sustituirlos.`);
    if (!DRY_RUN) process.exit(1);
    return;
  }
  const moduleIds = new Set(existing.docs.map((d) => d.id));
  let deleted = 0;
  for (const col of ['quizzes', 'progress']) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      if (!moduleIds.has(d.data().moduleId)) continue;
      deleted++;
      if (!DRY_RUN) await d.ref.delete();
    }
  }
  for (const mod of existing.docs) {
    const lessons = await mod.ref.collection('lessons').get();
    for (const lesson of lessons.docs) {
      deleted++;
      if (!DRY_RUN) await lesson.ref.delete();
    }
    deleted++;
    if (!DRY_RUN) await mod.ref.delete();
  }
  console.log(`  --replace: ${deleted} documentos previos ${DRY_RUN ? 'se borrarían' : 'borrados'}`);
}

async function upload() {
  const courseRef = db.collection('courses').doc(slug);
  console.log(`  courses/${slug}: ${JSON.stringify(course)}`);
  if (!DRY_RUN) {
    await courseRef.set({ ...course, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  for (const mod of modules) {
    console.log(`  Módulo ${mod.order}: ${mod.title} (${mod.lessons.length} lecciones)`);
    const moduleRef = db.collection('modules').doc();
    if (!DRY_RUN) {
      await moduleRef.set({
        title: mod.title,
        description: mod.description,
        order: mod.order,
        course: slug,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const lessonIds = [];
    for (const lesson of mod.lessons) {
      console.log(`    Lección ${lesson.order}: ${lesson.title} [${lesson.audience}] (${lesson.documentation.length} chars)`);
      const lessonRef = moduleRef.collection('lessons').doc();
      lessonIds.push(lessonRef.id);
      if (!DRY_RUN) await lessonRef.set({ ...lesson, createdAt: FieldValue.serverTimestamp() });
    }

    if (mod.quiz) {
      const lessonId = lessonIds[mod.quiz.lessonIndex];
      console.log(`    Quiz "${mod.quiz.title}" → lección ${mod.quiz.lessonIndex} (${mod.quiz.questions.length} preguntas)`);
      if (!DRY_RUN) {
        await db.collection('quizzes').add({
          title: mod.quiz.title,
          moduleId: moduleRef.id,
          lessonId,
          questions: mod.quiz.questions,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
}

try {
  await deleteExisting();
  await upload();
  console.log(DRY_RUN ? '\nDry run terminado, nada escrito.' : '\n✓ Curso importado.');
  process.exit(0);
} catch (err) {
  console.error('\nError:', err.message);
  process.exit(1);
}
