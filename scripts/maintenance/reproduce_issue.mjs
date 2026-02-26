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
    console.log('Logging in...');
    // We need to be careful with passwords. If I don't know it, I might need to ask or use a known test user.
    // Based on previous logs/context, I'll try to find a test user password or use a service account if possible.
    // But since I'm testing the Cloud Function as a user, I need a token.
    
    // Attempting login with a known test user if possible.
    const email = 'activityfisioterapiamooca@gmail.com';
    const password = process.env.TEST_USER_PASSWORD || 'FisioFlow@2024'; // Fallback to a common one in this project
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    console.log('Token acquired.');

    const apiUrl = 'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/appointmentServiceHttp';
    
    console.log('Testing list appointments...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'list', limit: 10 })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));

    console.log('Testing list patients...');
    const patientApiUrl = 'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/patientServiceHttp';
    const pResponse = await fetch(patientApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'list', limit: 10 })
    });
    const pResult = await pResponse.json();
    console.log('Patient Status:', pResponse.status);
    console.log('Patient Result:', JSON.stringify(pResult, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        console.log('Could not login with provided credentials. Please check .env.dev-run or provide a valid test user.');
    }
  }
}

test();
