import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const migrations = [
    // Stats Index
    "DROP INDEX IF EXISTS idx_appointments_stats",
    "CREATE INDEX idx_appointments_stats ON appointments(organization_id, patient_id, date DESC, status) WHERE status IN ('completed', 'scheduled', 'confirmed') OR status IS NULL",
    
    // Upcoming Index
    "DROP INDEX IF EXISTS idx_appointments_upcoming",
    "CREATE INDEX idx_appointments_upcoming ON appointments(organization_id, patient_id, date) WHERE date >= CURRENT_DATE AND (status NOT IN ('cancelled', 'completed') OR status IS NULL)",
    
    // Last Visit Index
    "DROP INDEX IF EXISTS idx_appointments_last_visit",
    "CREATE INDEX idx_appointments_last_visit ON appointments(patient_id, date DESC) WHERE date <= CURRENT_DATE",
    
    // Org Date Index
    "DROP INDEX IF EXISTS idx_appointments_org_date",
    "CREATE INDEX idx_appointments_org_date ON appointments(organization_id, date DESC)",
    
    // Status Index by Org
    "DROP INDEX IF EXISTS idx_appointments_status",
    "CREATE INDEX idx_appointments_status ON appointments(organization_id, status)",
    
    // Patient/Org Index
    "DROP INDEX IF EXISTS idx_appointments_patient_org",
    "CREATE INDEX idx_appointments_patient_org ON appointments(patient_id, organization_id, date DESC)"
  ];

  console.log('--- STARTING PERFORMANCE INDEXES MIGRATION ---');
  for (const m of migrations) {
    try {
      console.log(`Executing: ${m}...`);
      // The neon client requires tagged templates or sql.query
      // Let's try raw tagged template if possible, but for dynamic strings sql.query is better
      await sql.query(m); 
      console.log('Success');
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

run();
