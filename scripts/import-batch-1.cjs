const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const TARGET_DIR = 'public/exercises/illustrations/';

// Batch 1 Data: [Mapping generated image suffix -> target slug and id]
const batch = [
    { 
        suffix: 'abducao_quadril_pe_illustration_batch1_1775779655713_1775825367537.png', 
        slug: 'abducao-de-quadril-em-pe',
        id: 'ec3849f2-23cf-4edc-ad8d-ed54714f36ac'
    },
    { 
        suffix: 'agachamento_com_soco_illustration_batch1_1775779655714_1775825381259.png', 
        slug: 'agachamento-com-soco',
        id: '70f736f0-8a3b-4984-af93-c48ac192c748'
    },
    { 
        suffix: 'alcance_em_y_illustration_batch1_1775779655715_1775825397241.png', 
        slug: 'alcance-em-y-y-balance-practice',
        id: 'e5b40a4b-ee8b-483f-b45f-40a23a769a4b'
    },
    { 
        suffix: 'alongamento_isquios_toalha_illustration_batch1_1775779655716_1775825413021.png', 
        slug: 'alongamento-isquiotibiais-com-toalha',
        id: 'd029f7ce-9617-4f04-9834-3faa425a9d3e'
    },
    { 
        suffix: 'alongamento_lateral_pescoco_illustration_batch1_1775779655717_1775825429307.png', 
        slug: 'alongamento-lateral-de-pescoco',
        id: '73573738-bb4b-43ad-b67a-f78548ad210c'
    },
    { 
        suffix: 'alongamento_levantador_escapula_illustration_batch1_1775779655718_1775825443596.png', 
        slug: 'alongamento-levantador-da-escapula',
        id: '7c602d5c-bbbb-4ddb-97d0-6ebcc3ddfa20'
    },
    { 
        suffix: 'agachamento_parede_wall_sit_illustration_batch1_1775779655719_1775825457686.png', 
        slug: 'agachamento-parelde-wall-sit', // kept typo as per DB slug
        id: 'a35d481b-5764-43ae-ac66-3f3500fb061c'
    },
    { 
        suffix: 'alongamento_panturrilha_parede_illustration_batch1_1775779655720_1775825471051.png', 
        slug: 'alongamento-de-panturrilha-na-parede',
        id: 'a87ba563-3dc8-433b-85d3-8f0a514d7c2a'
    },
    { 
        suffix: 'alongamento_psoas_lunge_illustration_batch1_1775779655721_1775825488677.png', 
        slug: 'alongamento-de-psoas-lunge-stretch',
        id: '15068005-3448-4b29-aa5e-7a596d7929df'
    },
    { 
        suffix: 'agachamento_isosc_illustration_batch1_1775779655722_1775825500546.png', 
        slug: 'agachamento-isometrico',
        id: '2cd154da-2ec7-4da9-893a-1a301e4221cd'
    }
];

const SOURCE_DIR = '/home/rafael/.gemini/antigravity/brain/655072bd-9231-456b-8d0b-b49767e6aa17/';

async function run() {
    try {
        await client.connect();
        console.log('🚀 Starting import of Batch 1...');

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

        console.log('✨ Batch 1 import complete.');
    } catch (err) {
        console.error('❌ Error during import:', err);
    } finally {
        await client.end();
    }
}

run();
