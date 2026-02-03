/**
 * Script para verificar se um paciente existe no Firestore
 * Uso: node scripts/check-patient.cjs <patient_id>
 */

const { getFirebaseAdmin } = require('./lib/firebase-admin-helper.cjs');

const { db, serviceAccount } = getFirebaseAdmin();

// Verificar project_id da service account
console.log('Service account project_id:', serviceAccount.project_id);

async function checkPatient(patientId) {
  console.log(`\n🔍 Verificando paciente: ${patientId}\n`);

  try {
    // Verificar paciente específico
    const patientDoc = await db.collection('patients').doc(patientId).get();
    console.log('✅ Paciente específico existe:', patientDoc.exists);
    if (patientDoc.exists) {
      const data = patientDoc.data();
      console.log('Dados do paciente:');
      console.log('  - Nome:', data.name || data.full_name || 'N/A');
      console.log('  - Email:', data.email || 'N/A');
      console.log('  - Telefone:', data.phone || 'N/A');
      console.log('  - CPF:', data.cpf || 'N/A');
      console.log('  - created_at:', data.created_at || 'N/A');
    } else {
      console.log('❌ Paciente NÃO encontrado no Firestore!');
    }
    console.log('');

    // Contar total de pacientes
    const allPatientsSnapshot = await db.collection('patients').limit(10).get();
    console.log(`📊 Total de pacientes (amostra): ${allPatientsSnapshot.size}`);
    console.log('\nPrimeiros pacientes (até 10):');
    allPatientsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ID: ${doc.id.substring(0, 8)}...`);
      console.log(`    Nome: ${data.name || data.full_name || 'N/A'}`);
    });

    // Verificar se o appointment existe
    console.log('\n🔍 Verificando appointment...');
    const appointmentId = '2b1a34a7-4f92-4010-ba38-607716efd366';
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (appointmentDoc.exists) {
      const data = appointmentDoc.data();
      console.log('✅ Appointment encontrado:');
      console.log('  - ID:', appointmentId);
      console.log('  - patient_id:', data.patient_id || 'N/A');
      console.log('  - status:', data.status || 'N/A');
      console.log('  - date:', data.date || data.appointment_date || 'N/A');

      // Verificar se o patient_id do appointment existe
      if (data.patient_id) {
        console.log('\n🔍 Verificando se o patient_id do appointment existe...');
        const refPatientDoc = await db.collection('patients').doc(data.patient_id).get();
        console.log('Paciente do appointment existe:', refPatientDoc.exists);
      }
    } else {
      console.log('❌ Appointment NÃO encontrado!');
    }

  } catch (error) {
    console.error('Erro:', error.message);
    if (error.code) console.error('Code:', error.code);
  }
}

// Executar
const patientId = process.argv[2] || 'aeb5c99b-051c-46a7-bce1-f664efc48fef';
checkPatient(patientId).then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
