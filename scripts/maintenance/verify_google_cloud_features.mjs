import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Configuration
const PROJECT_ID = 'fisioflow-migration';
const REGION = 'southamerica-east1';
const WEB_API_KEY = 'AIzaSyCz2c3HvQoV7RvFCbCaudbEEelEQaO-tY8'; 
const CLOUD_RUN_URL = 'https://fisioflow-image-worker-412418905255.southamerica-east1.run.app';
const FUNCTION_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/generateExercisePlan`;

// Initialize App
try {
    admin.initializeApp({ projectId: PROJECT_ID });
} catch (e) {
    if (e.code !== 'app/already-exists') throw e;
}

async function verify() {
    console.log('🚀 Starting Verification of Google Cloud Features...');

    // 1. Get Auth Token
    console.log('\n🔐 1. Authenticating...');
    let idToken;
    try {
        const uid = 'test-verifier';
        // Note: This requires a Service Account with Token Creator permissions. 
        // In Cloud Shell or some envs, this might fail without explicit credentials.
        const customToken = await admin.auth().createCustomToken(uid);
        
        // Exchange for ID Token
        const exchangeResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: customToken, returnSecureToken: true })
        });
        
        const exchangeData = await exchangeResponse.json();
        if (exchangeData.error) throw new Error(exchangeData.error.message);
        idToken = exchangeData.idToken;
        console.log('✅ ID Token acquired.');
    } catch (e) {
        console.error('❌ Authentication failed:', e.message);
        console.log('⚠️ Skipping authenticated function test.');
    }

    // 2. Test Genkit Function
    if (idToken) {
        console.log('\n🧠 2. Testing Genkit AI Function (generateExercisePlan)...');
        try {
            const input = {
                data: {
                    patientName: 'João Silva',
                    condition: 'Dor Lombar Crônica',
                    painLevel: 4,
                    equipment: ['Colchonete'],
                    goals: 'Reduzir dor',
                    limitations: 'Evitar impacto'
                }
            };

            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(input)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ AI Response received:', JSON.stringify(data.result || data, null, 2));
        } catch (e) {
            console.error('❌ AI Function failed:', e.message);
        }
    }

    // 3. Test Cloud Run Worker
    console.log('\n⚡ 3. Testing Cloud Run Worker...');
    try {
        const response = await fetch(CLOUD_RUN_URL); // Health check GET /
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log('✅ Worker Health Check:', data);
        
        // Test Process Endpoint (Mock)
        const processResponse = await fetch(`${CLOUD_RUN_URL}/process-dicom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gcs_path: 'gs://bucket/image.dcm' })
        });
        
        const processData = await processResponse.json();
        console.log('✅ Worker Process Test:', processData);

    } catch (e) {
        console.error('❌ Cloud Run Worker failed:', e.message);
    }

    console.log('\n🎉 Verification Complete.');
    process.exit(0);
}

verify();