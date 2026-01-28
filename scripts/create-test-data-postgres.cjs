/**
 * Create test patient and appointment in PostgreSQL
 * Run with: node scripts/create-test-data-postgres.cjs
 */

const { Pool } = require('pg');

// PostgreSQL connection configuration
const poolConfig = {
  user: process.env.DB_USER || 'fisioflow',
  password: process.env.DB_PASS || 'fisioflow2024',
  database: process.env.DB_NAME || 'fisioflow',
  port: parseInt(process.env.DB_PORT || '5432'),
  host: process.env.DB_HOST || '35.192.122.198',
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
  max: 1,
};

// Use Supabase if Cloud SQL is not accessible
const supabaseConfig = {
  user: 'postgres',
  password: process.env.VITE_SUPABASE_ANON_KEY?.split(' ')[0] || 'ycvbtjfrchcyvmkvuocu',
  database: 'postgres',
  port: 5432,
  host: 'db.ycvbtjfrchcyvmkvuocu.supabase.co',
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
  max: 1,
};

async function createTestDataPostgres() {
  let pool;

  try {
    console.log('🔍 Connecting to PostgreSQL...\n');

    // Try Cloud SQL first, then fallback to Supabase
    try {
      pool = new Pool(poolConfig);
      await pool.query('SELECT 1');
      console.log('✅ Connected to Cloud SQL PostgreSQL');
    } catch (cloudSqlError) {
      console.log('⚠️ Cloud SQL not accessible, trying Supabase...');
      pool = new Pool(supabaseConfig);
      await pool.query('SELECT 1');
      console.log('✅ Connected to Supabase PostgreSQL');
    }

    // Check current patients
    console.log('\n📊 Current patients in database:');
    const existingPatients = await pool.query(
      'SELECT id, name, email, organization_id FROM patients WHERE is_active = true ORDER BY created_at DESC LIMIT 5'
    );
    console.log(`   Found ${existingPatients.rows.length} active patients`);
    existingPatients.rows.forEach(p => {
      console.log(`   - ${p.name} (${p.email || 'no email'}) - ID: ${p.id}`);
    });

    // Create test patient
    console.log('\n📝 Creating test patient...');

    const patientData = {
      name: 'Test User E2E',
      email: 'test-e2e@fisioflow.test',
      phone: '11999999999',
      cpf: '12345678900',
      birth_date: '1990-01-01',
      gender: 'outro',
      main_condition: 'Test condition',
      status: 'active',
      progress: 0,
      is_active: true,
      organization_id: 'default', // Adjust based on your auth context
    };

    const insertResult = await pool.query(
      `INSERT INTO patients (
        name, email, phone, cpf, birth_date, gender,
        main_condition, status, progress, is_active, organization_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, name, email, organization_id`,
      [
        patientData.name,
        patientData.email,
        patientData.phone,
        patientData.cpf,
        patientData.birth_date,
        patientData.gender,
        patientData.main_condition,
        patientData.status,
        patientData.progress,
        patientData.is_active,
        patientData.organization_id,
      ]
    );

    const patientId = insertResult.rows[0].id;
    console.log(`✅ Patient created with ID: ${patientId}`);

    // Create test appointment
    console.log('\n📝 Creating test appointment...');

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const appointmentData = {
      patient_id: patientId,
      date: dateStr,
      start_time: '14:00',
      end_time: '15:00',
      status: 'agendado',
      notes: 'E2E Test Appointment',
      session_type: 'Fisioterapia',
      payment_status: 'pending',
      organization_id: 'default',
    };

    const aptResult = await pool.query(
      `INSERT INTO appointments (
        patient_id, date, start_time, end_time, status, notes,
        session_type, payment_status, organization_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id`,
      [
        appointmentData.patient_id,
        appointmentData.date,
        appointmentData.start_time,
        appointmentData.end_time,
        appointmentData.status,
        appointmentData.notes,
        appointmentData.session_type,
        appointmentData.payment_status,
        appointmentData.organization_id,
      ]
    );

    const appointmentId = aptResult.rows[0].id;
    console.log(`✅ Appointment created with ID: ${appointmentId}`);

    // Output summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`\n📝 Test Patient Created:\n`);
    console.log(`   ID: ${patientId}`);
    console.log(`   Name: ${patientData.name}`);
    console.log(`   Email: ${patientData.email}`);
    console.log(`   Phone: ${patientData.phone}`);
    console.log(`   Organization: ${patientData.organization_id}`);
    console.log(`\n📝 Test Appointment Created:\n`);
    console.log(`   ID: ${appointmentId}`);
    console.log(`   Date: ${dateStr}`);
    console.log(`   Time: 14:00 - 15:00`);
    console.log(`   Status: ${appointmentData.status}\n`);

    // Save to file for reference
    const fs = require('fs');
    const testData = {
      patientId,
      appointmentId,
      patientData: { ...patientData, id: patientId },
      appointmentData: { ...appointmentData, id: appointmentId },
    };

    fs.writeFileSync(
      '/tmp/fisioflow-test-data-postgres.json',
      JSON.stringify(testData, null, 2)
    );
    console.log(`💾 Test data saved to: /tmp/fisioflow-test-data-postgres.json`);

    return { patientId, appointmentId };

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

createTestDataPostgres()
  .then(({ patientId, appointmentId }) => {
    console.log(`\n✅ Ready for E2E testing!`);
    console.log(`\n💡 Use patient name "${patientId}" or search for "Test User E2E" in the combobox\n`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
