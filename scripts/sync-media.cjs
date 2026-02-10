
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'fisioflow-migration.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const fileMapping = {
    'ab_wheel_rollout_gen_1768820642865.avif': 'Ab Wheel Rollout',
    'broad_jump_gen_1768820584384.avif': 'Salto Horizontal (Broad Jump)',
    'cross_crawl_gen_1768820784162.avif': 'Coordenação Cruzada (Cross Crawl)',
    'hanging_leg_raise_gen_1768820628800.avif': 'Elevação de Pernas na Barra',
    'heel_flicks_gen_1768820844797.avif': 'Heel Flicks (Calcanhar no Glúteo)',
    'high_knees_march_gen_1768820724799.avif': 'Marcha Estacionária Alta',
    'hollow_rock_gen_1768820657455.avif': 'Hollow Rock (Canoa)',
    'imaginary_jump_rope_gen_1768820815347.avif': 'Pular Corda Imaginária',
    'lateral_shuffle_gen_1768820769599.avif': 'Deslocamento Lateral (Shuffle)',
    'l_sit_gen_1768820686881.avif': 'L-Sit (Sustentação em L)',
    'med_ball_slam_gen_1768820613893.avif': 'Medicine Ball Slam',
    'shadow_boxing_gen_1768820738489.avif': 'Boxe de Sombra (Shadow Boxing)',
    'single_leg_box_jump_gen_1768820569698.avif': 'Salto Unilateral na Caixa',
    'squat_punch_gen_1768820753787.avif': 'Agachamento com Soco',
    'stepping_jacks_gen_1768820700928.avif': 'Polichinelo Adaptado',
    'step_touch_arms_gen_1768820830506.avif': 'Step Touch com Braços',
    'tuck_jump_gen_1768820599504.avif': 'Tuck Jump (Salto Grupard)',
    'v_up_exercise_gen_1768820672556.avif': 'V-Up (Abdominal Canivete)',
    'wall_climber_gen_1768820800501.avif': 'Escalada na Parede (Wall Climber)'
};

async function uploadAndSync() {
    const exercisesSnapshot = await db.collection('exercises').get();
    const exercises = {};
    exercisesSnapshot.forEach(doc => {
        exercises[doc.data().name] = doc.id;
    });

    for (const [filename, exerciseName] of Object.entries(fileMapping)) {
        const exerciseId = exercises[exerciseName];
        if (!exerciseId) {
            console.warn(`Exercise not found: ${exerciseName}`);
            continue;
        }

        const localPath = path.join(process.cwd(), filename);
        if (!fs.existsSync(localPath)) {
            console.warn(`Local file not found: ${localPath}`);
            continue;
        }

        const destination = `exercise-media/${exerciseId}/image.avif`;
        console.log(`Uploading ${filename} to ${destination}...`);

        await bucket.upload(localPath, {
            destination,
            metadata: {
                contentType: 'image/avif',
            }
        });

        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/fisioflow-migration.firebasestorage.app/o/exercise-media%2F${exerciseId}%2Fimage.avif?alt=media`;

        console.log(`Updating Firestore for ${exerciseName}...`);
        await db.collection('exercises').doc(exerciseId).update({
            image_url: publicUrl,
            thumbnail_url: publicUrl // Also update thumbnail_url just in case
        });
    }

    console.log('Sync completed successfully.');
    process.exit(0);
}

uploadAndSync().catch(e => {
    console.error(e);
    process.exit(1);
});
