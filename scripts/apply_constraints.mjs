import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("Applying database constraints and indices...");
  try {
    // 1. Patient Unique Constraint (Organization + Email)
    // First, check for existing duplicates to avoid failure
    const duplicates = await sql`
      SELECT organization_id, email, count(*) 
      FROM patients 
      WHERE email IS NOT NULL AND email != ''
      GROUP BY organization_id, email 
      HAVING count(*) > 1
    `;

    if (duplicates.length > 0) {
      console.log("Warning: Found duplicate patient emails within same organization. Skipping unique constraint.");
      console.log(JSON.stringify(duplicates, null, 2));
    } else {
      console.log("Adding unique constraint to patients(organization_id, email)...");
      await sql`ALTER TABLE patients ADD CONSTRAINT unique_patient_email_org UNIQUE (organization_id, email)`;
    }

    console.log("Database shielding complete!");
  } catch (err) {
    console.error("Failed to apply constraints:", err.message);
  }
}
run();
