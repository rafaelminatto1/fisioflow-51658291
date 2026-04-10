const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const TARGET_DIR = 'public/exercises/illustrations/';

const batch = [
    { 
        suffix: 'four_point_kneeling_illustration_batch2_1775779655723_1775825949332.png', 
        slug: '4-apoios-four-point-kneeling',
        id: '4ba7ec7b-8948-413e-8559-490dff6ae989'
    },
    { 
        suffix: 'afundo_frontal_illustration_batch2_1775779655724_1775825965538.png', 
        slug: 'afundo-frontal-lunge',
        id: '296c9330-4818-4cc4-9c77-ccd1030952ce'
    },
    { 
        suffix: 'afundo_lateral_illustration_batch2_1775779655725_1775825984593.png', 
        slug: 'afundo-lateral',
        id: '56b512a2-f095-4c5f-94db-c7a31ecb9e18'
    },
    { 
        suffix: 'afundo_reverso_illustration_batch2_1775779655726_1775825998128.png', 
        slug: 'afundo-reverso',
        id: 'f3d3f0f4-0366-42a4-9d6d-ce72d13f0fdb'
    },
    { 
        suffix: 'alongamento_trapezio_superior_illustration_batch2_1775779655727_1775826011675.png', 
        slug: 'alongamento-trapezio-superior',
        id: '53273709-b9bd-49b5-8495-8f6cdce44f12'
    },
    { 
        suffix: 'alongamento_adutores_illustration_batch2_1775779655728_1775826026430.png', 
        slug: 'alongamento-de-adutores',
        id: '70751514-d6d8-4ffc-9037-226b7433c590'
    },
    { 
        suffix: 'alongamento_biceps_parede_illustration_batch2_1775779655729_1775826040173.png', 
        slug: 'alongamento-de-biceps-na-parede',
        id: 'd68483d3-04e4-4f34-8e41-1a37635a141a'
    }
];

const SOURCE_DIR = '/home/rafael/.gemini/antigravity/brain/655072bd-9231-456b-8d0b-b49767e6aa17/';

async function run() {
    try {
        await client.connect();
        console.log('🚀 Starting import of Batch 2 (Partial)...');

        for (const item of batch) {
            const sourcePath = path.join(SOURCE_DIR, item.suffix);
            const targetFilename = `${item.slug}.avif`;
            const targetPath = path.join(TARGET_DIR, targetFilename);

            if (!fs.existsSync(sourcePath)) {
                console.warn(`⚠️ Source not found: ${sourcePath}`);
                continue;
            }

            console.log(`Processing: ${item.slug}...`);
            await sharp(sourcePath)
                .avif({ quality: 60 })
                .toFile(targetPath);

            const dbUrl = `/exercises/illustrations/${targetFilename}`;
            await client.query(
                'UPDATE exercises SET image_url = $1, thumbnail_url = $2 WHERE id = $3',
                [dbUrl, dbUrl, item.id]
            );
            console.log(`✅ Success: ${item.slug} -> ${targetFilename}`);
        }

        console.log('✨ Batch 2 (Partial) import complete.');
    } catch (err) {
        console.error('❌ Error during import:', err);
    } finally {
        await client.end();
    }
}

run();
