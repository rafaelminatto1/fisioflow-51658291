import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

async function checkExercises() {
  try {
    console.log("Checking exercises table...");
    const count =
      await sql`SELECT count(*) FROM exercises WHERE is_active = true AND is_public = true`;
    console.log("Active public exercises count:", count[0].count);

    console.log("Fetching first 5 exercises to check schema...");
    const rows =
      await sql`SELECT * FROM exercises WHERE is_active = true AND is_public = true LIMIT 5`;
    console.log("Sample rows:", JSON.stringify(rows, null, 2));

    console.log("Attempting limit 500 query...");
    const start = Date.now();
    const result =
      await sql`SELECT id, name FROM exercises WHERE is_active = true AND is_public = true LIMIT 500`;
    const end = Date.now();
    console.log(`Limit 500 query took ${end - start}ms. Returned ${result.length} rows.`);
  } catch (err) {
    console.error("Error:", err.message);
    if (err.stack) console.error(err.stack);
  }
}

checkExercises();
