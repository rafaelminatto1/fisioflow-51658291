const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Connection string from connection tool
const DATABASE_URL = 'postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const client = new Client({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const TARGET_DIR = 'public/exercises/illustrations/';
const SOURCE_DIR = '/home/rafael/.gemini/antigravity/brain/655072bd-9231-456b-8d0b-b49767e6aa17/';

const batch = [
    { suffix: 'alongamento_romboides_sentado_illustration_batch4_1775850900000_1775850900001_1775915727999.png', slug: 'alongamento-romboides-sentado' },
    { suffix: 'alongamento_subescapular_illustration_batch4_1775850900000_1775850900002_1775915738941.png', slug: 'alongamento-subescapular' },
    { suffix: 'alongamento_tensor_fascia_lata_illustration_batch4_1775850900000_1775850900003_1775915751872.png', slug: 'alongamento-tensor-fascia-lata' },
    { suffix: 'alongamento_triceps_parede_illustration_batch4_1775850900000_1775850900004_1775915764921.png', slug: 'alongamento-triceps-parede' },
    { suffix: 'alongamento_triceps_sentado_illustration_batch4_1775850900000_1775850900005_1775915778268.png', slug: 'alongamento-triceps-sentado' },
    { suffix: 'alongamento_triceps_toalha_illustration_batch4_1775850900000_1775850900006_1775915813679.png', slug: 'alongamento-triceps-toalha' },
    { suffix: 'ankle_inversion_isometric_illustration_batch4_1775850900000_1775850900007_1775915826942.png', slug: 'ankle-inversion-isometric' },
    { suffix: 'avanco_com_halteres_illustration_batch4_1775850900000_1775850900008_1775915842703.png', slug: 'avanco-com-halteres' },
    { suffix: 'avanco_com_salto_illustration_batch4_1775850900000_1775850900009_1775915857392.png', slug: 'avanco-com-salto' },
    { suffix: 'avanco_isometrico_illustration_batch4_1775850900000_1775850900010_1775915871908.png', slug: 'avanco-isometrico' },
    { suffix: 'avanco_reverso_halteres_illustration_batch4_1775850900000_1775850900011_1775915915506.png', slug: 'avanco-reverso-halteres' },
    { suffix: 'barra_fixa_pronada_illustration_batch4_1775850900000_1775850900012_1775915931842.png', slug: 'barra-fixa-pronada' },
    { suffix: 'barra_fixa_supinada_illustration_batch4_1775850900000_1775850900013_1775915944469.png', slug: 'barra-fixa-supinada' },
    { suffix: 'bicep_curl_alternado_illustration_batch4_1775850900000_1775850900014_1775915956572.png', slug: 'bicep-curl-alternado' },
    { suffix: 'bicep_curl_martelo_illustration_batch4_1775850900000_1775850900015_1775915967618.png', slug: 'bicep-curl-martelo' },
    { suffix: 'chin_tucks_illustration_batch4_1775873072709.png', slug: 'chin-tucks' },
    { suffix: 'clamshell_concha_illustration_batch4_1775873086386.png', slug: 'clamshell-concha' },
    { suffix: 'cobra_prona_illustration_batch4_1775873100809.png', slug: 'cobra-prona' },
    { suffix: 'codman_pendular_illustration_batch4_1775873113424.png', slug: 'codman-pendular' },
    { suffix: 'coordenacao_cruzada_illustration_batch4_1775873126043.png', slug: 'coordenacao-cruzada-cross-crawl' },
    { suffix: 'coordenacao_digital_illustration_batch4_1775873159487.png', slug: 'coordenacao-digital-dedos' },
    { suffix: 'coordenacao_oculo_manual_illustration_batch4b_1_1775916773051.png', slug: 'coordenacao-oculo-manual' },
    { suffix: 'copenhagen_plank_illustration_batch4b_2_1775916788276.png', slug: 'copenhagen-plank' }
];

async function run() {
    try {
        if (!fs.existsSync(TARGET_DIR)) {
            fs.mkdirSync(TARGET_DIR, { recursive: true });
        }

        await client.connect();
        console.log('🚀 Starting import of Batch 4 (6 exercises)...');

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
                .resize(800) // Scale to 800px width as per plan
                .avif({ quality: 60 })
                .toFile(targetPath);

            // Find ID dynamically
            const res = await client.query('SELECT id FROM exercises WHERE slug = $1 LIMIT 1', [item.slug]);
            
            if (res.rows.length > 0) {
                const id = res.rows[0].id;
                const dbUrl = `/exercises/illustrations/${targetFilename}`;
                await client.query(
                    'UPDATE exercises SET image_url = $1, thumbnail_url = $1 WHERE id = $2',
                    [dbUrl, id]
                );
                console.log(`✅ Success: ${item.slug} mapped to ID ${id}`);
            } else {
                console.warn(`❌ Could not find exercise with slug: ${item.slug}`);
            }
        }

        console.log('✨ Batch 4 (initial set) import complete.');
    } catch (err) {
        console.error('❌ Error during import:', err);
    } finally {
        await client.end();
    }
}

run();
