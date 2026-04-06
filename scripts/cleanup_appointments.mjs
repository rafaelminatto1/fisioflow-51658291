import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("Cleaning up exact duplicate appointments...");
  try {
    await sql`
      DELETE FROM appointments a
      WHERE a.id IN (
        SELECT id FROM (
          SELECT id, row_number() OVER (PARTITION BY therapist_id, date, start_time, end_time ORDER BY created_at DESC) as rn
          FROM appointments
          WHERE status NOT IN ('cancelled', 'no_show')
        ) t
        WHERE t.rn > 1
      )
    `;
    console.log("Deleted exact duplicates.");
    
    const overlaps = await sql`
      SELECT count(*)
      FROM appointments a1
      JOIN appointments a2 ON a1.therapist_id = a2.therapist_id 
        AND a1.date = a2.date
        AND a1.id < a2.id
      WHERE (a1.status NOT IN ('cancelled', 'no_show'))
        AND (a2.status NOT IN ('cancelled', 'no_show'))
        AND (a1.start_time, a1.end_time) OVERLAPS (a2.start_time, a2.end_time)
    `;
    console.log("Remaining overlaps:", overlaps[0].count);
  } catch (err) {
    console.error(err);
  }
}
run();
