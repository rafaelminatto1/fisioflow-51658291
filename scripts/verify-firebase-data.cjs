/**
 * Verify test data in Firebase Firestore
 * Run with: node scripts/verify-firebase-data.cjs
 */

const { getFirebaseAdmin } = require('./lib/firebase-admin-helper.cjs');

const { db } = getFirebaseAdmin();

async function verifyData() {
  try {
    const appointmentId = '0bzDTE2Mc1lH20PvHxAd';

    console.log('🔍 Verifying appointment data...\n');

    // Check appointment
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();

    if (appointmentDoc.exists) {
      const data = appointmentDoc.data();
      console.log('✅ Appointment found:');
      console.log(`   ID: ${appointmentDoc.id}`);
      console.log(`   patient_id: ${data.patient_id}`);
      console.log(`   patientId: ${data.patientId}`);
      console.log(`   appointment_date: ${data.appointment_date}`);
      console.log(`   appointment_time: ${data.appointment_time}`);
      console.log(`   type: ${data.type}`);
      console.log(`   status: ${data.status}`);

      const patientId = data.patient_id || data.patientId;
      console.log(`\n🔍 Looking for patient: ${patientId}\n`);

      // Check patient
      const patientDoc = await db.collection('patients').doc(patientId).get();

      if (patientDoc.exists) {
        const patientData = patientDoc.data();
        console.log('✅ Patient found:');
        console.log(`   ID: ${patientDoc.id}`);
        console.log(`   full_name: ${patientData.full_name}`);
        console.log(`   email: ${patientData.email}`);
        console.log(`   status: ${patientData.status}`);
      } else {
        console.log('❌ Patient NOT found!');
        console.log('\nAvailable patients:');
        const patientsSnapshot = await db.collection('patients').limit(5).get();
        if (!patientsSnapshot.empty) {
          patientsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${doc.id}: ${data.full_name || data.email || 'unnamed'}`);
          });
        } else {
          console.log('   (No patients found)');
        }
      }

    } else {
      console.log('❌ Appointment NOT found!');
      console.log('\nAvailable appointments:');
      const apptsSnapshot = await db.collection('appointments').limit(5).get();
      if (!apptsSnapshot.empty) {
        apptsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`   - ${doc.id}: ${data.patient_id || data.patientId || 'no-patient'} (${data.appointment_date || data.date} ${data.appointment_time || data.time})`);
        });
      } else {
        console.log('   (No appointments found)');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

verifyData().then(() => process.exit(0));
