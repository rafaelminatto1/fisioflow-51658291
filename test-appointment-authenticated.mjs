
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

// Credenciais de teste
const email = 'REDACTED_EMAIL';
const password = 'REDACTED';

const appointmentId = '5110047d-c123-49fa-ba1e-a62ec7afce01'; // ID do log mais recente

console.log('🔐 Autenticando usuário...\n');

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
console.log(`   User ID: ${authData.user.id}`);
console.log(`   Email: ${authData.user.email}\n`);

// Agora testar a query com usuário autenticado
console.log(`🔍 Buscando agendamento ${appointmentId}...\n`);

const { data: appointment, error: appointmentError, status, statusText } = await supabase
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .maybeSingle();

console.log(`Status: ${status} ${statusText}`);
console.log(`Erro: ${appointmentError ? appointmentError.message : 'Nenhum'}`);
console.log(`Código: ${appointmentError?.code || 'N/A'}`);
console.log(`Dados encontrados: ${appointment ? '✅ SIM' : '❌ NÃO'}`);

if (appointment) {
  console.log('\n📋 Dados do agendamento:');
  console.log(`   - ID: ${appointment.id}`);
  console.log(`   - Patient ID: ${appointment.patient_id}`);
  console.log(`   - Organization ID: ${appointment.organization_id || 'NULL'}`);
  console.log(`   - Status: ${appointment.status}`);
  console.log(`   - Date: ${appointment.appointment_date || appointment.date}`);
  
  // Buscar paciente
  if (appointment.patient_id) {
    console.log('\n👤 Buscando paciente...');
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', appointment.patient_id)
      .maybeSingle();
    
    if (patient) {
      console.log(`   ✅ Paciente encontrado: ${patient.full_name || 'N/A'}`);
    } else {
      console.log(`   ❌ Paciente não encontrado: ${patientError?.message || 'N/A'}`);
    }
  }
} else {
  console.log('\n⚠️ Agendamento não encontrado!');
  console.log('   Possíveis causas:');
  console.log('   1. RLS ainda está bloqueando');
  console.log('   2. Agendamento não existe no banco');
  console.log('   3. Organization ID não coincide');
  
  // Verificar organização do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', authData.user.id)
    .single();
  
  console.log(`\n   Usuário - Organization ID: ${profile?.organization_id || 'NULL'}`);
  console.log(`   Usuário - Role: ${profile?.role || 'NULL'}`);
  
  // Verificar se o agendamento existe (sem RLS, usando service role seria necessário)
  console.log('\n   Tentando buscar qualquer agendamento para verificar RLS...');
  const { data: anyAppointment, error: anyError } = await supabase
    .from('appointments')
    .select('id, organization_id')
    .limit(1);
  
  if (anyAppointment && anyAppointment.length > 0) {
    console.log(`   ✅ RLS permite ver agendamentos (encontrado ${anyAppointment.length})`);
    console.log(`   Exemplo - Organization ID: ${anyAppointment[0].organization_id || 'NULL'}`);
  } else {
    console.log(`   ❌ RLS está bloqueando todos os agendamentos!`);
    console.log(`   Erro: ${anyError?.message || 'N/A'}`);
  }
}

// Logout
await supabase.auth.signOut();
console.log('\n👋 Logout realizado.');
