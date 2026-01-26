#!/usr/bin/env node
/**
 * Script to get a valid appointment ID from Firebase Firestore
 * Used for E2E testing the SOAP evolution flow
 *
 * @version 2.0.0 - Fixed Firestore Admin API usage
 */

import { getAdminDb } from '../src/lib/firebase/admin.js';
import { loadEnv } from 'vite';

// Load environment variables
const env = loadEnv('development', process.cwd(), '');

async function getAppointmentId() {
  try {
    console.log('🔍 Connecting to Firebase...');

    const db = getAdminDb();

    console.log('📋 Querying appointments collection...');

    // Query for appointments with 'agendado' or 'confirmado' status
    const snapshot = await db
      .collection('appointments')
      .where('status', '==', 'agendado')
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Try 'confirmado' status
      const confirmSnapshot = await db
        .collection('appointments')
        .where('status', '==', 'confirmado')
        .limit(1)
        .get();

      if (confirmSnapshot.empty) {
        // Get any appointment
        const anySnapshot = await db
          .collection('appointments')
          .limit(1)
          .get();

        if (anySnapshot.empty) {
          console.log('❌ No appointments found in the database');
          console.log('\n💡 Creating a test appointment...');

          // Create a test appointment using doc().create()
          const newAppointmentRef = db.collection('appointments').doc();
          await newAppointmentRef.create({
            patient_id: 'test-patient',
            patient_name: 'Test Patient',
            date: new Date().toISOString().split('T')[0],
            time: '14:00',
            type: 'Fisioterapia',
            status: 'agendado',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          console.log(`✅ Created test appointment with ID: ${newAppointmentRef.id}`);
          console.log(`\n📝 Export the appointment ID:`);
          console.log(`export APPOINTMENT_ID="${newAppointmentRef.id}"`);
          return newAppointmentRef.id;
        }

        const doc = anySnapshot.docs[0];
        console.log(`✅ Found appointment (any status): ${doc.id}`);
        console.log(`   Status: ${doc.data().status}`);
        console.log(`   Patient: ${doc.data().patient_name || doc.data().patient_id || 'N/A'}`);
        console.log(`\n📝 Export the appointment ID:`);
        console.log(`export APPOINTMENT_ID="${doc.id}"`);
        return doc.id;
      }

      const doc = confirmSnapshot.docs[0];
      console.log(`✅ Found confirmed appointment: ${doc.id}`);
      console.log(`   Patient: ${doc.data().patient_name || doc.data().patient_id || 'N/A'}`);
      console.log(`   Date: ${doc.data().date}`);
      console.log(`   Time: ${doc.data().time}`);
      console.log(`\n📝 Export the appointment ID:`);
      console.log(`export APPOINTMENT_ID="${doc.id}"`);
      return doc.id;
    }

    const doc = snapshot.docs[0];
    console.log(`✅ Found scheduled appointment: ${doc.id}`);
    console.log(`   Patient: ${doc.data().patient_name || doc.data().patient_id || 'N/A'}`);
    console.log(`   Date: ${doc.data().date}`);
    console.log(`   Time: ${doc.data().time}`);
    console.log(`\n📝 Export the appointment ID:`);
    console.log(`export APPOINTMENT_ID="${doc.id}"`);
    return doc.id;

  } catch (error) {
    console.error('❌ Error getting appointment ID:', error.message);

    if (error.message.includes('FIREBASE_PROJECT_ID')) {
      console.log('\n💡 Make sure FIREBASE_PROJECT_ID is set in your environment');
    }

    if (error.message.includes('credentials') || error.message.includes('credential')) {
      console.log('\n💡 Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set, or run in an environment with Application Default Credentials');
    }

    process.exit(1);
  }
}

// Run the script
getAppointmentId().then(id => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
