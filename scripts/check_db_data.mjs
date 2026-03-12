import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function check() {
  try {
    const protocols = await sql`
      SELECT id, name, milestones, restrictions, phases
      FROM exercise_protocols
      LIMIT 5
    `;
    
    console.log(JSON.stringify(protocols, null, 2));
  } catch (err) {
    console.error(err);
  }
}

check();
