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
  const orgId = '11111111-1111-1111-1111-111111111111';
  const snap = await admin.firestore().collection('appointments')
    .where('organizationId', '==', orgId)
    .limit(5)
    .get();
    
  console.log('Appointments in Firestore for org:', snap.size);
  
  const snap2 = await admin.firestore().collection('patients')
    .where('organizationId', '==', orgId)
    .limit(5)
    .get();
    
  console.log('Patients in Firestore for org:', snap2.size);
}

check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
