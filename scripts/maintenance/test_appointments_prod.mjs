import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Try to read .env config manually or use dotenv
dotenv.config();

const envContent = readFileSync('.env.production.example', 'utf-8');
const extractEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}="(.*?)"`));
    return match ? match[1] : '';
};

// Use the production keys present in .env.production.example for the app
const firebaseConfig = {
    apiKey: extractEnv('VITE_FIREBASE_API_KEY') || process.env.VITE_FIREBASE_API_KEY,
    authDomain: extractEnv('VITE_FIREBASE_AUTH_DOMAIN') || process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: extractEnv('VITE_FIREBASE_PROJECT_ID') || process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: extractEnv('VITE_FIREBASE_STORAGE_BUCKET') || process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: extractEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: extractEnv('VITE_FIREBASE_APP_ID') || process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
    try {
        const email = 'rafael.minatto@yahoo.com.br';
        const password = 'Yukari30@';

        console.log('Logging in as', email, '...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        console.log('Token acquired.');

        // Step 1: List Appointments
        console.log('Listing appointments...');
        const aptUrl = 'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/appointmentServiceHttp';

        // Testing with a specific dateFrom and dateTo
        const dateFrom = '2026-02-15';
        const dateTo = '2026-02-21';

        console.log('Fetching with dateFrom:', dateFrom, 'and dateTo:', dateTo);

        const reqBody = {
            action: 'list',
            dateFrom,
            dateTo,
            limit: 100
        };

        console.log('Request payload:', reqBody);

        const aptRes = await fetch(aptUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqBody)
        });

        console.log('Response status:', aptRes.status);
        const responseText = await aptRes.text();

        try {
            const aptData = JSON.parse(responseText);
            console.log('Appointments Count:', aptData.data?.length || 0);
            if (aptData.data && aptData.data.length > 0) {
                console.log('First appointment:', JSON.stringify(aptData.data[0], null, 2));
            } else {
                console.log('Full JSON Response:', JSON.stringify(aptData, null, 2));
            }
        } catch (e) {
            console.log('Failed to parse response as JSON. Raw text:');
            console.log(responseText.substring(0, 500));
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

test();
