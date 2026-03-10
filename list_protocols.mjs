import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  try {
    const protocols = await sql`SELECT id, name, condition_name FROM exercise_protocols ORDER BY name ASC`;
    console.log(JSON.stringify(protocols, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
