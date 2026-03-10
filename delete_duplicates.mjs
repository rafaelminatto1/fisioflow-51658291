import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("Fetching duplicated protocols...");
  try {
    const duplicates = await sql`SELECT name, count(*) as count FROM exercise_protocols GROUP BY name HAVING count(*) > 1`;
    
    if (duplicates.length === 0) {
      console.log("No duplicates found.");
      return;
    }

    console.log(`Found ${duplicates.length} protocols with duplicates. Deleting extras...`);
    
    let totalDeleted = 0;
    for (const dup of duplicates) {
      const records = await sql`SELECT id, created_at FROM exercise_protocols WHERE name = ${dup.name} ORDER BY created_at ASC`;
      
      // Keep the first one (oldest), delete the rest
      const idsToDelete = records.slice(1).map(r => r.id);
      
      for (const id of idsToDelete) {
        await sql`DELETE FROM exercise_protocols WHERE id = ${id}`;
        totalDeleted++;
      }
    }
    
    console.log(`Successfully deleted ${totalDeleted} duplicate protocol entries.`);
  } catch (err) {
    console.error("Error occurred:", err);
  }
}
run();
