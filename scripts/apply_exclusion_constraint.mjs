import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("Checking for overlapping appointments...");
  try {
    const overlaps = await sql`
      SELECT a1.id as id1, a2.id as id2, a1.therapist_id, a1.date, a1.start_time, a1.end_time
      FROM appointments a1
      JOIN appointments a2 ON a1.therapist_id = a2.therapist_id 
        AND a1.date = a2.date
        AND a1.id < a2.id
      WHERE (a1.status NOT IN ('cancelled', 'no_show'))
        AND (a2.status NOT IN ('cancelled', 'no_show'))
        AND (a1.start_time, a1.end_time) OVERLAPS (a2.start_time, a2.end_time)
    `;
    
    if (overlaps.length > 0) {
      console.log("Found overlapping appointments:", overlaps.length);
      console.log(JSON.stringify(overlaps.slice(0, 5), null, 2));
      console.log("Aborting migration until overlaps are resolved.");
      return;
    }

    console.log("No overlaps found. Enabling btree_gist...");
    await sql`CREATE EXTENSION IF NOT EXISTS btree_gist`;
    
    console.log("Adding exclusion constraint...");
    await sql`
      ALTER TABLE appointments ADD CONSTRAINT no_overlapping_therapist_appointments 
      EXCLUDE USING gist (
        therapist_id WITH =,
        tsrange(
          (date + start_time)::timestamp,
          (date + end_time)::timestamp
        ) WITH &&
      ) WHERE (status NOT IN ('cancelled', 'no_show'))
    `;
    console.log("Success!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  }
}
run();
