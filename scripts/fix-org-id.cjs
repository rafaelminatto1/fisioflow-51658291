const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'fisioflow-migration'
});

const db = admin.firestore();
const auth = admin.auth();

async function fixOrganizationId() {
  try {
    const userEmail = 'rafael.minatto@yahoo.com.br';
    const userRecord = await auth.getUserByEmail(userEmail);
    const uid = userRecord.uid;
    console.log('Found user UID:', uid);

    const profileRef = db.collection('profiles').doc(uid);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      console.log('Profile not found, creating...');
      await profileRef.set({
        uid: uid,
        email: userEmail,
        organizationId: 'default',
        activeOrganizationId: 'default',
        organizationIds: ['default'],
        createdAt: new Date().toISOString()
      });
    } else {
      console.log('Profile found, updating...');
      const profile = profileSnap.data();
      console.log('Current org:', profile.organizationId);
      
      await profileRef.update({
        organizationId: 'default',
        activeOrganizationId: 'default'
      });
    }

    // Ensure organization exists
    const orgRef = db.collection('organizations').doc('default');
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      console.log('Creating organization "default"...');
      await orgRef.set({
        id: 'default',
        name: 'Default Organization',
        slug: 'default',
        createdAt: new Date().toISOString()
      });
    }

    console.log('✅ Done! User now belongs to "default" organization.');
    console.log('Refresh your browser to see changes.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixOrganizationId().then(() => process.exit(0));
