
const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function listMissingVideos() {
    console.log('Fetching...');
    const snapshot = await db.collection('exercises').get();
    console.log('Got ' + snapshot.size + ' exercises');
    const missing = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.video_url) {
            missing.push({ id: doc.id, name: data.name, imageUrl: data.image_url });
        }
    });
    console.log('MISSING_DATA_START');
    console.log(JSON.stringify(missing, null, 2));
    console.log('MISSING_DATA_END');
    process.exit(0);
}
listMissingVideos().catch(e => { console.error(e); process.exit(1); });
