/**
 * Create a test appointment in Firebase Firestore
 * Run with: node scripts/create-firebase-appointment.js
 */

const admin = require('firebase-admin');

// Read service account
const serviceAccount = require('../functions/service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fisioflow-migration'
});

const db = admin.firestore();

async function createAppointment() {
  try {
    console.log('🔍 Connecting to Firebase Firestore...');

    // First, try to find any existing appointment
    console.log('📋 Checking for existing appointments...');
    const snapshot = await db.collection('appointments')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      console.log('\n✅ Found existing appointment:');
      console.log(`   ID: ${doc.id}`);
      console.log(`   Patient ID: ${data.patient_id || data.patientId || 'N/A'}`);
      console.log(`   Date: ${data.appointment_date || data.date || data.appointmentDate || 'N/A'}`);
      console.log(`   Time: ${data.appointment_time || data.time || data.appointmentTime || 'N/A'}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`\n📝 Use this ID in the test:`);
      console.log(`   const TEST_APPOINTMENT_ID = '${doc.id}';`);
      return doc.id;
    }

    // No appointments found, create one
    console.log('\n⚠️  No appointments found. Creating a test appointment...');

    // First, get a patient ID
    const patientSnapshot = await db.collection('patients').limit(1).get();

    if (patientSnapshot.empty) {
      console.log('❌ No patients found. Cannot create appointment.');
      return null;
    }

    const patientId = patientSnapshot.docs[0].id;
    console.log(`   Using patient ID: ${patientId}`);

    // Create the appointment
    const appointmentData = {
      patient_id: patientId,
      patientId: patientId,
      appointment_date: new Date().toISOString().split('T')[0],
      appointmentTime: '14:00',
      appointment_time: '14:00',
      type: 'fisioterapia',
      session_type: 'Fisioterapia',
      status: 'agendado',
      duration: 60,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('appointments').add(appointmentData);

    console.log('\n✅ Created test appointment:');
    console.log(`   ID: ${docRef.id}`);
    console.log(`   Patient ID: ${patientId}`);
    console.log(`   Date: ${appointmentData.appointment_date}`);
    console.log(`   Time: ${appointmentData.appointment_time}`);
    console.log(`\n📝 Use this ID in the test:`);
    console.log(`   const TEST_APPOINTMENT_ID = '${docRef.id}';`);

    return docRef.id;

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createAppointment().then(id => {
  if (id) {
    console.log(`\n✅ Success! Appointment ID: ${id}`);
  }
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
