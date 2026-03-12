import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  try {
    const res = await sql`SELECT count(*) FROM appointments`;
    console.log("Total appointments:", res[0].count);
    
    const sample = await sql`SELECT id, therapist_id, date, start_time, end_time, status, is_group FROM appointments LIMIT 5`;
    console.log("Sample appointments:", JSON.stringify(sample, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
