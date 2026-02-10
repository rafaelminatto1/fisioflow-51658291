const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function runMigration() {
  console.log('Starting migration to Custom Claims...');
  const profilesRef = admin.firestore().collection('profiles');
  const auth = admin.auth();
  
  const snapshot = await profilesRef.get();
  console.log(`Found ${snapshot.size} profiles.`);
  
  let success = 0;
  let failed = 0;
  
  for (const doc of snapshot.docs) {
    const profile = doc.data();
    const uid = doc.id;
    const role = profile.role;
    const organizationId = profile.organization_id;
    
    if (!role) continue;
    
    try {
      const userRecord = await auth.getUser(uid);
      const currentClaims = userRecord.customClaims || {};
      
      const newClaims = {
        ...currentClaims,
        role: role,
        organizationId: organizationId || null,
        isProfessional: ['fisioterapeuta', 'estagiario', 'owner', 'admin'].includes(role),
        isAdmin: role === 'admin' || currentClaims.admin === true
      };
      
      await auth.setCustomUserClaims(uid, newClaims);
      success++;
      console.log(`[${success}/${snapshot.size}] Updated ${uid} -> ${role}`);
    } catch (e) {
      console.error(`Error updating ${uid}:`, e.message);
      failed++;
    }
  }
  
  console.log(`Migration finished. Success: ${success}, Failed: ${failed}`);
  process.exit(0);
}

runMigration();
