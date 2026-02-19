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
  const targetOrgId = '11111111-1111-1111-1111-111111111111';
  
  const pSnap = await db.collection('patients').get();
  console.log('Total patients:', pSnap.size);
  for (const doc of pSnap.docs) {
      if (doc.data().organizationId !== targetOrgId) {
          await doc.ref.update({ organizationId: targetOrgId, organization_id: targetOrgId });
      }
  }

  const aSnap = await db.collection('appointments').get();
  console.log('Total appointments:', aSnap.size);
  for (const doc of aSnap.docs) {
      if (doc.data().organizationId !== targetOrgId) {
          await doc.ref.update({ organizationId: targetOrgId, organization_id: targetOrgId });
      }
  }
}

fix().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
