import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch';

const serviceAccount = JSON.parse(
  await readFile('./fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function test() {
  const email = 'activityfisioterapiamooca@gmail.com';
  const user = await admin.auth().getUserByEmail(email);
  console.log('User UID:', user.uid);
  
  // Create a custom token (though the API expects ID Token, we can't easily get an ID token without password)
  // But wait, I can use the Admin SDK to verify what's happening in the DB directly.
  
  // Let's try to find out the organizationId for this user in PostgreSQL via the getProfile function logic
  // but let's just use the Admin SDK to verify the profile.
  const profile = await admin.firestore().collection('profiles').doc(user.uid).get();
  console.log('Profile data:', profile.data());
}

test().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
