const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createOrganization() {
  try {
    const orgRef = db.collection('organizations').doc('default-org');

    await orgRef.set({
      name: 'Clínica Principal',
      slug: 'default-org',
      active: true,
      email: 'admin@fisioflow.com.br',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Organization document created successfully!');

    // Verify
    const doc = await orgRef.get();
    if (doc.exists) {
      console.log('Document data:', doc.data());
    }
  } catch (error) {
    console.error('Error creating organization:', error);
  }
}

createOrganization().then(() => process.exit(0));
