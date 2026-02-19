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
  const email = 'activityfisioterapiamooca@gmail.com';
  const user = await admin.auth().getUserByEmail(email);
  console.log('User UID:', user.uid);
  
  const orgId = '11111111-1111-1111-1111-111111111111';
  
  await db.collection('profiles').doc(user.uid).set({
      user_id: user.uid,
      email: email,
      organizationId: orgId,
      activeOrganizationId: orgId,
      organization_id: orgId,
      role: 'admin',
      displayName: 'Rafael Minatto De Martino',
      name: 'Rafael Minatto De Martino'
  }, { merge: true });
  
  console.log('Profile fixed in Firestore.');
}

fix().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
