
const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const videoUpdates = [
    { name: 'Flexão de Punho com Halter', url: 'https://www.youtube.com/watch?v=ETxgQQ1STci' },
    { name: 'Rotação Torácica em 4 Apoios', url: 'https://www.youtube.com/watch?v=FMqlB39k_D0' },
    { name: 'Oposição de Dedos', url: 'https://www.youtube.com/watch?v=EW_XtXkD0Yy' },
    { name: 'Deslocamento Lateral (Shuffle)', url: 'https://www.youtube.com/watch?v=Hk9Zp6UX3Kp' },
    { name: 'Desvio Radial', url: 'https://www.youtube.com/watch?v=pgZVjtTOfDV' },
    { name: 'Elevação de Panturrilha em Degrau', url: 'https://www.youtube.com/watch?v=EqqgZJTvmtn' },
    { name: 'Flexão de Braço na Parede', url: 'https://www.youtube.com/watch?v=HvZBLpSZ5Wg' },
    { name: 'Elevação de Calcanhar Sentado', url: 'https://www.youtube.com/watch?v=Gp7NCnTKbzj' },
    { name: 'Extensão de Cotovelo com Garrafa', url: 'https://www.youtube.com/watch?v=6_Ngppa6kz3' },
    { name: 'Polichinelo Adaptado', url: 'https://www.youtube.com/watch?v=SIrZwbV1v0i' },
    { name: 'Step Touch com Braços', url: 'https://www.youtube.com/watch?v=26Z6rxmGWmo' },
    { name: 'Corner Stretch (Alongamento no Canto)', url: 'https://www.youtube.com/watch?v=CefFedA3g-m' }
];

async function updateVideos() {
    const exercisesSnapshot = await db.collection('exercises').get();
    const exercises = {};
    exercisesSnapshot.forEach(doc => {
        exercises[doc.data().name] = doc.id;
    });

    for (const update of videoUpdates) {
        const exerciseId = exercises[update.name];
        if (!exerciseId) {
            console.warn(`Exercise not found: ${update.name}`);
            continue;
        }

        console.log(`Updating video for ${update.name}...`);
        await db.collection('exercises').doc(exerciseId).update({
            video_url: update.url
        });
    }

    console.log('Video updates completed successfully.');
    process.exit(0);
}

updateVideos().catch(e => {
    console.error(e);
    process.exit(1);
});
