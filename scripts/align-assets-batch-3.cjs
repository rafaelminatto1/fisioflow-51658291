const { Client } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const mappings = [
    { id: '205ef2f5-83b5-41c0-932b-d6e8b8a53f29', path: '/exercises/illustrations/jump-squat.avif' }, // Squat Jump
    { id: '26b81426-b061-4050-a7d2-a77eb62208c4', path: '/exercises/illustrations/ponte-unipodal.avif' }, // Ponte de Glúteo Unilateral
    { id: '5638e403-b106-4451-8b98-f14c049447d2', path: '/exercises/illustrations/alongamento-de-psoas-lunge-stretch.avif' }, // Thomas Test Stretch
    { id: 'd0f4adf7-5f02-4578-a120-e150fe0fc653', path: '/exercises/illustrations/mobilizacao-tornozelo-df.avif' }, // Mobilização de Tornozelo em DF
    { id: '79739c5b-4d8d-4e20-b064-ee1c1aa4bc5e', path: '/exercises/illustrations/rotacao-interna-ombro.avif' }, // Rotação Interna de Ombro com Faixa
    { id: 'ca4e687d-07b7-4a5f-a92d-27a7c366da65', path: '/exercises/illustrations/sit_to_stand_chair.avif' }, // Sit-to-Stand
    { id: 'c773d10f-e2ed-4ca6-864a-f355a83ceeda', path: '/exercises/illustrations/flexao-braco.avif' }, // Flexão de Braço na Parede
    { id: '7d5a4d7d-9386-450e-91f7-5bfe6e70e12e', path: '/exercises/illustrations/retracao-escapular.avif' }, // Push-up Plus
    { id: '68efc336-a02f-4fb8-9f05-00afb97207c3', path: '/exercises/illustrations/cobra-prona.avif' }, // Superman
    { id: '79d3afbb-49a6-4957-ae4a-38477cbdf58f', path: '/exercises/illustrations/cat-cow-gato-camelo.avif' }, // Rotação Torácica em 4 Apoios
    { id: '7526c048-545e-488b-8f4d-0e23ddd9a4f2', path: '/exercises/illustrations/canivete-v-up.avif' }, // Hollow Rock (Canoa)
    { id: '524dca2d-cf76-4bbe-b68e-745859dc402d', path: '/exercises/illustrations/prancha-frontal.avif' }, // Prancha na Parede
    { id: 'bd0eb7cb-7c6e-4978-8586-1a2872cf40aa', path: '/exercises/illustrations/apoio-unipodal.avif' }, // Single Leg Stance com Movimento de Braço
    { id: 'a7a80b05-0723-4c52-97c2-4e6689371143', path: '/exercises/illustrations/afundo-frontal-lunge.avif' }, // Lunge com Rotação
    { id: '81f95733-aa81-4bde-8c4a-25adc832dcbb', path: '/exercises/illustrations/deadlift_dumbbells.avif' }, // RDL (Romanian Deadlift)
    { id: '54a5abf8-892a-4ee7-a1ba-860b956e7eb7', path: '/exercises/illustrations/serrote-halter.avif' } // Remada Curvada (Barbell Row)
];

async function alignAssets() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`Starting alignment (Batch 3) of ${mappings.length} exercises...`);

        for (const mapping of mappings) {
            const res = await client.query(
                'UPDATE exercises SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING name',
                [mapping.path, mapping.id]
            );
            if (res.rowCount > 0) {
                console.log(`✅ Updated: ${res.rows[0].name} -> ${mapping.path}`);
            } else {
                console.warn(`⚠️ Not found (ID: ${mapping.id})`);
            }
        }

        console.log('Batch 3 alignment completed.');

    } catch (err) {
        console.error('Error during alignment:', err);
    } finally {
        await client.end();
    }
}

alignAssets();
