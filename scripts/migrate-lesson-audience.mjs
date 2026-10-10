/**
 * MEL-TSK-0095: set audience='student' on every lesson that has no audience.
 * Must run BEFORE publishing the code that queries lessons by audience:
 * student queries filter audience == 'student', so a lesson without the field
 * is invisible to students.
 *
 * Usage: node scripts/migrate-lesson-audience.mjs [--dry-run]
 * Prerequisites: serviceAccountKey.json in the project root.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN = process.argv.includes('--dry-run');

const serviceAccount = JSON.parse(readFileSync(resolve(ROOT, 'serviceAccountKey.json'), 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
console.log(`Proyecto ${serviceAccount.project_id}${DRY_RUN ? ' [DRY RUN]' : ''}`);

try {
  const lessons = await db.collectionGroup('lessons').get();
  const missing = lessons.docs.filter((d) => d.data().audience === undefined);
  console.log(`${lessons.size} lecciones, ${missing.length} sin audience`);

  for (const lesson of missing) {
    console.log(`  ${lesson.ref.path} → student`);
    if (!DRY_RUN) await lesson.ref.update({ audience: 'student' });
  }

  console.log(DRY_RUN ? 'Dry run terminado, nada escrito.' : '✓ Migración completada.');
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
