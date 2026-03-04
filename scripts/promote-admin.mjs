/**
 * Promotes a registered user to admin by email.
 *
 * Usage:
 *   node scripts/promote-admin.mjs <email>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/promote-admin.mjs <email>');
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

console.log(`\nConnected to project: ${serviceAccount.project_id}\n`);

async function promote() {
  const usersSnap = await db.collection('users')
    .where('email', '==', email).get();

  if (usersSnap.empty) {
    console.error(`No user found with email: ${email}`);
    console.error('Make sure the user has registered first.');
    process.exit(1);
  }

  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();

  if (userData.role === 'admin') {
    console.log(`User ${email} is already an admin.`);
    process.exit(0);
  }

  await db.doc(`users/${userDoc.id}`).update({ role: 'admin' });
  console.log(`User ${email} promoted to admin.`);
  console.log('They can now access /admin pages.\n');

  process.exit(0);
}

promote().catch((err) => {
  console.error('Promote failed:', err.message);
  process.exit(1);
});
