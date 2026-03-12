
import fetch from 'node-fetch';

const API_URL = 'https://api-pro.moocafisio.com.br/api';
const SESSION_TOKEN = '3hZBIWWMdjeVFm8svtpgJSlrz4gnGsjn.Gtp%2Bh8sj0ezODtBvIh36HU9xhrh9SkU7wXjYXR5ILLg%3D';

async function runTest() {
  console.log('🚀 Iniciando Validação de Integrações API...');

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `__Secure-neon-auth.session_token=${SESSION_TOKEN}`
  };

  try {
    // 1. CRIAR PACIENTE
    console.log('\n[1/4] Criando Paciente...');
    const patientRes = await fetch(`${API_URL}/patients`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        full_name: 'Teste Integração Inngest ' + Date.now(),
        phone: '5511999999999',
        email: 'teste@exemplo.com'
      })
    });
    
    const patientData = await patientRes.json();
    if (!patientRes.ok) throw new Error('Falha ao criar paciente: ' + JSON.stringify(patientData));
    const patient = patientData.data;
    console.log('✅ Paciente criado:', patient.id);

    // 2. CRIAR AGENDAMENTO (Gatilha Inngest + WhatsApp)
    console.log('\n[2/4] Criando Agendamento (Dispara Inngest)...');
    const appointmentRes = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patientId: patient.id,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
        startTime: '10:00',
        endTime: '11:00',
        status: 'scheduled'
      })
    });

    const appointmentData = await appointmentRes.json();
    if (!appointmentRes.ok) throw new Error('Falha ao criar agendamento: ' + JSON.stringify(appointmentData));
    const appointment = appointmentData.data;
    console.log('✅ Agendamento criado:', appointment.id);

    // 3. EDITAR AGENDAMENTO
    console.log('\n[3/4] Editando Agendamento...');
    const updateRes = await fetch(`${API_URL}/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'confirmed',
        notes: 'Validado via Script'
      })
    });
    if (!updateRes.ok) throw new Error('Falha ao editar agendamento');
    console.log('✅ Agendamento editado para status: confirmed');

    // 4. LIMPEZA (OPCIONAL - vamos deixar para log no Inngest)
    console.log('\n[4/4] Finalizando e limpando...');
    // await fetch(`${API_URL}/appointments/${appointment.id}`, { method: 'DELETE', headers });
    // await fetch(`${API_URL}/patients/${patient.id}`, { method: 'DELETE', headers });
    
    console.log('\n✨ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('Vá para o painel do Inngest e Axiom para ver os eventos processados.');

  } catch (err) {
    console.error('\n❌ ERRO DURANTE VALIDAÇÃO:', err.message);
  }
}

runTest();
