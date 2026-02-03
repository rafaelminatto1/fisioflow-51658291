/**
 * Fix organization ID mismatch between user and patients
 * Run: node scripts/fix-organization-id.cjs
 */

const admin = require('firebase-admin');

// Get service account from environment or use default
const serviceAccountKey = {
  "type": "service_account",
  "project_id": "fisioflow-migration",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID || "",
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
  "client_email": process.env.FIREBASE_CLIENT_EMAIL || ""
};

if (!serviceAccountKey.private_key) {
  console.error('Firebase credentials not found. Using gcloud application default credentials...');
  // Try to use gcloud ADC
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'fisioflow-migration'
  });
} else {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    projectId: 'fisioflow-migration'
  });
}

const db = admin.firestore();

async function fixOrganizationId() {
  const userEmail = 'rafael.minatto@yahoo.com.br';

  try {
    // 1. Get the user's profile
    const profileRef = db.collection('profiles').doc(userEmail);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      console.error('User profile not found:', userEmail);
      return;
    }

    const profile = profileSnap.data();
    console.log('Current user org IDs:', {
      organizationId: profile.organizationId,
      activeOrganizationId: profile.activeOrganizationId,
      organizationIds: profile.organizationIds
    });

    // 2. Check if user is in the 'default' organization
    const orgRef = db.collection('organizations').doc('default');
    const orgSnap = await orgRef.get();

    if (orgSnap.exists) {
      console.log('Organization "default" exists');
    } else {
      console.log('Creating organization "default"...');
      await orgRef.set({
        id: 'default',
        name: 'Default Organization',
        slug: 'default',
        createdAt: new Date().toISOString()
      });
    }

    // 3. Update user's profile to use 'default' organization
    console.log('Updating user profile to use "default" organization...');
    await profileRef.update({
      organizationId: 'default',
      activeOrganizationId: 'default',
      organizationIds: admin.firestore.FieldValue.arrayUnion(['default'])
    });

    console.log('✅ User profile updated successfully');
    console.log('New organization ID: default');
    console.log('');
    console.log('Please refresh your browser (Ctrl+Shift+R) to see the changes.');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

fixOrganizationId()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
