import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

async function test() {
  try {
    const results = await sql.query(
      "SELECT id, name, description FROM exercises WHERE progression_suggestion IS NULL OR suggested_sets IS NULL LIMIT 50",
    );
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
