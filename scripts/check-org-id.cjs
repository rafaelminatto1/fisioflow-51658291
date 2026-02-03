const { getFirebaseAdmin } = require('./lib/firebase-admin-helper.cjs');

const { db } = getFirebaseAdmin();

async function checkSpecificOrg() {
  const targetOrgId = '11111111-1111-1111-1111-111111111111';
  const patientOrgId = 'org-default';
  
  console.log('Verificando organization ID do usuário:', targetOrgId);
  const userOrgDoc = await db.collection('organizations').doc(targetOrgId).get();
  console.log('  - Existe:', userOrgDoc.exists);
  if (userOrgDoc.exists) {
    console.log('  - Nome:', userOrgDoc.data().name || 'N/A');
  }
  
  console.log('\nVerificando organization ID dos pacientes:', patientOrgId);
  const patientOrgDoc = await db.collection('organizations').doc(patientOrgId).get();
  console.log('  - Existe:', patientOrgDoc.exists);
  if (patientOrgDoc.exists) {
    console.log('  - Nome:', patientOrgDoc.data().name || 'N/A');
  }
  
  console.log('\nTodas as organizações no banco:');
  const allOrgs = await db.collection('organizations').listDocuments();
  for (const orgRef of allOrgs) {
    const orgDoc = await orgRef.get();
    if (orgDoc.exists) {
      console.log('  -', orgRef.id, ':', orgDoc.data().name || 'Sem nome');
    }
  }
  
  process.exit(0);
}

checkSpecificOrg().catch(err => { console.error(err); process.exit(1); });
