/**
 * Seed script: creates initial cohort, invitation code, and site settings
 * in Firestore so the first user can register and be promoted to admin.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *
 * Prerequisites:
 *   - serviceAccountKey.json in project root
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

console.log(`\nConnected to project: ${serviceAccount.project_id}\n`);

async function seed() {
  // 1. Check/create cohort
  const cohortsSnap = await db.collection('cohorts').get();
  let cohortId;

  if (cohortsSnap.size > 0) {
    cohortId = cohortsSnap.docs[0].id;
    console.log(`Cohort already exists: ${cohortId} (${cohortsSnap.docs[0].data().name})`);
  } else {
    const cohortRef = await db.collection('cohorts').add({
      name: 'Cohorte Inicial',
      code: '2026-01',
      startDate: '2026-01-01',
      expiryDate: '2027-12-31',
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    cohortId = cohortRef.id;
    console.log(`Cohort created: ${cohortId} (Cohorte Inicial)`);
  }

  // 2. Check/create invitation code ADMIN001
  const codesSnap = await db.collection('invitationCodes')
    .where('code', '==', 'ADMIN001').get();

  if (codesSnap.size > 0) {
    console.log('Invitation code ADMIN001 already exists');
  } else {
    await db.collection('invitationCodes').add({
      code: 'ADMIN001',
      cohortId,
      maxUses: 5,
      usedCount: 0,
      active: true,
    });
    console.log('Invitation code created: ADMIN001 (5 uses)');
  }

  // 3. Set site settings
  await db.doc('settings/site').set({ registrationOpen: true }, { merge: true });
  console.log('Site settings: registrationOpen = true');

  console.log('\n--- Setup complete ---');
  console.log('1. Register at the app with code: ADMIN001');
  console.log('2. Then run: node scripts/promote-admin.mjs <your-email>');
  console.log('   to promote your user to admin.\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
