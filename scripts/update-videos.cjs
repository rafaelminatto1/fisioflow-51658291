
const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const videoUpdates = [
    { name: 'Alongamento de Piriforme (4 Supino)', url: 'https://www.youtube.com/watch?v=AYKYKmTsv0w' },
    { name: 'Rotação de Ombro com Toalha', url: 'https://www.youtube.com/watch?v=omeww85Mhkw' },
    { name: 'Extensão de Punho com Halter', url: 'https://www.youtube.com/watch?v=N2PYcttGDG0' },
    { name: 'Pallof Press', url: 'https://www.youtube.com/watch?v=_2xWmYNnFS8' },
    { name: 'Mobilização Cervical com Toalha', url: 'https://www.youtube.com/watch?v=rxYEHsf_hsQ' },
    { name: 'Saltos Laterais (Skater Hops)', url: 'https://www.youtube.com/watch?v=9_jLW6VkU8A' },
    { name: 'Inversão de Tornozelo com Faixa', url: 'https://www.youtube.com/watch?v=DOjpPIW2ukQ' },
    { name: 'Alongamento de Peitoral no Canto', url: 'https://www.youtube.com/watch?v=SdjsqyTiHcc' },
    { name: 'Mergulho no Banco (Tríceps)', url: 'https://www.youtube.com/watch?v=dl8_opV0A0Y' },
    { name: 'Alongamento Levantador da Escápula', url: 'https://www.youtube.com/watch?v=GSoXPJRnR6E' },
    { name: 'Apoio Unipodal Olhos Fechados', url: 'https://www.youtube.com/watch?v=okRFJ_1GmqY' },
    { name: 'Deslizamento do Nervo Mediano', url: 'https://www.youtube.com/watch?v=8M9r5woO2qY' }
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
