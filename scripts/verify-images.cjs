const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const client = new Client({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function verify() {
    try {
        await client.connect();
        const res = await client.query("SELECT COUNT(*) FROM exercises WHERE image_url IS NOT NULL AND image_url != ''");
        const totalWithImage = res.rows[0].count;
        const res2 = await client.query("SELECT COUNT(*) FROM exercises");
        const total = res2.rows[0].count;
        console.log(`Exercises with image: ${totalWithImage}`);
        console.log(`Total exercises: ${total}`);
        
        const res3 = await client.query("SELECT name, slug FROM exercises WHERE image_url IS NULL OR image_url = '' ORDER BY name");
        if (res3.rows.length > 0) {
            console.log('\nRemaining without images:');
            res3.rows.forEach(r => console.log(`- ${r.name} (${r.slug})`));
        } else {
            console.log('\nAll exercises have images! 🎉');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
verify();
