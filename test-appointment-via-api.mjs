
// Ler do .env ou usar valores padrão

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
  console.warn('⚠️ Não foi possível ler .env, usando valores padrão');
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY não encontrada!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const appointmentId = 'bafc8096-eba2-446c-952c-fe73b05c7933';

console.log('🔍 Testando query de agendamento via Supabase API...\n');
console.log(`Appointment ID: ${appointmentId}`);
console.log(`Supabase URL: ${SUPABASE_URL}\n`);

// Teste 1: Buscar agendamento sem relacionamento
console.log('1. Buscando agendamento (sem relacionamento)...');
const { data: appointment, error: appointmentError, status, statusText } = await supabase
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .maybeSingle();

console.log(`   Status: ${status} ${statusText}`);
console.log(`   Erro: ${appointmentError ? appointmentError.message : 'Nenhum'}`);
console.log(`   Código de erro: ${appointmentError?.code || 'N/A'}`);
console.log(`   Detalhes: ${appointmentError?.details || 'N/A'}`);
console.log(`   Hint: ${appointmentError?.hint || 'N/A'}`);
console.log(`   Dados encontrados: ${appointment ? 'SIM' : 'NÃO'}`);

if (appointment) {
  console.log(`   - ID: ${appointment.id}`);
  console.log(`   - Patient ID: ${appointment.patient_id}`);
  console.log(`   - Organization ID: ${appointment.organization_id}`);
  console.log(`   - Status: ${appointment.status}`);
} else if (!appointmentError) {
  console.log('   ⚠️ ATENÇÃO: Query retornou null sem erro - possível bloqueio de RLS!');
}

// Teste 2: Se encontrou agendamento, buscar paciente
if (appointment && appointment.patient_id) {
  console.log('\n2. Buscando paciente...');
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', appointment.patient_id)
    .maybeSingle();
  
  console.log(`   Erro: ${patientError ? patientError.message : 'Nenhum'}`);
  console.log(`   Dados encontrados: ${patient ? 'SIM' : 'NÃO'}`);
  
  if (patient) {
    console.log(`   - Nome: ${patient.full_name || 'N/A'}`);
    console.log(`   - Organization ID: ${patient.organization_id || 'N/A'}`);
  }
}

// Teste 3: Verificar se há outros agendamentos para comparar
console.log('\n3. Verificando outros agendamentos (para comparação)...');
const { data: allAppointments, error: allError } = await supabase
  .from('appointments')
  .select('id, patient_id, organization_id, status')
  .limit(5);

if (!allError && allAppointments) {
  console.log(`   Encontrados ${allAppointments.length} agendamentos`);
  allAppointments.forEach((apt, idx) => {
    console.log(`   ${idx + 1}. ID: ${apt.id.substring(0, 8)}..., Org: ${apt.organization_id || 'NULL'}, Status: ${apt.status}`);
  });
} else {
  console.log(`   Erro ao buscar: ${allError?.message || 'N/A'}`);
}

// Teste 4: Verificar políticas RLS (se possível via API)
console.log('\n4. Resumo:');
console.log(`   - Agendamento encontrado: ${appointment ? '✅ SIM' : '❌ NÃO'}`);
console.log(`   - Erro na query: ${appointmentError ? '❌ SIM' : '✅ NÃO'}`);
if (!appointment && !appointmentError) {
  console.log('   - ⚠️ PROBLEMA IDENTIFICADO: RLS pode estar bloqueando silenciosamente!');
  console.log('   - Solução: Verificar políticas RLS na tabela appointments');
}
