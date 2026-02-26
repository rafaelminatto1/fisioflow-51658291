
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

// IDs dos agendamentos criados
const testAppointmentIds = [
  'fda42bd2-cca8-40b5-a9ef-351e248b69b5',
  '60b33a38-cc85-4707-8b9b-39fd210c4bdc'
];

console.log('🔍 Testando acesso aos novos agendamentos...\n');

// Fazer login
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (authError) {
  console.error('❌ Erro ao autenticar:', authError.message);
  process.exit(1);
}

console.log('✅ Usuário autenticado!\n');

// Verificar se é admin
const { data: userRoles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', authData.user.id)
  .eq('role', 'admin');

const isAdmin = (userRoles?.length || 0) > 0;
console.log(`   É admin: ${isAdmin ? '✅ SIM' : '❌ NÃO'}\n`);

// Testar cada agendamento usando a mesma query que o código usa
for (const appointmentId of testAppointmentIds) {
  console.log(`📋 Testando agendamento: ${appointmentId.substring(0, 8)}...`);
  
  // Verificar sessão (como o código faz)
  const { data: { session } } = await supabase.auth.getSession();
  console.log(`   Sessão ativa: ${session ? '✅ SIM' : '❌ NÃO'}`);
  
  // Fazer query exata que o código usa
  const result = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle();
  
  console.log(`   Status: ${result.status}`);
  console.log(`   Erro: ${result.error ? result.error.message : 'Nenhum'}`);
  console.log(`   Dados encontrados: ${result.data ? '✅ SIM' : '❌ NÃO'}`);
  
  if (result.data) {
    console.log(`   - Patient ID: ${result.data.patient_id}`);
    console.log(`   - Organization ID: ${result.data.organization_id || 'NULL'}`);
    console.log(`   - Status: ${result.data.status}`);
    
    // Buscar paciente
    if (result.data.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', result.data.patient_id)
        .maybeSingle();
      
      if (patient) {
        console.log(`   - Paciente: ${patient.full_name || 'N/A'}`);
      } else {
        console.log(`   - ⚠️ Paciente não encontrado`);
      }
    }
  } else {
    console.log(`   ⚠️ PROBLEMA: Agendamento não encontrado mesmo sendo admin!`);
  }
  
  console.log('');
}

await supabase.auth.signOut();
console.log('👋 Logout realizado.');
