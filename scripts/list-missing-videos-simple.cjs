
const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listMissing() {
    console.log('Fetching exercises...');
    try {
        const snapshot = await db.collection('exercises').get();
        if (snapshot.empty) {
            console.log('No matching documents.');
            return;
        }

        let missingCount = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.video_url) {
                console.log(`MISSING: ${data.name} (ID: ${doc.id})`);
                missingCount++;
            }
        });
        console.log(`Total missing: ${missingCount}`);
    } catch (err) {
        console.error('Error getting documents', err);
    }
}

listMissing().then(() => process.exit(0));
