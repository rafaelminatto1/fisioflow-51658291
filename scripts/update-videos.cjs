
const admin = require('firebase-admin');
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const videoUpdates = [
    { name: 'Heel Flicks (Calcanhar no Glúteo)', url: 'https://www.youtube.com/watch?v=VENG1fXDjs4' },
    { name: 'Alcance em Y (Y-Balance Practice)', url: 'https://www.youtube.com/watch?v=i4k2pa53a20' },
    { name: 'Eversão de Tornozelo com Faixa', url: 'https://www.youtube.com/watch?v=-XHzgimYeiA' },
    { name: 'Fortalecimento de Preensão (Bolinha)', url: 'https://www.youtube.com/watch?v=6jKb78nSU6Y' },
    { name: 'Ponte com Uma Perna', url: 'https://www.youtube.com/watch?v=HmxvYqmPXfk' },
    { name: 'Marcha Estacionária Alta', url: 'https://www.youtube.com/watch?v=dzN8I3ap47U' },
    { name: 'Abdução de Quadril Deitado', url: 'https://www.youtube.com/watch?v=XKC3RZ_MrqI' },
    { name: 'Salto Unilateral na Caixa', url: 'https://www.youtube.com/watch?v=LDU_yVvp7pA' },
    { name: 'Isometria Cervical (Inclinção Lateral)', url: 'https://www.youtube.com/watch?v=5rH9yHqRVSs' },
    { name: 'Caminhada nos Calcanhares', url: 'https://www.youtube.com/watch?v=ZQVWy_MuTJg' },
    { name: 'Passos Laterais com Faixa', url: 'https://www.youtube.com/watch?v=xGcGvoaq854' },
    { name: 'Copenhagen Plank', url: 'https://www.youtube.com/watch?v=YRRnnZsRs9U' },
    { name: 'Mobilidade do Hálux', url: 'https://www.youtube.com/watch?v=a_hmiePqFAQ' },
    { name: 'Exercício do Pé Curto (Short Foot)', url: 'https://www.youtube.com/watch?v=S9m9kcasu3g' },
    { name: 'Afundo Reverso', url: 'https://www.youtube.com/watch?v=mUvbDSFffE4' },
    { name: 'Nordic Hamstring Curl', url: 'https://www.youtube.com/watch?v=QjX2HXlFH1M' }
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
