const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

const ILLUSTRATIONS_DIR = 'public/exercises/illustrations/';

async function run() {
    try {
        await client.connect();
        
        // Get all exercises with slugs
        const res = await client.query('SELECT id, slug, name FROM exercises WHERE slug IS NOT NULL');
        const exercises = res.rows;
        
        const existingFiles = fs.readdirSync(ILLUSTRATIONS_DIR).filter(f => f.endsWith('.avif'));
        console.log(`🔍 Found ${existingFiles.length} local illustration assets.`);
        
        let updatedCount = 0;
        
        for (const ex of exercises) {
            const fileName = `${ex.slug}.avif`;
            if (existingFiles.includes(fileName)) {
                const relativePath = `/exercises/illustrations/${fileName}`;
                console.log(`✅ Mapping asset for "${ex.name}" -> ${relativePath}`);
                
                await client.query(
                    'UPDATE exercises SET image_url = $1, thumbnail_url = $1 WHERE id = $2',
                    [relativePath, ex.id]
                );
                updatedCount++;
            }
        }
        
        console.log(`🎉 Successfully mapped ${updatedCount} exercises to local assets.`);
    } catch (err) {
        console.error('❌ Error mapping assets:', err);
    } finally {
        await client.end();
    }
}

run();
