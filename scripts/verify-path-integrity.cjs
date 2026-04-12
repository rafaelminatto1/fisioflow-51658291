const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

async function checkIntegrity() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT id, name, image_url FROM exercises WHERE image_url LIKE '/exercises/%'");
        const localExercises = res.rows;

        console.log(`Checking integrity of ${localExercises.length} local entries...`);

        let brokenCount = 0;
        for (const ex of localExercises) {
            const relativePath = ex.image_url.replace(/^\//, ''); // remove leading slash
            const fullPath = path.join(process.cwd(), 'public', relativePath.replace('exercises/', 'exercises/'));
            // Wait, public is in the root. path is 'public/exercises/illustrations/...'
            const adjustedPath = path.join(process.cwd(), 'public', ex.image_url.replace(/^\//, ''));

            if (!fs.existsSync(adjustedPath)) {
                console.error(`❌ BROKEN PATH: ${ex.name} -> ${adjustedPath}`);
                brokenCount++;
            }
        }

        if (brokenCount === 0) {
            console.log('✅ All local asset paths are valid.');
        } else {
            console.warn(`⚠️ Found ${brokenCount} broken paths.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkIntegrity();
