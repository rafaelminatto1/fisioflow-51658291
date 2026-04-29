import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

async function test() {
  try {
    const results = await sql.query("SELECT count(*) FROM exercises");
    console.log("Exercise Count:", results[0].count);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
