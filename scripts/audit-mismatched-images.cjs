const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const TARGET_DIR = 'public/exercises/illustrations/';

async function audit() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.avif'));
        
        const res = await client.query("SELECT id, name, slug, image_url FROM exercises WHERE image_url LIKE 'http%'");
        const remoteExercises = res.rows;

        console.log(`Checking ${remoteExercises.length} remote exercises against ${files.length} local files...`);

        const matches = [];

        for (const ex of remoteExercises) {
            // Try various matching strategies
            const possibleFilenames = [
                `${ex.slug}.avif`,
                `${ex.name.toLowerCase().replace(/ /g, '-')}.avif`,
                // Some files have English names or variations
            ];

            // Manual fuzzy matching for known ones
            const filenameMatch = files.find(f => {
                if (possibleFilenames.includes(f)) return true;
                if (f.includes(ex.slug)) return true;
                
                // Common variations
                if (ex.slug === 'gato-camelo' && f === 'cat-cow-gato-camelo.avif') return true;
                if (ex.slug.includes('prancha-lateral') && f.includes('prancha-lateral')) return true;
                if (ex.slug.includes('prancha-abdominal-plank') && f.includes('prancha-abdominal')) return true;
                if (ex.slug.includes('bird-dog') && f.includes('bird-dog')) return true;
                if (ex.slug.includes('v-up') && f.includes('canivete-v-up')) return true;
                
                return false;
            });

            if (filenameMatch) {
                matches.push({
                    name: ex.name,
                    slug: ex.slug,
                    currentUrl: ex.image_url,
                    localFile: filenameMatch,
                    newUrl: `/exercises/illustrations/${filenameMatch}`
                });
            }
        }

        console.log('\nFound potential matches:');
        console.table(matches);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

audit();
