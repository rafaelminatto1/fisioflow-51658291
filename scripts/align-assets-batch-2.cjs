const { Client } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const mappings = [
    { id: 'b2a513c5-5da4-4d17-b0f8-ec63381a49a6', path: '/exercises/illustrations/ponte-gluteo.avif' },
    { id: 'ccb7432a-6bb0-403d-8db5-fa1cb03f00ff', path: '/exercises/illustrations/ponte-unipodal.avif' },
    { id: '5637ceb1-b46e-4d29-9bc9-d8a3afbe4ff6', path: '/exercises/illustrations/deadlift_dumbbells.avif' },
    { id: 'c15042de-aa4f-4cde-9cf9-28cdb6c8169e', path: '/exercises/illustrations/nordic-hamstring-beginner.avif' },
    { id: 'f87d9c7a-9b35-4235-b7a0-59ef2d3f0f20', path: '/exercises/illustrations/sebt.avif' },
    { id: '2085e49d-db48-47a9-90cc-45db7c33709d', path: '/exercises/illustrations/caminhada-de-lado-com-miniband-lateral-band-walk.avif' },
    { id: '96cc9b30-d14a-4938-b490-4d2775343539', path: '/exercises/illustrations/descida-controlada-de-degrau.avif' },
    { id: '8a7ffd62-5075-453c-89e6-057843dcb8e1', path: '/exercises/illustrations/cross-crawl.avif' },
    { id: '230fe21d-6124-492c-a6be-2bff1e8ed40a', path: '/exercises/illustrations/wall-angels.avif' },
    { id: 'f9b5eb0c-34f0-47ae-a5a4-c0f723a86cea', path: '/exercises/illustrations/respiracao-labial-franzida.avif' },
    { id: '0513186d-aaca-4001-8047-2e9cbed2f213', path: '/exercises/illustrations/equilibrio-em-disco-instavel.avif' },
    { id: 'be22afd1-de31-400b-a3d0-2a59a14fcdab', path: '/exercises/illustrations/rotacao-externa-ombro.avif' },
    { id: '63b1216c-631f-4e32-9762-effa9fff42e5', path: '/exercises/illustrations/rotacao-externa-ombro-elastico.avif' },
    { id: 'dc9d2b2a-6836-4d4d-9b62-ac80b22d7c54', path: '/exercises/illustrations/rotacao-externa-ombro-elastico.avif' },
    { id: 'a2129d7d-6679-443b-ac47-5e2063309f36', path: '/exercises/illustrations/sit_to_stand_chair.avif' }
];

async function alignAssets() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`Starting alignment of ${mappings.length} exercises...`);

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

        console.log('Alignment completed.');

    } catch (err) {
        console.error('Error during alignment:', err);
    } finally {
        await client.end();
    }
}

alignAssets();
