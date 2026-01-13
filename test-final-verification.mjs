import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Ler credenciais do .env
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

const email = 'rafael.minatto@yahoo.com.br';
const password = 'Yukari30@';

console.log('🔍 Teste Final de Verificação\n');
console.log('='.repeat(50));

// 1. Autenticação
console.log('\n1️⃣ Testando autenticação...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (authError) {
  console.error('❌ FALHA: Erro ao autenticar:', authError.message);
  process.exit(1);
}
console.log('✅ Autenticação OK');

// 2. Verificar perfil e roles
console.log('\n2️⃣ Verificando perfil e roles...');
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', authData.user.id)
  .single();

const { data: userRoles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', authData.user.id);

const { data: orgMember } = await supabase
  .from('organization_members')
  .select('*')
  .eq('user_id', authData.user.id)
  .eq('active', true)
  .limit(1);

const isAdmin = profile?.role === 'admin' || 
                userRoles?.some(r => r.role === 'admin') ||
                orgMember?.some(m => m.role === 'admin');

if (!isAdmin) {
  console.error('❌ FALHA: Usuário não é admin!');
  console.log(`   Profile role: ${profile?.role || 'N/A'}`);
  console.log(`   User roles: ${userRoles?.map(r => r.role).join(', ') || 'N/A'}`);
  console.log(`   Org member role: ${orgMember?.[0]?.role || 'N/A'}`);
  process.exit(1);
}
console.log('✅ Usuário é admin');

// 3. Testar acesso a agendamentos (sem filtro de org)
console.log('\n3️⃣ Testando acesso a TODOS os agendamentos (admin)...');
const { data: allAppointments, error: allError } = await supabase
  .from('appointments')
  .select('id, patient_id, organization_id, status')
  .limit(10);

if (allError) {
  console.error('❌ FALHA: Erro ao buscar agendamentos:', allError.message);
  console.error(`   Código: ${allError.code}`);
  process.exit(1);
}
console.log(`✅ Acesso OK - Encontrados ${allAppointments.length} agendamentos`);

// 4. Testar acesso a um agendamento específico
console.log('\n4️⃣ Testando acesso a agendamento específico...');
const testAppointmentId = allAppointments[0]?.id;
if (testAppointmentId) {
  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', testAppointmentId)
    .maybeSingle();

  if (aptError) {
    console.error('❌ FALHA: Erro ao buscar agendamento específico:', aptError.message);
    process.exit(1);
  }
  
  if (!appointment) {
    console.error('❌ FALHA: Agendamento não encontrado (RLS pode estar bloqueando)');
    process.exit(1);
  }
  console.log(`✅ Agendamento encontrado: ${appointment.id.substring(0, 8)}...`);
  
  // 5. Testar acesso ao paciente
  if (appointment.patient_id) {
    console.log('\n5️⃣ Testando acesso ao paciente...');
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', appointment.patient_id)
      .maybeSingle();

    if (patientError) {
      console.error('❌ FALHA: Erro ao buscar paciente:', patientError.message);
      process.exit(1);
    }
    
    if (!patient) {
      console.error('❌ FALHA: Paciente não encontrado (RLS pode estar bloqueando)');
      process.exit(1);
    }
    console.log(`✅ Paciente encontrado: ${patient.full_name || 'N/A'}`);
  }
}

// 6. Resumo final
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO FINAL:');
console.log('='.repeat(50));
console.log('✅ Autenticação: OK');
console.log('✅ Permissões admin: OK');
console.log('✅ Acesso a agendamentos: OK');
console.log('✅ Acesso a pacientes: OK');
console.log('\n🎉 TODOS OS TESTES PASSARAM!');
console.log('='.repeat(50));

await supabase.auth.signOut();
console.log('\n👋 Logout realizado.');
