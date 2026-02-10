
import { Firestore } from '@google-cloud/firestore';

async function dumpMediaData() {
    const db = new Firestore({ projectId: 'fisioflow-migration' });
    const snapshot = await db.collection('exercises').get();

    const results = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
            id: doc.id,
            name: data.name,
            image_url: data.image_url || data.thumbnail_url || data.imageUrl || '',
            video_url: data.video_url || data.videoUrl || ''
        });
    });

    console.log(JSON.stringify(results, null, 2));
}

dumpMediaData().catch(console.error);
