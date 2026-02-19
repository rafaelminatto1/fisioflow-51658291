import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.dev-run' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    const email = 'activityfisioterapiamooca@gmail.com';
    const password = process.env.TEST_USER_PASSWORD || 'FisioFlow@2024';
    
    console.log('Logging in...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    console.log('Token acquired.');

    // Step 1: Get Profile
    console.log('Fetching profile...');
    const profileUrl = 'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/getProfile';
    const profileRes = await fetch(profileUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    const profileData = await profileRes.json();
    console.log('Profile Response:', JSON.stringify(profileData, null, 2));

    if (profileData.error) {
        console.error('Stop: Profile error');
        return;
    }

    const orgId = profileData.organization_id || profileData.data?.organization_id;
    console.log('Organization ID:', orgId);

    // Step 2: List Appointments
    console.log('Listing appointments...');
    const aptUrl = 'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/appointmentServiceHttp';
    const aptRes = await fetch(aptUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', limit: 10 })
    });
    const aptData = await aptRes.json();
    console.log('Appointments Count:', aptData.data?.length || 0);

    // Step 3: List Patients
    console.log('Listing patients...');
    const patUrl = 'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/patientServiceHttp';
    const patRes = await fetch(patUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', limit: 10 })
    });
    const patData = await patRes.json();
    console.log('Patients Count:', patData.data?.length || 0);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

test();
