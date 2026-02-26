import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
  await readFile('./fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fix() {
  const userId = 'G009mE183WST70GgS07XQO1K0Yp1'; // My assumed UID or a test UID
  // Let's find the current user UID first if possible or just use the one from the request.
  // Since I can't easily get the UID without logging in, I'll search for the profile by email.
  
  const email = 'activityfisioterapiamooca@gmail.com';
  const profilesSnap = await db.collection('profiles').where('email', '==', email).get();
  
  if (profilesSnap.empty) {
    console.log('Profile not found for email:', email);
    // Create it?
    const orgId = '11111111-1111-1111-1111-111111111111';
    // I need the actual UID from Firebase Auth.
    const user = await admin.auth().getUserByEmail(email);
    console.log('Found user in Auth:', user.uid);
    
    await db.collection('profiles').doc(user.uid).set({
        email: email,
        organizationId: orgId,
        role: 'admin',
        displayName: 'Activity Fisioterapia'
    }, { merge: true });
    console.log('Profile created/updated for UID:', user.uid);
  } else {
    for (const doc of profilesSnap.docs) {
      console.log('Updating profile:', doc.id);
      await doc.ref.update({
        organizationId: '11111111-1111-1111-1111-111111111111'
      });
    }
    console.log('Profiles updated.');
  }
}

fix().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
