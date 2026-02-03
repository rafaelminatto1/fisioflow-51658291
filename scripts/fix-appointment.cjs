const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

// Appointment ID que precisa ser corrigido
const appointmentId = '2b1a34a7-4f92-4010-ba38-607716efd366';
// Primeiro paciente válido encontrado
const newPatientId = 'NYkz4rbP5zeA7WHjDeZJ'; // rafael minatto De Martino

async function fixAppointment() {
  console.log('🔧 Corrigindo appointment:', appointmentId);
  console.log('Novo patient_id:', newPatientId, '\n');

  try {
    const appointmentRef = db.collection('appointments').doc(appointmentId);
    const doc = await appointmentRef.get();

    if (!doc.exists) {
      console.error('❌ Appointment não encontrado!');
      process.exit(1);
    }

    const currentData = doc.data();
    console.log('Dados atuais:');
    console.log('  - patient_id (antigo):', currentData.patient_id);
    console.log('  - status:', currentData.status);
    console.log('  - date:', currentData.date);

    // Atualizar com o novo patient_id
    await appointmentRef.update({
      patient_id: newPatientId,
      updated_at: new Date().toISOString()
    });

    console.log('\n✅ Appointment atualizado com sucesso!');
    console.log('Agora você pode clicar em "Iniciar Atendimento" normalmente.');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixAppointment().then(() => process.exit(0));
