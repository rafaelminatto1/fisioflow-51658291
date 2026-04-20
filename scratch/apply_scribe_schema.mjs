import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";
const sql = neon(DATABASE_URL);

async function run() {
  try {
    console.log("Creating clinical_scribe_logs table...");
    await sql`
      CREATE TABLE IF NOT EXISTS clinical_scribe_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        patient_id UUID NOT NULL REFERENCES patients(id),
        therapist_id UUID NOT NULL,
        section VARCHAR(1) NOT NULL,
        raw_text TEXT,
        formatted_text TEXT,
        tokens_used INTEGER DEFAULT 0,
        consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        consent_source VARCHAR(50) DEFAULT 'verbal_confirmed_by_therapist',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;
    console.log("Success!");
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
