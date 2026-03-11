import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function checkData() {
  console.log("Checking for data in columns/tables flagged for deletion...\n");

  const queries = [
    { name: 'organizations table', run: async () => await sql`SELECT COUNT(*) as count FROM organizations` },
    { name: 'profiles table', run: async () => await sql`SELECT COUNT(*) as count FROM profiles` },
    { name: 'exercises.firestore_id', run: async () => await sql`SELECT COUNT(*) as count FROM exercises WHERE firestore_id IS NOT NULL` },
    { name: 'exercises.embedding', run: async () => await sql`SELECT COUNT(*) as count FROM exercises WHERE embedding IS NOT NULL` },
    { name: 'exercise_protocols.firestore_id', run: async () => await sql`SELECT COUNT(*) as count FROM exercise_protocols WHERE firestore_id IS NOT NULL` },
    { name: 'appointments.firestore_id', run: async () => await sql`SELECT COUNT(*) as count FROM appointments WHERE firestore_id IS NOT NULL` },
    { name: 'patients.main_condition', run: async () => await sql`SELECT COUNT(*) as count FROM patients WHERE main_condition IS NOT NULL` },
    { name: 'patients.status', run: async () => await sql`SELECT COUNT(*) as count FROM patients WHERE status IS NOT NULL` },
    { name: 'patients.firestore_id', run: async () => await sql`SELECT COUNT(*) as count FROM patients WHERE firestore_id IS NOT NULL` },
    { name: 'patients.date_of_birth', run: async () => await sql`SELECT COUNT(*) as count FROM patients WHERE date_of_birth IS NOT NULL` },
    { name: 'patients.weight', run: async () => await sql`SELECT COUNT(*) as count FROM patients WHERE weight IS NOT NULL` },
    { name: 'sessions.protocol_name', run: async () => await sql`SELECT COUNT(*) as count FROM sessions WHERE protocol_name IS NOT NULL` },
    { name: 'sessions.raw_force_data', run: async () => await sql`SELECT COUNT(*) as count FROM sessions WHERE raw_force_data IS NOT NULL` },
    { name: 'sessions.peak_force', run: async () => await sql`SELECT COUNT(*) as count FROM sessions WHERE peak_force IS NOT NULL` },
    { name: 'sessions.duration', run: async () => await sql`SELECT COUNT(*) as count FROM sessions WHERE duration IS NOT NULL` },
  ];

  for (const q of queries) {
    try {
      const res = await q.run();
      const count = parseInt(res[0].count, 10);
      if (count > 0) {
          console.log(`[HAS DATA] ${q.name} has ${count} non-null rows.`);
      } else {
          console.log(`[EMPTY] ${q.name} is empty.`);
      }
    } catch (e: any) {
      console.log(`[Error] Checking ${q.name}: ${e.message}`);
    }
  }
}

checkData();
