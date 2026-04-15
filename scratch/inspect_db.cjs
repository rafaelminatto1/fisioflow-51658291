const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

async function inspect() {
    const sql = neon(DATABASE_URL);
    try {
        console.log('--- EXERCISES SAMPLE ---');
        const exercises = await sql`SELECT id, name, slug, category, difficulty, body_parts, equipment, description, instructions FROM exercises LIMIT 5`;
        console.log(JSON.stringify(exercises, null, 2));

        const count = await sql`SELECT count(*) FROM exercises`;
        console.log(`Total Exercises: ${count[0].count}`);

        console.log('\n--- WIKI PAGES ---');
        const wiki = await sql`SELECT title, slug FROM wiki_pages`;
        console.log(JSON.stringify(wiki, null, 2));

    } catch (err) {
        console.error('Error:', err);
    }
}

inspect();
