
import { AppointmentService } from './src/services/appointmentService.ts';
import { db } from './src/integrations/firebase/app.ts';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

async function runAgendaTest() {
  console.log('🚀 Iniciando Teste de Estresse da Agenda...');
  
  const testOrgId = 'org_test_production';
  const testDate = '2026-12-25'; // Data futura
  const testTime = '10:00';

  try {
    // 1. Limpeza de resíduos de testes anteriores
    const q = query(collection(db, 'appointments'), where('organization_id', '==', testOrgId));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, 'appointments', d.id));
    }
    console.log('🧹 Limpeza concluída.');

    // 2. Teste de Criação
    console.log('📝 Criando agendamento de teste...');
    const newApt = await AppointmentService.createAppointment({
      patient_id: 'test_patient_id',
      appointment_date: testDate,
      appointment_time: testTime,
      duration: 60,
      type: 'fisioterapia',
      status: 'agendado',
      notes: 'Teste Automatizado de Produção'
    }, testOrgId);
    console.log('✅ Agendamento criado ID:', newApt.id);

    // 3. Teste de Conflito (Mesma hora)
    console.log('⚠️ Testando detecção de conflito...');
    try {
      await AppointmentService.createAppointment({
        patient_id: 'other_patient',
        appointment_date: testDate,
        appointment_time: testTime,
        duration: 60,
        type: 'fisioterapia'
      }, testOrgId, [newApt]);
      console.error('❌ ERRO: O sistema permitiu agendamento duplicado!');
    } catch (e) {
      console.log('✅ Sucesso: Conflito detectado corretamente:', e.message);
    }

    // 4. Teste de Atualização de Status
    console.log('🔄 Atualizando status para concluído...');
    await AppointmentService.updateStatus(newApt.id, 'concluido');
    console.log('✅ Status atualizado.');

    console.log('🏁 Teste da Agenda FINALIZADO COM SUCESSO.');
  } catch (error) {
    console.error('❌ FALHA NO TESTE:', error);
    process.exit(1);
  }
}

runAgendaTest();
