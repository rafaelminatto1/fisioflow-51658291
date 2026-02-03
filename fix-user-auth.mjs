import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./functions/service-account-key.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const uid = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';

async function fix() {
    try {
        // 1. Update Firestore Profile
        await db.collection('profiles').doc(uid).set({
            role: 'admin',
            organization_id: 'default-org',
            full_name: 'Rafael (Admin)',
            is_active: true,
            updated_at: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Profile updated in Firestore');

        // 2. Set Custom Claims
        await admin.auth().setCustomUserClaims(uid, { role: 'admin', organizationId: 'default-org' });
        console.log('✅ Custom claims updated');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fix();
