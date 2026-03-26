/**
 * Script de diagnóstico para o problema "Iniciar Atendimento"
 * Copie e cole este código no console do navegador (F12) quando estiver na página de erro
 */

(async () => {
  console.log('🔍 Iniciando diagnóstico...\n');

  // Obter appointmentId da URL
  const pathParts = window.location.pathname.split('/');
  const appointmentId = pathParts[pathParts.length - 1];

  console.log(`📌 Appointment ID da URL: ${appointmentId}`);

  try {
    // Importar Firebase dinamicamente
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    // Obter instância do Firestore do window (se disponível) ou criar uma nova
    let db;
    if (window.__fisioflow_firebase__) {
      db = window.__fisioflow_firebase__.db;
      console.log('✅ Usando instância do Firestore existente');
    } else {
      console.error('❌ Instância do Firebase não encontrada no window');
      console.log('\n💡 Sugestões:');
      console.log('1. Verifique se você está logado no sistema');
      console.log('2. Recarregue a página (F5)');
      console.log('3. Limpe o cache do navegador (Ctrl+Shift+Delete)');
      return;
    }

    // Buscar appointment
    console.log('\n📋 Buscando appointment...');
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);

    if (!appointmentSnap.exists()) {
      console.error('❌ Appointment NÃO encontrado no Firestore!');
      console.log('\n💡 Isso significa que:');
      console.log('- O appointment foi excluído');
      console.log('- O ID está incorreto');
      console.log('- Você não tem permissão para acessar este appointment');
      return;
    }

    const appointment = appointmentSnap.data();
    console.log('✅ Appointment encontrado:');
    console.log('   - ID:', appointmentSnap.id);
    console.log('   - patient_id:', appointment.patient_id || '❌ NULL/UNDEFINED');
    console.log('   - status:', appointment.status || 'N/A');
    console.log('   - date:', appointment.date || appointment.appointment_date || 'N/A');
    console.log('   - therapist_id:', appointment.therapist_id || 'N/A');

    // Verificar se patient_id existe
    if (!appointment.patient_id) {
      console.error('\n❌ PROBLEMA ENCONTRADO: O appointment NÃO tem um patient_id!');
      console.log('\n💡 Isso explica o erro "Acesso não autorizado" / "Paciente não encontrado"');
      console.log('\n🔧 Soluções possíveis:');
      console.log('1. Editar o appointment e adicionar um paciente válido');
      console.log('2. Excluir este appointment e criar um novo com paciente');
      console.log('3. Verificar se há um bug na criação de appointments');
      return;
    }

    // Buscar patient
    console.log(`\n👥 Buscando patient ${appointment.patient_id}...`);
    const patientRef = doc(db, 'patients', appointment.patient_id);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      console.error('❌ Patient NÃO encontrado no Firestore!');
      console.log(`\n💡 O appointment tem o patient_id "${appointment.patient_id}" mas este paciente NÃO existe no banco de dados.`);
      console.log('\n🔧 Soluções possíveis:');
      console.log('1. O paciente pode ter sido excluído - editar o appointment');
      console.log('2. Verificar se o ID do paciente está correto');
      console.log('3. Criar um novo paciente com este ID');
      return;
    }

    const patient = patientSnap.data();
    console.log('✅ Patient encontrado:');
    console.log('   - ID:', patientSnap.id);
    console.log('   - name:', patient.name || patient.full_name || 'Sem nome');
    console.log('   - email:', patient.email || 'N/A');
    console.log('   - phone:', patient.phone || 'N/A');

    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO: Todos os dados estão corretos!');
    console.log('\n💡 Se ainda assim há erro, pode ser um problema de:');
    console.log('- Permissões do Firestore (verifique as regras de segurança)');
    console.log('- Cache do React Query (tente recarregar com Ctrl+F5)');
    console.log('- Estado da aplicação (tente fazer logout e login novamente)');

  } catch (error) {
    console.error('\n❌ Erro durante diagnóstico:', error);
  }
})();
