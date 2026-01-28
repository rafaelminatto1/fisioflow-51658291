/**
 * Create test patient and appointment using Supabase REST API
 * Run with: node scripts/create-test-data-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from .env
const SUPABASE_URL = 'https://ycvbtjfrchcyvmkvuocu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmJ0amZyY2hjeXZta3Z1b2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTA5OTQsImV4cCI6MjA3NTE2Njk5NH0.L5maWG2hc3LVHEUMOzfTRTjYwIAJFXx3zan3G-Y1zAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestDataSupabase() {
  try {
    console.log('🔍 Connecting to Supabase...\n');

    // Check existing patients
    console.log('📊 Current patients in database:');
    const { data: existingPatients, error: listError } = await supabase
      .from('patients')
      .select('id, name, email, organization_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (listError) {
      console.error('Error listing patients:', listError);
    } else {
      console.log(`   Found ${existingPatients?.length || 0} active patients`);
      existingPatients?.forEach(p => {
        console.log(`   - ${p.name} (${p.email || 'no email'}) - ID: ${p.id}`);
      });
    }

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
      organization_id: 'default',
    };

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert(patientData)
      .select('id, name, email, organization_id')
      .single();

    if (patientError) {
      console.error('❌ Error creating patient:', patientError);
      throw patientError;
    }

    const patientId = patient.id;
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

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select('id, date, start_time, end_time, status')
      .single();

    if (aptError) {
      console.error('❌ Error creating appointment:', aptError);
      throw aptError;
    }

    const appointmentId = appointment.id;
    console.log(`✅ Appointment created with ID: ${appointmentId}`);

    // Output summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`\n📝 Test Patient Created:\n`);
    console.log(`   ID: ${patientId}`);
    console.log(`   Name: ${patient.name}`);
    console.log(`   Email: ${patient.email}`);
    console.log(`   Organization: ${patient.organization_id}`);
    console.log(`\n📝 Test Appointment Created:\n`);
    console.log(`   ID: ${appointmentId}`);
    console.log(`   Date: ${dateStr}`);
    console.log(`   Time: 14:00 - 15:00`);
    console.log(`   Status: ${appointment.status}\n`);

    // Save to file for reference
    const fs = await import('fs');
    const testData = {
      patientId,
      appointmentId,
      patientData: { ...patientData, id: patientId },
      appointmentData: { ...appointmentData, id: appointmentId },
    };

    fs.writeFileSync(
      '/tmp/fisioflow-test-data.json',
      JSON.stringify(testData, null, 2)
    );
    console.log(`💾 Test data saved to: /tmp/fisioflow-test-data.json`);
    console.log(`\n💡 Search for "Test User E2E" in the patient combobox\n`);

    return { patientId, appointmentId };

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createTestDataSupabase()
  .then(() => {
    console.log(`\n✅ Ready for E2E testing!`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
