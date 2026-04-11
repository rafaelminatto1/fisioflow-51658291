const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Connection string
const DATABASE_URL = 'postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const client = new Client({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const TARGET_DIR = 'public/exercises/illustrations/';
const SOURCE_DIR = '/home/rafael/.gemini/antigravity/brain/655072bd-9231-456b-8d0b-b49767e6aa17/';

const batch = [
    { suffix: 'corner_stretch_illustration_batch5_1775945112000_1775945112001_1775937086584.png', slug: 'corner-stretch-alongamento-no-canto' },
    { suffix: 'wall_climber_illustration_batch5_1775945112000_1775945112002_1775937100694.png', slug: 'escalada-na-parede-wall-climber' }
];

async function run() {
    try {
        if (!fs.existsSync(TARGET_DIR)) {
            fs.mkdirSync(TARGET_DIR, { recursive: true });
        }

        await client.connect();
        console.log(`🚀 Starting import of Batch 5 (${batch.length} exercises)...`);

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
                .resize(800)
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

        console.log('✨ Batch 5 partial import complete.');
    } catch (err) {
        console.error('❌ Error during import:', err);
    } finally {
        await client.end();
    }
}

run();
