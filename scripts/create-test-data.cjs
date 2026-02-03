/**
 * Create test patient and appointment in Firebase Firestore
 * Run with: node scripts/create-test-data.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('../functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fisioflow-migration'
});

const db = admin.firestore();

async function createTestData() {
  try {
    console.log('🔍 Connecting to Firebase Firestore...\n');

    // 1. Create a test patient
    console.log('📝 Creating test patient...');

    const patientData = {
      full_name: 'Test User E2E',
      email: 'test-e2e@fisioflow.test',
      phone: '11999999999',
      cpf: '12345678900',
      birth_date: '1990-01-01',
      status: 'active',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      organization_id: 'default',
    };

    const patientRef = await db.collection('patients').add(patientData);
    const patientId = patientRef.id;
    console.log(`✅ Patient created with ID: ${patientId}`);

    // 2. Create a test appointment
    console.log('\n📝 Creating test appointment...');

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const appointmentData = {
      patient_id: patientId,
      patientId: patientId,
      appointment_date: dateStr,
      date: dateStr,
      appointment_time: '14:00',
      appointmentTime: '14:00',
      start_time: '14:00',
      end_time: '15:00',
      type: 'fisioterapia',
      session_type: 'Fisioterapia',
      status: 'agendado',
      duration: 60,
      room: null,
      notes: 'E2E Test Appointment',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      organization_id: 'default',
    };

    const appointmentRef = await db.collection('appointments').add(appointmentData);
    const appointmentId = appointmentRef.id;
    console.log(`✅ Appointment created with ID: ${appointmentId}`);

    // 3. Create a test profile (for authentication)
    console.log('\n📝 Creating test profile...');

    const profileData = {
      user_id: `test-user-${patientId}`,
      email: 'test-e2e@fisioflow.test',
      full_name: 'Test User E2E',
      organization_id: 'default',
      onboarding_completed: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('profiles').doc(profileData.user_id).set(profileData);
    console.log(`✅ Profile created with user_id: ${profileData.user_id}`);

    // 4. Output the results
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`\n📝 Use these IDs in your test:\n`);
    console.log(`   const TEST_PATIENT_ID = '${patientId}';`);
    console.log(`   const TEST_APPOINTMENT_ID = '${appointmentId}';\n`);
    console.log(`   // Patient Name: ${patientData.full_name}`);
    console.log(`   // Appointment Date: ${dateStr}`);
    console.log(`   // Appointment Time: 14:00\n`);

    // Write to file for easy reference
    const testData = {
      patientId,
      appointmentId,
      patientData: { ...patientData, id: patientId },
      appointmentData: { ...appointmentData, id: appointmentId },
      profileData,
    };

    fs.writeFileSync(
      '/tmp/fisioflow-test-data.json',
      JSON.stringify(testData, null, 2)
    );
    console.log(`💾 Test data saved to: /tmp/fisioflow-test-data.json`);

    return { patientId, appointmentId };

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createTestData().then(({ patientId, appointmentId }) => {
  console.log(`\n✅ Ready for E2E testing!`);
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
