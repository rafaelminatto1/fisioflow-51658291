
const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const videoUpdates = [
    { name: 'Tuck Jump (Salto Grupard)', url: 'https://www.youtube.com/watch?v=r7oBejx1PHM' },
    { name: 'Salto Lateral (Lateral Bound)', url: 'https://www.youtube.com/watch?v=Hc9_FQgIeeg' },
    { name: 'Postura da Criança', url: 'https://www.youtube.com/watch?v=bUibpFGSSnI' },
    { name: 'Alongamento de Sóleo na Parede', url: 'https://www.youtube.com/watch?v=MeKOWx5oWRc' },
    { name: 'Chin Tucks', url: 'https://www.youtube.com/watch?v=1v9e8PdmqEI' },
    { name: 'Rotação Torácica Sentado', url: 'https://www.youtube.com/watch?v=pLerj04KsHw' },
    { name: 'Pular Corda Imaginária', url: 'https://www.youtube.com/watch?v=-q2_qGMp8Us' },
    { name: 'Descida Controlada de Degrau', url: 'https://www.youtube.com/watch?v=Or4C-UQ63Xc' },
    { name: 'Coordenação Cruzada (Cross Crawl)', url: 'https://www.youtube.com/watch?v=7NsZPmYbebs' },
    { name: 'Agachamento Goblet', url: 'https://www.youtube.com/watch?v=ge1vdJRP0UA' },
    { name: 'Círculos de Quadril', url: 'https://www.youtube.com/watch?v=Ky-vjymbfCE' },
    { name: 'Scorpion Stretch', url: 'https://www.youtube.com/watch?v=fEonF-SVkdk' }
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
