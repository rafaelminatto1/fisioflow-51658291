/**
 * Direct PostgreSQL Migration Script for Performance Indexes
 * Connects directly to Cloud SQL and creates indexes
 */

const { Pool } = require('pg');

// Configuration from environment or secrets
const config = {
  host: process.env.DB_HOST_IP_PUBLIC || '34.68.209.73',
  port: 5432,
  database: process.env.DB_NAME || 'fisioflow',
  user: process.env.DB_USER || 'fisioflow',
  password: process.env.DB_PASS || 'fisioflow2024',
  ssl: {
    rejectUnauthorized: false,
    mode: 'require',
  },
  max: 1,
  connectionTimeoutMillis: 10000,
};

async function runMigration() {
  console.log('🚀 Starting performance indexes migration...');
  console.log(`📡 Connecting to: ${config.host}:${config.port}/${config.database}`);

  const pool = new Pool(config);

  try {
    // Test connection
    console.log('🔌 Testing connection...');
    const testResult = await pool.query('SELECT NOW() as server_time, version() as version');
    console.log(`✓ Connected to PostgreSQL at: ${testResult.rows[0].server_time}`);
    console.log(`  Version: ${testResult.rows[0].version.split(' ')[0]} ${testResult.rows[0].version.split(' ')[1]}`);

    // Define indexes to create
    const indexes = [
      // Patients
      { name: 'idx_patients_org_id', sql: 'CREATE INDEX IF NOT EXISTS idx_patients_org_id ON patients(organization_id) WHERE is_active = true' },
      { name: 'idx_patients_cpf_org', sql: 'CREATE INDEX IF NOT EXISTS idx_patients_cpf_org ON patients(cpf, organization_id)' },
      { name: 'idx_patients_name_org', sql: 'CREATE INDEX IF NOT EXISTS idx_patients_name_org ON patients(LOWER(name), organization_id)' },
      { name: 'idx_patients_created_at', sql: 'CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC)' },

      // Appointments
      { name: 'idx_appointments_org_date', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organization_id, date, start_time)' },
      { name: 'idx_appointments_patient_org', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_patient_org ON appointments(patient_id, organization_id)' },
      { name: 'idx_appointments_therapist_org', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_therapist_org ON appointments(therapist_id, organization_id)' },
      { name: 'idx_appointments_status_org', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_status_org ON appointments(status, organization_id)' },

      // Exercises
      { name: 'idx_exercises_active', sql: 'CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true' },
      { name: 'idx_exercises_category', sql: 'CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id)' },
      { name: 'idx_exercises_patient_prescribed', sql: 'CREATE INDEX IF NOT EXISTS idx_exercises_patient_prescribed ON patient_exercises(patient_id, prescribed_at DESC)' },

      // Assessments
      { name: 'idx_assessments_patient_org', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_patient_org ON patient_assessments(patient_id, organization_id)' },
      { name: 'idx_assessments_date_org', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_date_org ON patient_assessments(assessment_date DESC, organization_id)' },
      { name: 'idx_assessments_responses_assessment', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_responses_assessment ON assessment_responses(assessment_id)' },

      // Medical Records
      { name: 'idx_medical_records_patient_org', sql: 'CREATE INDEX IF NOT EXISTS idx_medical_records_patient_org ON medical_records(patient_id, organization_id)' },
      { name: 'idx_medical_records_date_org', sql: 'CREATE INDEX IF NOT EXISTS idx_medical_records_date_org ON medical_records(record_date DESC, organization_id)' },
      { name: 'idx_treatment_sessions_patient_org', sql: 'CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_org ON treatment_sessions(patient_id, organization_id)' },
      { name: 'idx_treatment_sessions_date_org', sql: 'CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date_org ON treatment_sessions(session_date DESC, organization_id)' },

      // Financial
      { name: 'idx_transactions_org', sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_org ON transacoes(organization_id, created_at DESC)' },
      { name: 'idx_payments_org_date', sql: 'CREATE INDEX IF NOT EXISTS idx_payments_org_date ON pagamentos(organization_id, payment_date DESC)' },
      { name: 'idx_payments_patient', sql: 'CREATE INDEX IF NOT EXISTS idx_payments_patient ON pagamentos(patient_id, organization_id)' },

      // Profiles
      { name: 'idx_profiles_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id)' },
    ];

    console.log(`\n📊 Creating ${indexes.length} indexes...\n`);

    let created = 0;
    let existing = 0;
    let errors = 0;

    for (const index of indexes) {
      try {
        await pool.query(index.sql);
        console.log(`✓ ${index.name}`);
        created++;
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`- ${index.name} (already exists)`);
          existing++;
        } else {
          console.error(`✗ ${index.name}: ${err.message}`);
          errors++;
        }
      }
    }

    // Analyze tables to update statistics
    console.log('\n📈 Analyzing tables...');
    const tables = ['patients', 'appointments', 'exercises', 'patient_exercises', 'patient_assessments',
                    'assessment_responses', 'medical_records', 'treatment_sessions', 'transacoes', 'pagamentos', 'profiles'];

    for (const table of tables) {
      try {
        await pool.query(`ANALYZE ${table}`);
        console.log(`✓ Analyzed: ${table}`);
      } catch (err) {
        console.warn(`- Could not analyze ${table}: ${err.message}`);
      }
    }

    // Show final results
    console.log('\n' + '='.repeat(50));
    console.log('Migration Results:');
    console.log(`  ✓ Created: ${created} new indexes`);
    console.log(`  - Already existed: ${existing} indexes`);
    console.log(`  ✗ Errors: ${errors}`);
    console.log(`  Total processed: ${indexes.length} indexes`);
    console.log('='.repeat(50));

    // Show current indexes
    const indexCheck = await pool.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
      LIMIT 30
    `);

    console.log(`\n📋 Current performance indexes (showing ${indexCheck.rows.length} of ${indexes.length}):`);
    indexCheck.rows.forEach(row => {
      console.log(`  ${row.tablename}.${row.indexname}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    console.log('\n✓ Migration script completed');
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
