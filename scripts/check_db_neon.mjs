import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("Checking duplicates...");
  try {
    const res = await sql`SELECT name, count(*) as count FROM exercise_protocols GROUP BY name HAVING count(*) > 1`;
    console.log("Duplicated protocols:", res);
    
    if (res.length > 0) {
      const allDuplicates = await sql`SELECT id, name, created_at FROM exercise_protocols WHERE name IN (SELECT name FROM exercise_protocols GROUP BY name HAVING count(*) > 1) ORDER BY name, created_at ASC`;
      console.log("All rows for duplicated protocols:", allDuplicates);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
