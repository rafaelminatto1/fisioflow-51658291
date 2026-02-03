const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'fisioflow-migration'
});

const db = admin.firestore();

async function updatePatients() {
  const batch = db.batch();
  const snap = await db.collection('patients').limit(400).get();
  console.log('Found', snap.size, 'patients');
  
  snap.forEach(doc => {
    batch.update(doc.ref, {
      organizationId: 'default',
      activeOrganizationId: 'default'
    });
  });
  
  await batch.commit();
  console.log('✅ Updated', snap.size, 'patients with organizationId: default');
}

updatePatients().then(() => process.exit(0));
