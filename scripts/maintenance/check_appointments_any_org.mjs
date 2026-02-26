import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
  await readFile('./fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function check() {
  const snap = await admin.firestore().collection('appointments').limit(5).get();
  console.log('Any appointments in Firestore:', snap.size);
  snap.forEach(doc => {
      console.log('Apt:', doc.id, 'OrgId:', doc.data().organizationId || doc.data().organization_id);
  });
}

check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
