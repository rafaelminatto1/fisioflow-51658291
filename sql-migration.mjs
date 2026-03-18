import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const table = 'patients';
  const columnsToAdd = [
    { name: 'rg', type: 'varchar(20)' },
    { name: 'birth_date', type: 'date' },
    { name: 'phone_secondary', type: 'varchar(20)' },
    { name: 'address', type: 'jsonb' },
    { name: 'emergency_contact', type: 'jsonb' },
    { name: 'insurance', type: 'jsonb' },
    { name: 'profile_id', type: 'uuid' },
    { name: 'user_id', type: 'text' },
    { name: 'origin', type: 'varchar(100)' },
    { name: 'referred_by', type: 'varchar(150)' },
    { name: 'professional_id', type: 'uuid' },
    { name: 'professional_name', type: 'varchar(150)' },
    { name: 'is_active', type: 'boolean', default: 'true' },
    { name: 'alerts', type: 'jsonb', default: "'[]'::jsonb" },
    { name: 'observations', type: 'text' },
    { name: 'incomplete_registration', type: 'boolean', default: 'false' },
    { name: 'consent_data', type: 'boolean', default: 'true' },
    { name: 'consent_image', type: 'boolean', default: 'false' },
    { name: 'blood_type', type: 'varchar(10)' },
    { name: 'weight_kg', type: 'numeric(6, 2)' },
    { name: 'height_cm', type: 'numeric(6, 2)' },
    { name: 'marital_status', type: 'varchar(50)' },
    { name: 'education_level', type: 'varchar(100)' },
    { name: 'progress', type: 'integer', default: '0' },
    { name: 'main_condition', type: 'text' },
    { name: 'status', type: 'varchar(100)', default: "'Inicial'" },
    { name: 'session_value', type: 'numeric(10, 2)' },
  ];

  console.log('--- STARTING MIGRATION ---');
  for (const col of columnsToAdd) {
    try {
      console.log(`Adding ${col.name}...`);
      let queryText = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`;
      if (col.default !== undefined) {
        queryText += ` DEFAULT ${col.default}`;
      }
      // Using tagged template for better safety and compatibility
      await sql([queryText]); 
      console.log(`Success: ${col.name}`);
    } catch (e) {
      console.error(`Error adding ${col.name}:`, e.message);
    }
  }

  console.log('\n--- VERIFYING SCHEMA ---');
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'patients'
      ORDER BY ordinal_position
    `;
    console.table(columns);
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

run();
