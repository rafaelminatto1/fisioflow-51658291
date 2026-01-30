const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateProfileOrganization() {
  try {
    // Get the Firebase Auth UID from the profile document
    const profileRef = db.collection('profiles').doc('sj9b11xOjPT8Q34pPHBMUIPzvQQ2');
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      console.log('Profile document does not exist, creating it...');
      await profileRef.set({
        user_id: 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2',
        email: 'rafael.minatto@yahoo.com.br',
        full_name: 'Rafael Minatto De Martino',
        role: 'admin',
        organization_id: 'ebe5dd27-f4e4-48b4-bd81-1b45b0bd3c02',
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Profile document created successfully!');
    } else {
      console.log('Profile document exists, updating organization_id...');
      await profileRef.update({
        organization_id: 'ebe5dd27-f4e4-48b4-bd81-1b45b0bd3c02',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Profile organization_id updated successfully!');
    }

    // Verify
    const doc = await profileRef.get();
    if (doc.exists) {
      console.log('Document data:', doc.data());
    }
  } catch (error) {
    console.error('Error updating profile:', error);
  }
}

updateProfileOrganization().then(() => process.exit(0));
