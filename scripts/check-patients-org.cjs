const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'fisioflow-migration'
});

const db = admin.firestore();

async function checkPatients() {
  const snap = await db.collection('patients').limit(5).get();
  console.log('Patients count:', snap.size);
  snap.forEach(doc => {
    const p = doc.data();
    console.log('Patient:', p.name || p.full_name);
    console.log('  organizationId:', p.organizationId);
    console.log('  activeOrganizationId:', p.activeOrganizationId);
    console.log('  org-default:', p['org-default']);
  });
}

checkPatients().then(() => process.exit(0));
