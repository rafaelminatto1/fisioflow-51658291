import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const email = 'rafael.minatto@yahoo.com.br';

async function run() {
  try {
    const serviceAccount = JSON.parse(
      await readFile('./fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json', 'utf8')
    );

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const authUser = await admin.auth().getUserByEmail(email);
    console.log('✅ Auth User found:', authUser.uid, 'Roles:', authUser.customClaims);

    const profileSnap = await admin.firestore().collection('profiles').doc(authUser.uid).get();
    if (!profileSnap.exists) {
      console.log('❌ Profile not found for UID:', authUser.uid);
      process.exit(1);
    }
    const profile = profileSnap.data();
    console.log('✅ Profile found. Data:', JSON.stringify(profile, null, 2));

    const orgId = profile.organization_id || profile.organizationId;
    if (!orgId) {
      console.log('❌ No organization_id in profile!');
    } else {
      console.log('✅ Organization ID:', orgId);
      
      const aptsSnap = await admin.firestore().collection('appointments')
        .where('organization_id', '==', orgId)
        .limit(10)
        .get();
        
      console.log(`✅ Found ${aptsSnap.size} appointments for this org.`);
      if (aptsSnap.size > 0) {
        console.log('Sample appointment:');
        aptsSnap.forEach(doc => {
          console.log(doc.id, '->', doc.data());
        });
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
