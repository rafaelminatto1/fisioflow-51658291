import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("Checking for exact duplicate appointments...");
  try {
    const duplicates = await sql`
      SELECT therapist_id, date, start_time, end_time, count(*) 
      FROM appointments 
      WHERE status NOT IN ('cancelled', 'no_show')
      GROUP BY therapist_id, date, start_time, end_time 
      HAVING count(*) > 1
    `;
    
    console.log("Groups of exact duplicates:", duplicates.length);
    const totalDups = duplicates.reduce((acc, curr) => acc + parseInt(curr.count) - 1, 0);
    console.log("Total redundant rows to remove:", totalDups);
    
    if (totalDups > 0) {
      console.log("Example duplicates:", JSON.stringify(duplicates.slice(0, 3), null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}
run();
