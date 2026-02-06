
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

console.log('🔐 Verificando acesso admin...\n');

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

// Verificar perfil
console.log('📋 Verificando perfil...');
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', authData.user.id)
  .single();

if (profileError) {
  console.error('❌ Erro ao buscar perfil:', profileError.message);
} else {
  console.log(`   ✅ Perfil encontrado`);
  console.log(`   - Nome: ${profile.full_name || 'N/A'}`);
  console.log(`   - Role: ${profile.role || 'N/A'}`);
  console.log(`   - Organization ID: ${profile.organization_id || 'NULL'}`);
}

// Verificar user_roles
console.log('\n👤 Verificando user_roles...');
const { data: userRoles, error: rolesError } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', authData.user.id);

if (rolesError) {
  console.error('❌ Erro ao buscar roles:', rolesError.message);
} else {
  console.log(`   ✅ Roles encontradas: ${userRoles.length}`);
  userRoles.forEach(role => {
    console.log(`   - ${role.role}`);
  });
}

// Verificar organization_members
if (profile?.organization_id) {
  console.log('\n🏢 Verificando organization_members...');
  const { data: orgMember, error: orgError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', authData.user.id)
    .eq('organization_id', profile.organization_id)
    .single();

  if (orgError) {
    console.error('❌ Erro ao buscar organization_member:', orgError.message);
  } else {
    console.log(`   ✅ Membro da organização encontrado`);
    console.log(`   - Role: ${orgMember.role || 'N/A'}`);
    console.log(`   - Active: ${orgMember.active ? 'Sim' : 'Não'}`);
  }
}

// Testar acesso a agendamentos
console.log('\n🔍 Testando acesso a agendamentos...');
const { data: appointments, error: appointmentsError } = await supabase
  .from('appointments')
  .select('id, patient_id, organization_id, status')
  .limit(5);

if (appointmentsError) {
  console.error('❌ Erro ao buscar agendamentos:', appointmentsError.message);
  console.error(`   Código: ${appointmentsError.code}`);
  console.error(`   Detalhes: ${appointmentsError.details}`);
} else {
  console.log(`   ✅ Acesso permitido! Encontrados ${appointments.length} agendamentos`);
  appointments.forEach((apt, idx) => {
    console.log(`   ${idx + 1}. ID: ${apt.id.substring(0, 8)}..., Org: ${apt.organization_id || 'NULL'}, Status: ${apt.status}`);
  });
}

// Resumo
console.log('\n📊 Resumo:');
const isAdmin = profile?.role === 'admin' || 
                userRoles?.some(r => r.role === 'admin') ||
                false;
console.log(`   - É admin: ${isAdmin ? '✅ SIM' : '❌ NÃO'}`);
console.log(`   - Pode acessar agendamentos: ${!appointmentsError ? '✅ SIM' : '❌ NÃO'}`);

if (!isAdmin) {
  console.log('\n⚠️ ATENÇÃO: Usuário não tem role de admin!');
  console.log('   Execute a migration novamente ou verifique manualmente.');
}

// Logout
await supabase.auth.signOut();
console.log('\n👋 Logout realizado.');
