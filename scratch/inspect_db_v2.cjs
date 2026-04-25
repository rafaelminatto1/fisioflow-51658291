const { neon } = require("@neondatabase/serverless");

const DATABASE_URL =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

async function inspect() {
  const sql = neon(DATABASE_URL);
  try {
    console.log("--- EXERCISES SAMPLE ---");
    const exercises = await sql`
            SELECT id, name, slug, subcategory, difficulty, body_parts, equipment, description, instructions, tips, precautions, benefits
            FROM exercises
            WHERE description IS NULL OR instructions IS NULL OR body_parts = '{}'
            LIMIT 10
        `;
    console.log(JSON.stringify(exercises, null, 2));

    const countTotal = await sql`SELECT count(*) FROM exercises`;
    const countIncomplete =
      await sql`SELECT count(*) FROM exercises WHERE description IS NULL OR instructions IS NULL OR body_parts = '{}'`;
    console.log(`\nTotal Exercises: ${countTotal[0].count}`);
    console.log(`Incomplete Exercises: ${countIncomplete[0].count}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

inspect();
