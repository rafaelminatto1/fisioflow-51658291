import { neon } from "@neondatabase/serverless";

const url =
  "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

async function test() {
  try {
    const results = await sql.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exercises'",
    );
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
