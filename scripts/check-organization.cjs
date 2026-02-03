const { getFirebaseAdmin } = require('./lib/firebase-admin-helper.cjs');

const { db } = getFirebaseAdmin();

async function checkOrgs() {
  // Check organizations
  const orgsSnapshot = await db.collection('organizations').limit(5).get();
  console.log('Organizações encontradas:', orgsSnapshot.size);
  
  orgsSnapshot.forEach(doc => {
    const org = doc.data();
    console.log('  - ID:', doc.id);
    console.log('    Nome:', org.name || 'N/A');
    console.log('    Owner:', org.ownerId || org.owner_email || 'N/A');
  });
  
  // Check users collection for Rafael
  const usersSnapshot = await db.collection('users')
    .where('email', '==', 'rafael.minatto@yahoo.com.br')
    .limit(1)
    .get();
  
  console.log('\nUsuário rafael.minatto@yahoo.com.br:');
  if (usersSnapshot.size > 0) {
    const user = usersSnapshot.docs[0].data();
    console.log('  - ID:', usersSnapshot.docs[0].id);
    console.log('  - Organization ID:', user.organizationId || user.organization_id || 'N/A');
    console.log('  - Role:', user.role || 'N/A');
  } else {
    console.log('  Não encontrado em users!');
  }
  
  // Check profiles collection
  const profilesSnapshot = await db.collection('profiles')
    .where('email', '==', 'rafael.minatto@yahoo.com.br')
    .limit(1)
    .get();
  
  console.log('\nProfile rafael.minatto@yahoo.com.br:');
  if (profilesSnapshot.size > 0) {
    const profile = profilesSnapshot.docs[0].data();
    console.log('  - ID:', profilesSnapshot.docs[0].id);
    console.log('  - Organization ID:', profile.organizationId || profile.organization_id || 'N/A');
    console.log('  - Role:', profile.role || 'N/A');
  } else {
    console.log('  Não encontrado em profiles!');
  }
  
  // Check if patients have organizationId
  console.log('\nVerificando pacientes e seus organizationId:');
  const patientsSnapshot = await db.collection('patients').limit(5).get();
  patientsSnapshot.forEach(doc => {
    const patient = doc.data();
    const name = patient.name || patient.full_name || 'N/A';
    const shortId = doc.id.substring(0, 8);
    const orgId = patient.organizationId || patient.organization_id || 'N/A';
    console.log('  - ' + name + ' (ID: ' + shortId + '...)');
    console.log('    organizationId:', orgId);
  });
  
  process.exit(0);
}

checkOrgs().catch(err => { console.error(err); process.exit(1); });
