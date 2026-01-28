/**
 * Check Supabase database schema
 * Run with: node scripts/check-supabase-schema.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ycvbtjfrchcyvmkvuocu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmJ0amZyY2hjeXZta3Z1b2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTA5OTQsImV4cCI6MjA3NTE2Njk5NH0.L5maWG2hc3LVHEUMOzfTRTjYwIAJFXx3zan3G-Y1zAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('🔍 Checking Supabase database schema...\n');

  // Try to get a sample of patients data to see columns
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying patients:', error);
    return;
  }

  if (patients && patients.length > 0) {
    console.log('📊 Sample patient record:');
    console.log(JSON.stringify(patients[0], null, 2));
    console.log('\n📋 Columns found:', Object.keys(patients[0]).join(', '));
  } else {
    console.log('ℹ️ No patients found in database');

    // Try to get table information using PostgreSQL
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'patients' })
      .select('*');

    if (colError) {
      console.log('ℹ️ RPC not available, trying direct query...');

      // Use a direct PostgreSQL query through the REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      console.log('Response:', response.status);
    } else {
      console.log('Columns:', columns);
    }
  }

  // Check appointments table too
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('*')
    .limit(1);

  if (!aptError && appointments && appointments.length > 0) {
    console.log('\n📊 Sample appointment record:');
    console.log(JSON.stringify(appointments[0], null, 2));
    console.log('\n📋 Columns found:', Object.keys(appointments[0]).join(', '));
  }

  // Count total records
  const { count: patientCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  const { count: aptCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true });

  console.log('\n📈 Database summary:');
  console.log(`   Patients: ${patientCount || 0}`);
  console.log(`   Appointments: ${aptCount || 0}`);
}

checkSchema().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
