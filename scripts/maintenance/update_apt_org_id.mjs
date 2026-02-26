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
  const orgId = '11111111-1111-1111-1111-111111111111';
  const orgsToUpdate = ['default', 'org-default'];
  
  for (const oldOrgId of orgsToUpdate) {
    const appointments = await db.collection('appointments').where('organizationId', '==', oldOrgId).get();
    console.log(`Found appointments with ${oldOrgId} orgId:`, appointments.size);
    for (const doc of appointments.docs) {
      await doc.ref.update({
        organizationId: orgId,
        organization_id: orgId
      });
    }

    const patients = await db.collection('patients').where('organizationId', '==', oldOrgId).get();
    console.log(`Found patients with ${oldOrgId} orgId:`, patients.size);
    for (const doc of patients.docs) {
      await doc.ref.update({
        organizationId: orgId,
        organization_id: orgId
      });
    }
  }
}

fix().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
