
// Ler credenciais do .env

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

let SUPABASE_URL = 'https://ycvbtjfrchcyvmkvuocu.supabase.co';
let SUPABASE_ANON_KEY = '';

try {
  const envContent = readFileSync('.env', 'utf-8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\n]+)["']?/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=["']?([^"'\n]+)["']?/);
  
  if (urlMatch) SUPABASE_URL = urlMatch[1].replace(/["']/g, '');
  if (keyMatch) SUPABASE_ANON_KEY = keyMatch[1].replace(/["']/g, '');
} catch (e) {
  console.error('Erro ao ler .env:', e.message);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = 'REDACTED_EMAIL';
const password = 'REDACTED';

console.log('🔧 Criando agendamentos de teste...\n');

// Fazer login
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (authError) {
  console.error('❌ Erro ao autenticar:', authError.message);
  process.exit(1);
}

console.log('✅ Usuário autenticado!');
console.log(`   User ID: ${authData.user.id}\n`);

// Buscar perfil e organização
const { data: profile } = await supabase
  .from('profiles')
  .select('id, organization_id')
  .eq('user_id', authData.user.id)
  .single();

const organizationId = profile?.organization_id;
const profileId = profile?.id;
console.log(`   Profile ID: ${profileId || 'NULL'}`);
console.log(`   Organization ID: ${organizationId || 'NULL'}\n`);

if (!organizationId || !profileId) {
  console.error('❌ Usuário não tem organization_id ou profile_id!');
  process.exit(1);
}

// Buscar um paciente existente
console.log('👤 Buscando paciente existente...');
const { data: patients, error: patientsError } = await supabase
  .from('patients')
  .select('id, full_name, organization_id')
  .eq('organization_id', organizationId)
  .limit(1);

if (patientsError || !patients || patients.length === 0) {
  console.error('❌ Erro ao buscar pacientes:', patientsError?.message || 'Nenhum paciente encontrado');
  console.log('   Criando um paciente de teste...');
  
  // Criar paciente de teste
  const { data: newPatient, error: createPatientError } = await supabase
    .from('patients')
    .insert({
      full_name: 'Paciente Teste',
      organization_id: organizationId,
      phone: '11999999999',
      email: 'teste@example.com'
    })
    .select()
    .single();
  
  if (createPatientError || !newPatient) {
    console.error('❌ Erro ao criar paciente:', createPatientError?.message);
    process.exit(1);
  }
  
  console.log(`   ✅ Paciente criado: ${newPatient.id}`);
  var patientId = newPatient.id;
} else {
  patientId = patients[0].id;
  console.log(`   ✅ Paciente encontrado: ${patients[0].full_name} (${patientId.substring(0, 8)}...)`);
}

// Criar agendamentos de teste
console.log('\n📅 Criando agendamentos de teste...\n');

const testAppointments = [
  {
    patient_id: patientId,
    therapist_id: profileId, // Usar profile.id, não user.id
    organization_id: organizationId,
    appointment_date: new Date().toISOString().split('T')[0], // Hoje
    date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00:00',
    start_time: '10:00:00',
    end_time: '11:00:00',
    status: 'agendado',
    type: 'fisioterapia',
    duration: 60,
    notes: 'Agendamento de teste criado automaticamente'
  },
  {
    patient_id: patientId,
    therapist_id: profileId, // Usar profile.id, não user.id
    organization_id: organizationId,
    appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    appointment_time: '14:00:00',
    start_time: '14:00:00',
    end_time: '15:00:00',
    status: 'agendado',
    type: 'fisioterapia',
    duration: 60,
    notes: 'Agendamento de teste criado automaticamente'
  }
];

const createdAppointments = [];

for (const aptData of testAppointments) {
  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .insert(aptData)
    .select()
    .single();
  
  if (aptError) {
    console.error(`   ❌ Erro ao criar agendamento: ${aptError.message}`);
    console.error(`      Código: ${aptError.code}`);
    console.error(`      Detalhes: ${aptError.details}`);
  } else {
    console.log(`   ✅ Agendamento criado: ${appointment.id.substring(0, 8)}...`);
    console.log(`      Data: ${aptData.appointment_date} ${aptData.appointment_time}`);
    console.log(`      Status: ${aptData.status}`);
    createdAppointments.push(appointment);
  }
}

// Testar acesso aos agendamentos criados
console.log('\n🔍 Testando acesso aos agendamentos criados...\n');

for (const apt of createdAppointments) {
  const { data: testAppointment, error: testError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', apt.id)
    .maybeSingle();
  
  if (testError) {
    console.log(`   ❌ Erro ao acessar agendamento ${apt.id.substring(0, 8)}...: ${testError.message}`);
  } else if (testAppointment) {
    console.log(`   ✅ Agendamento ${apt.id.substring(0, 8)}... acessível!`);
  } else {
    console.log(`   ⚠️ Agendamento ${apt.id.substring(0, 8)}... não encontrado (RLS bloqueando?)`);
  }
}

// Resumo
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO:');
console.log('='.repeat(50));
console.log(`✅ Agendamentos criados: ${createdAppointments.length}`);
console.log(`✅ Paciente usado: ${patientId.substring(0, 8)}...`);
console.log(`✅ Organization ID: ${organizationId}`);
console.log('\n💡 Use estes IDs de agendamento para testar:');
createdAppointments.forEach((apt, idx) => {
  console.log(`   ${idx + 1}. ${apt.id}`);
});
console.log('='.repeat(50));

await supabase.auth.signOut();
console.log('\n👋 Logout realizado.');
