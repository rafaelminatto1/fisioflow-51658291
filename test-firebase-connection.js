/**
 * Test script to check Firebase connection and data
 * Run with: node test-firebase-connection.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, query, where, limit } = require('firebase/firestore');

// Your Firebase config - load from .env or use existing
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDk6Y5n8pzvFcJ5LNQMqR7B-48JhH7Y8XM",
  authDomain: "fisioflow-51658291.firebaseapp.com",
  projectId: "fisioflow-51658291",
  storageBucket: "fisioflow-51658291.appspot.com",
  messagingSenderId: "103734567890",
  appId: "1:103734567890:web:abc123"
};

async function testConnection() {
  console.log('🔍 Testing Firebase Connection...\n');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    // Test 1: List appointments
    console.log('📋 Fetching appointments...');
    const appointmentsSnapshot = await getDocs(query(collection(db, 'appointments'), limit(5)));

    if (appointmentsSnapshot.empty) {
      console.log('❌ No appointments found in database!');
    } else {
      console.log(`✅ Found ${appointmentsSnapshot.size} appointment(s):\n`);

      for (const doc of appointmentsSnapshot.docs) {
        const data = doc.data();
        console.log(`📌 Appointment ID: ${doc.id}`);
        console.log(`   - patient_id: ${data.patient_id || '❌ NULL'}`);
        console.log(`   - status: ${data.status || 'N/A'}`);
        console.log(`   - date: ${data.date || data.appointment_date || 'N/A'}`);
        console.log(`   - therapist_id: ${data.therapist_id || 'N/A'}`);
        console.log('');

        // If patient_id exists, check if patient exists
        if (data.patient_id) {
          console.log(`   🔍 Checking if patient ${data.patient_id} exists...`);
          try {
            const patientDoc = await getDoc(doc(db, 'patients', data.patient_id));
            if (patientDoc.exists()) {
              const patientData = patientDoc.data();
              console.log(`   ✅ Patient found: ${patientData.name || patientData.full_name || 'No name'}`);
            } else {
              console.log(`   ❌ Patient NOT found in database!`);
            }
          } catch (err) {
            console.log(`   ⚠️ Error checking patient: ${err.message}`);
          }
          console.log('');
        } else {
          console.log(`   ⚠️ WARNING: This appointment has NO patient_id!\n`);
        }
      }
    }

    // Test 2: Count patients
    console.log('\n👥 Fetching patients count...');
    const patientsSnapshot = await getDocs(query(collection(db, 'patients'), limit(1)));
    console.log(`✅ Patients collection exists (${patientsSnapshot.empty ? 'but is empty' : 'has data'})`);

    console.log('\n✅ Test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
