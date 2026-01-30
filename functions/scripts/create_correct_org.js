const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createOrganization() {
  try {
    const orgRef = db.collection('organizations').doc('ebe5dd27-f4e4-48b4-bd81-1b45b0bd3c02');

    await orgRef.set({
      name: 'Clínica Principal',
      slug: 'clinica-principal',
      active: true,
      email: 'rafael.minatto@yahoo.com.br',
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
