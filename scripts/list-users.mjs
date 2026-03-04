/**
 * Lists all registered users.
 * Usage: node scripts/list-users.mjs
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const snap = await db.collection('users').get();
if (snap.empty) {
  console.log('No users registered yet.');
} else {
  console.log(`${snap.size} user(s) found:\n`);
  snap.docs.forEach((d) => {
    const u = d.data();
    console.log(`  - ${u.email} | role: ${u.role} | name: ${u.displayName || '(none)'} | uid: ${d.id}`);
  });
}
process.exit(0);
