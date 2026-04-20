import { neon } from '@neondatabase/serverless';

const url = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

async function checkCategories() {
  try {
    console.log("Checking exercise_categories table...");
    const cats = await sql`SELECT * FROM exercise_categories`;
    console.log("Categories count:", cats.length);
    console.log("Sample categories:", JSON.stringify(cats.slice(0, 3), null, 2));

    console.log("Testing the JOIN query...");
    const joinQuery = await sql`
      SELECT 
        e.id, 
        e.name, 
        c.name as category_name 
      FROM exercises e 
      LEFT JOIN exercise_categories c ON e.category_id = c.id 
      WHERE e.is_active = true AND e.is_public = true 
      LIMIT 500
    `;
    console.log(`Join query returned ${joinQuery.length} rows.`);

  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkCategories();
