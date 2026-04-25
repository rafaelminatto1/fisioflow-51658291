import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

async function migrate() {
  try {
    console.log("Starting migration...");
    await sql.query(`
      ALTER TABLE exercises 
      ADD COLUMN IF NOT EXISTS progression_suggestion TEXT,
      ADD COLUMN IF NOT EXISTS suggested_sets INTEGER,
      ADD COLUMN IF NOT EXISTS suggested_reps INTEGER,
      ADD COLUMN IF NOT EXISTS suggested_rpe INTEGER;
    `);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration Error:", err.message);
  }
}

migrate();
