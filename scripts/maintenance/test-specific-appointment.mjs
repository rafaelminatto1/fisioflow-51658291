
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
const appointmentId = 'd6fe312f-5f81-4f02-b04c-488cada921ed';

console.log('🔍 Testando agendamento específico...\n');

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

// Verificar se é admin
const { data: userRoles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', authData.user.id)
  .eq('role', 'admin');

const isAdmin = (userRoles?.length || 0) > 0;
console.log(`   É admin: ${isAdmin ? '✅ SIM' : '❌ NÃO'}\n`);

// Testar query exata que o código usa
console.log(`🔍 Buscando agendamento ${appointmentId}...`);
const { data: appointment, error: appointmentError, status, statusText } = await supabase
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .maybeSingle();

console.log(`   Status: ${status} ${statusText}`);
console.log(`   Erro: ${appointmentError ? appointmentError.message : 'Nenhum'}`);
console.log(`   Código: ${appointmentError?.code || 'N/A'}`);
console.log(`   Detalhes: ${appointmentError?.details || 'N/A'}`);
console.log(`   Dados encontrados: ${appointment ? '✅ SIM' : '❌ NÃO'}`);

if (appointment) {
  console.log(`\n📋 Dados do agendamento:`);
  console.log(`   - ID: ${appointment.id}`);
  console.log(`   - Patient ID: ${appointment.patient_id}`);
  console.log(`   - Organization ID: ${appointment.organization_id || 'NULL'}`);
  console.log(`   - Status: ${appointment.status}`);
} else {
  console.log('\n⚠️ Agendamento não encontrado!');
  
  // Verificar se existe sem RLS (usando service role seria necessário, mas vamos tentar outra abordagem)
  console.log('\n🔍 Verificando se o agendamento existe em qualquer organização...');
  const { data: anyAppointment } = await supabase
    .from('appointments')
    .select('id, organization_id, status')
    .eq('id', appointmentId)
    .maybeSingle();
  
  if (anyAppointment) {
    console.log(`   ✅ Agendamento existe mas RLS está bloqueando!`);
    console.log(`   - Organization ID: ${anyAppointment.organization_id || 'NULL'}`);
  } else {
    console.log(`   ❌ Agendamento não existe no banco de dados!`);
  }
  
  // Verificar organização do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', authData.user.id)
    .single();
  
  console.log(`\n   Usuário - Organization ID: ${profile?.organization_id || 'NULL'}`);
}

// Logout
await supabase.auth.signOut();
console.log('\n👋 Logout realizado.');
