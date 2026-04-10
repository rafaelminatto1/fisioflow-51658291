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
        suffix: 'alongamento_gluteo_supino_illustration_batch2_v2_1775779655733_1775850437200.png', 
        slug: 'alongamento-de-gluteo-supino',
        id: '5ce76038-76ef-43d6-8455-60290a618ff0'
    },
    { 
        suffix: 'alongamento_isquiotibiais_supino_illustration_batch2_v2_1775779655734_1775850475063.png', 
        slug: 'alongamento-de-isquiotibiais',
        id: 'c35453b6-4ff1-4294-98e0-f53fd09d921d'
    },
    { 
        suffix: 'alongamento_isquiotibiais_pe_illustration_batch2_v2_1775779655735_1775850493525.png', 
        slug: 'alongamento-de-isquiotibiais-em-pe',
        id: '6b574243-5a72-44bd-b143-bdf5c8976940'
    },
    { 
        suffix: 'alongamento_panturrilha_sentado_soleo_illustration_batch2_v2_1775779655736_1775850505701.png', 
        slug: 'alongamento-de-panturrilha-sentado-soleo',
        id: '46065bd9-070c-48c0-89c2-74dcab4de78e'
    },
    { 
        suffix: 'alongamento_panturrilha_parede_illustration_batch2_v2_1775779655737_1775850519228.png', 
        slug: 'alongamento-de-panturrilha-na-parede',
        id: '81b9bb61-e0b5-4736-88a6-2a635d9a908b'
    },
    { 
        suffix: 'alongamento_peitoral_porta_illustration_batch2_v2_1775779655738_1775850532989.png', 
        slug: 'alongamento-de-peitoral-na-porta',
        id: 'a621e7bf-7b02-4b2c-83b8-b3f81e4fae95'
    },
    { 
        suffix: 'alongamento_peitoral_porta_variacao_illustration_batch2_v2_1775779655739_1775850546508.png', 
        slug: 'alongamento-de-peitoral-na-porta-variacao',
        id: '50beed4a-b853-4ba5-a16a-ca1e6da28c3d'
    },
    { 
        suffix: 'alongamento_peitoral_canto_illustration_batch2_v2_1775779655740_1775850557975.png', 
        slug: 'alongamento-de-peitoral-no-canto',
        id: '5559e99d-bc89-47eb-b4c2-0960e21e0346'
    },
    { 
        suffix: 'alongamento_piriforme_4_supino_illustration_batch2_v2_1775779655741_1775850573251.png', 
        slug: 'alongamento-de-piriforme-4-supino',
        id: 'b2c15717-dfe9-4078-a678-0ece6f3a1ec1'
    },
    { 
        suffix: 'alongamento_psoas_iliaco_illustration_batch2_v2_1775779655742_1775850584600.png', 
        slug: 'alongamento-de-psoas-iliaco',
        id: 'df77fa5b-306e-4053-91d2-a60cc0017411'
    }
];

const SOURCE_DIR = '/home/rafael/.gemini/antigravity/brain/655072bd-9231-456b-8d0b-b49767e6aa17/';

async function run() {
    try {
        await client.connect();
        console.log('🚀 Starting import of Batch 2 (v2)...');

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
                'UPDATE exercises SET image_url = $1, thumbnail_url = $1 WHERE id = $2',
                [dbUrl, item.id]
            );
            console.log(`✅ Success: ${item.slug} -> ${targetFilename}`);
        }

        console.log('✨ Batch 2 (v2) import complete.');
    } catch (err) {
        console.error('❌ Error during import:', err);
    } finally {
        await client.end();
    }
}

run();
