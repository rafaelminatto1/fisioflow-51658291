const { Client } = require('pg');

const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

function slugify(text) {
    return text.toString().toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/--+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

async function run() {
    try {
        await client.connect();
        
        // Use COALESCE or check for existence
        const res = await client.query('SELECT id, name FROM exercises WHERE slug IS NULL');
        const exercises = res.rows;
        
        console.log(`🚀 Fixing slugs for ${exercises.length} exercises...`);
        
        for (const ex of exercises) {
            const slug = slugify(ex.name);
            console.log(`Setting slug for "${ex.name}" -> ${slug}`);
            
            try {
                await client.query('UPDATE exercises SET slug = $1 WHERE id = $2', [slug, ex.id]);
            } catch (err) {
                if (err.code === '23505') { // Unique constraint violation
                    const randomSuffix = Math.random().toString(36).substring(2, 5);
                    const altSlug = `${slug}-${randomSuffix}`;
                    console.log(`   ⚠️ Slug exists, using fallback: ${altSlug}`);
                    await client.query('UPDATE exercises SET slug = $1 WHERE id = $2', [altSlug, ex.id]);
                } else {
                    throw err;
                }
            }
        }
        
        console.log('✅ Slugs updated successfully.');
    } catch (err) {
        console.error('❌ Error updating slugs:', err);
    } finally {
        await client.end();
    }
}

run();
