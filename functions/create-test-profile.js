const admin = require('./node_modules/firebase-admin');

// Connect to Firestore emulator - MUST be set before initializing
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// For emulator, use a mock credential
admin.initializeApp({
  projectId: 'fisioflow-migration',
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();
db.settings({
  host: 'localhost:8080',
  ssl: false
});

async function createTestProfile() {
  try {
    const docRef = db.collection('profiles').doc('testUser');
    await docRef.set({
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin',
      organization_id: 'test-org',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Profile created successfully!');
    
    // Also create an organization
    const orgRef = db.collection('organizations').doc('test-org');
    await orgRef.set({
      name: 'Test Organization',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Organization created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating profile:', error.message);
    process.exit(1);
  }
}

createTestProfile();
