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

const db = admin.firestore();

async function fix() {
  const collections = ['appointments', 'patients'];
  const oldOrgId = '11111111-1111-1111-1111-111111111111'; // Placeholder or old ID
  // Actually, since I found 0 for this ID, maybe they are missing organizationId entirely 
  // or have a different one.
  
  // Let's find some patients and see their orgId.
  const patSnap = await db.collection('patients').limit(5).get();
  patSnap.forEach(doc => {
      console.log('Patient:', doc.id, 'OrgId:', doc.data().organizationId || doc.data().organization_id);
  });
}

fix().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
