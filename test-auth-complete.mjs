// Teste completo de autenticação, perfil e organização

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tentar ler variáveis de ambiente do .env
let SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

// Se não encontrar, usar valores padrão do projeto (do client.ts)
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  SUPABASE_URL = "https://ycvbtjfrchcyvmkvuocu.supabase.co";
  SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmJ0amZyY2hjeXZta3Z1b2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTA5OTQsImV4cCI6MjA3NTE2Njk5NH0.L5maWG2hc3LVHEUMOzfTRTjYwIAJFXx3zan3G-Y1zAA";
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const testUsers = [
  { email: 'admin@activityfisio.com', password: 'Admin@123', expectedRole: 'admin', name: 'Admin' },
  { email: 'fisio@activityfisio.com', password: 'Fisio@123', expectedRole: 'fisioterapeuta', name: 'Fisioterapeuta' },
  { email: 'estagiario@activityfisio.com', password: 'Estagiario@123', expectedRole: 'estagiario', name: 'Estagiário' },
];

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logResult(test, passed, message) {
  if (passed) {
    console.log(`✅ ${test}: ${message}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${test}: ${message}`);
    testResults.failed++;
    testResults.errors.push({ test, message });
  }
}

async function testLoginAndProfile() {
  console.log('\n📋 TESTE 1: Login e Carregamento de Perfil\n');
  
  for (const user of testUsers) {
    console.log(`\n👤 Testando: ${user.name} (${user.email})`);
    
    try {
      // 1. Fazer login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          logResult(`Login ${user.name}`, false, `Usuário não existe ou credenciais inválidas (esperado se usuário não foi criado)`);
        } else {
          logResult(`Login ${user.name}`, false, `Erro: ${authError.message}`);
        }
        continue;
      }
      
      if (!authData.user) {
        logResult(`Login ${user.name}`, false, 'User não retornado após login');
        continue;
      }
      
      logResult(`Login ${user.name}`, true, `User ID: ${authData.user.id}`);
      
      // 2. Verificar se profile é carregado
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      
      if (profileError) {
        logResult(`Profile ${user.name}`, false, `Erro ao buscar profile: ${profileError.message}`);
        await supabase.auth.signOut();
        continue;
      }
      
      if (!profile) {
        logResult(`Profile ${user.name}`, false, 'Profile não encontrado');
        await supabase.auth.signOut();
        continue;
      }
      
      logResult(`Profile ${user.name}`, true, `Profile encontrado: ${profile.full_name || 'Sem nome'}`);
      
      // 3. Verificar organization_id
      if (!profile.organization_id) {
        logResult(`Organization ID ${user.name}`, false, 'organization_id não encontrado no profile');
      } else {
        logResult(`Organization ID ${user.name}`, true, `Organization ID: ${profile.organization_id}`);
      }
      
      // 4. Verificar role
      if (profile.role !== user.expectedRole) {
        logResult(`Role ${user.name}`, false, `Role esperado: ${user.expectedRole}, encontrado: ${profile.role || 'null'}`);
      } else {
        logResult(`Role ${user.name}`, true, `Role correto: ${profile.role}`);
      }
      
      // Logout
      await supabase.auth.signOut();
      
    } catch (err) {
      logResult(`Teste ${user.name}`, false, `Exceção: ${err.message}`);
      await supabase.auth.signOut();
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function testOrganizationIsolation() {
  console.log('\n📋 TESTE 2: Isolamento de Dados por Organização\n');
  
  // Login como admin
  const { data: adminAuth, error: adminError } = await supabase.auth.signInWithPassword({
    email: testUsers[0].email,
    password: testUsers[0].password
  });
  
  if (adminError || !adminAuth.user) {
    logResult('Isolamento - Login Admin', false, 'Não foi possível fazer login como admin');
    return;
  }
  
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', adminAuth.user.id)
    .single();
  
  if (!adminProfile?.organization_id) {
    logResult('Isolamento - Org Admin', false, 'Admin não tem organization_id');
    await supabase.auth.signOut();
    return;
  }
  
  const adminOrgId = adminProfile.organization_id;
  logResult('Isolamento - Org Admin', true, `Admin Org ID: ${adminOrgId}`);
  
  // Buscar pacientes da organização do admin
  const { data: adminPatients, error: adminPatientsError } = await supabase
    .from('patients')
    .select('id, name, organization_id')
    .eq('organization_id', adminOrgId)
    .limit(5);
  
  if (adminPatientsError) {
    logResult('Isolamento - Buscar Pacientes Admin', false, `Erro: ${adminPatientsError.message}`);
  } else {
    logResult('Isolamento - Buscar Pacientes Admin', true, `Encontrados ${adminPatients?.length || 0} pacientes`);
    
    // Verificar se todos os pacientes pertencem à organização correta
    const allCorrect = adminPatients?.every(p => p.organization_id === adminOrgId) ?? true;
    if (allCorrect && adminPatients && adminPatients.length > 0) {
      logResult('Isolamento - Validação Pacientes', true, 'Todos os pacientes pertencem à organização correta');
    } else if (adminPatients && adminPatients.length === 0) {
      logResult('Isolamento - Validação Pacientes', true, 'Nenhum paciente encontrado (pode ser esperado)');
    } else {
      logResult('Isolamento - Validação Pacientes', false, 'Alguns pacientes não pertencem à organização correta');
    }
  }
  
  // Buscar agendamentos da organização do admin
  const { data: adminAppointments, error: adminAppointmentsError } = await supabase
    .from('appointments')
    .select('id, organization_id')
    .eq('organization_id', adminOrgId)
    .limit(5);
  
  if (adminAppointmentsError) {
    logResult('Isolamento - Buscar Agendamentos Admin', false, `Erro: ${adminAppointmentsError.message}`);
  } else {
    logResult('Isolamento - Buscar Agendamentos Admin', true, `Encontrados ${adminAppointments?.length || 0} agendamentos`);
    
    const allCorrect = adminAppointments?.every(a => a.organization_id === adminOrgId) ?? true;
    if (allCorrect && adminAppointments && adminAppointments.length > 0) {
      logResult('Isolamento - Validação Agendamentos', true, 'Todos os agendamentos pertencem à organização correta');
    } else if (adminAppointments && adminAppointments.length === 0) {
      logResult('Isolamento - Validação Agendamentos', true, 'Nenhum agendamento encontrado (pode ser esperado)');
    } else {
      logResult('Isolamento - Validação Agendamentos', false, 'Alguns agendamentos não pertencem à organização correta');
    }
  }
  
  await supabase.auth.signOut();
}

async function testDataFiltering() {
  console.log('\n📋 TESTE 3: Filtragem de Dados por Organização\n');
  
  // Testar com cada usuário
  for (const user of testUsers) {
    console.log(`\n👤 Testando filtragem para: ${user.name}`);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
    
    if (authError || !authData.user) {
      logResult(`Filtragem - Login ${user.name}`, false, 'Não foi possível fazer login');
      continue;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', authData.user.id)
      .single();
    
    if (!profile?.organization_id) {
      logResult(`Filtragem - Org ${user.name}`, false, 'Usuário não tem organization_id');
      await supabase.auth.signOut();
      continue;
    }
    
    const userOrgId = profile.organization_id;
    
    // Testar busca de pacientes (deve retornar apenas da organização do usuário)
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name, organization_id')
      .limit(10);
    
    if (patientsError) {
      logResult(`Filtragem - Pacientes ${user.name}`, false, `Erro: ${patientsError.message}`);
    } else {
      const allFromUserOrg = patients?.every(p => p.organization_id === userOrgId) ?? true;
      if (allFromUserOrg && patients && patients.length > 0) {
        logResult(`Filtragem - Pacientes ${user.name}`, true, `Todos os ${patients.length} pacientes são da organização do usuário`);
      } else if (patients && patients.length === 0) {
        logResult(`Filtragem - Pacientes ${user.name}`, true, 'Nenhum paciente encontrado (RLS funcionando)');
      } else {
        const wrongOrg = patients?.find(p => p.organization_id !== userOrgId);
        logResult(`Filtragem - Pacientes ${user.name}`, false, `Paciente de outra organização encontrado: ${wrongOrg?.id}`);
      }
    }
    
    // Testar busca de agendamentos
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, organization_id')
      .limit(10);
    
    if (appointmentsError) {
      logResult(`Filtragem - Agendamentos ${user.name}`, false, `Erro: ${appointmentsError.message}`);
    } else {
      const allFromUserOrg = appointments?.every(a => a.organization_id === userOrgId) ?? true;
      if (allFromUserOrg && appointments && appointments.length > 0) {
        logResult(`Filtragem - Agendamentos ${user.name}`, true, `Todos os ${appointments.length} agendamentos são da organização do usuário`);
      } else if (appointments && appointments.length === 0) {
        logResult(`Filtragem - Agendamentos ${user.name}`, true, 'Nenhum agendamento encontrado (RLS funcionando)');
      } else {
        const wrongOrg = appointments?.find(a => a.organization_id !== userOrgId);
        logResult(`Filtragem - Agendamentos ${user.name}`, false, `Agendamento de outra organização encontrado: ${wrongOrg?.id}`);
      }
    }
    
    await supabase.auth.signOut();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando Testes Completos de Autenticação e Organização\n');
  console.log('📡 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Key:', SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...\n');
  
  try {
    await testLoginAndProfile();
    await testOrganizationIsolation();
    await testDataFiltering();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(60));
    console.log(`✅ Testes passados: ${testResults.passed}`);
    console.log(`❌ Testes falhados: ${testResults.failed}`);
    console.log(`📈 Taxa de sucesso: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ Erros encontrados:');
      testResults.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.test}: ${err.message}`);
      });
    }
    
    console.log('\n🏁 Testes concluídos!\n');
    
    // Exit code baseado no resultado
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n💥 Erro fatal nos testes:', error);
    process.exit(1);
  }
}

runAllTests();

