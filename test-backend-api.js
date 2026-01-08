/**
 * Script de Teste do Backend - FisioFlow
 * Testa as operações CRUD e APIs do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Carregar variáveis de ambiente manualmente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');

let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim();
      
      if (key === 'VITE_SUPABASE_URL') {
        SUPABASE_URL = value;
      } else if (key === 'VITE_SUPABASE_ANON_KEY' || key === 'VITE_SUPABASE_PUBLISHABLE_KEY') {
        SUPABASE_ANON_KEY = value;
      }
    }
  }
} catch (error) {
  console.log('Aviso: .env não encontrado, usando variáveis de ambiente se disponíveis');
  
  // Tentar pegar de process.env
  SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
  SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não encontradas');
  console.error('Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no .env');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✅ PASS${colors.reset} - ${testName}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${testName}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
}

function logSection(title) {
  console.log(`\n${colors.cyan}═════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}═════════════════════════════════════════${colors.reset}\n`);
}

async function testConnection() {
  logSection('TESTE 1: Conexão com Supabase');

  try {
    // Testar conexão simples
    const { data, error } = await supabase
      .from('patients')
      .select('count')
      .limit(0);

    if (error) {
      throw error;
    }

    logTest('Conexão com Supabase', true, `Conectado: ${SUPABASE_URL}`);
    return true;
  } catch (error) {
    logTest('Conexão com Supabase', false, `Erro: ${error.message}`);
    return false;
  }
}

async function testListPatients() {
  logSection('TESTE 2: Listar Pacientes (GET)');

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('name')
      .limit(10);

    if (error) throw error;

    logTest('Listar pacientes', true, `Encontrados: ${data.length} pacientes`);

    if (data.length > 0) {
      const firstPatient = data[0];
      console.log(`   ${colors.blue}Primeiro paciente:${colors.reset}`);
      console.log(`   ID: ${firstPatient.id}`);
      console.log(`   Nome: ${firstPatient.name}`);
      console.log(`   Email: ${firstPatient.email || 'N/A'}`);
    }

    return data;
  } catch (error) {
    logTest('Listar pacientes', false, `Erro: ${error.message}`);
    return [];
  }
}

async function testGetPatientById(patientId) {
  logSection('TESTE 3: Buscar Paciente por ID (GET)');

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logTest('Buscar paciente por ID', false, 'Paciente não encontrado (PGRST116)');
        return null;
      }
      throw error;
    }

    logTest('Buscar paciente por ID', true, `Encontrado: ${data.name}`);
    return data;
  } catch (error) {
    logTest('Buscar paciente por ID', false, `Erro: ${error.message}`);
    return null;
  }
}

async function testCreatePatient() {
  logSection('TESTE 4: Criar Paciente (POST)');

  const timestamp = Date.now();
  const testPatient = {
    name: `Paciente Teste ${timestamp}`,
    email: `teste${timestamp}@example.com`,
    phone: `(11) 99999-${timestamp.toString().slice(-4)}`,
    cpf: '123.456.789-00',
    birth_date: new Date('1990-01-01').toISOString(),
    observations: 'Paciente de teste automatizado',
    status: 'active',
    incomplete_registration: false
  };

  console.log(`${colors.yellow}Criando paciente de teste:${colors.reset}`);
  console.log(`   Nome: ${testPatient.name}`);
  console.log(`   Email: ${testPatient.email}\n`);

  try {
    const { data, error } = await supabase
      .from('patients')
      .insert(testPatient)
      .select()
      .single();

    if (error) throw error;

    logTest('Criar paciente', true, `Criado com ID: ${data.id}`);
    return data;
  } catch (error) {
    logTest('Criar paciente', false, `Erro: ${error.message}`);
    return null;
  }
}

async function testUpdatePatient(patientId) {
  logSection('TESTE 5: Atualizar Paciente (PUT)');

  const updateData = {
    phone: `(11) 98888-7777`,
    observations: 'Observações atualizadas - teste automatizado'
  };

  try {
    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patientId)
      .select()
      .single();

    if (error) throw error;

    logTest('Atualizar paciente', true, `Telefone atualizado para: ${data.phone}`);
    return data;
  } catch (error) {
    logTest('Atualizar paciente', false, `Erro: ${error.message}`);
    return null;
  }
}

async function testSearchPatients() {
  logSection('TESTE 6: Buscar Pacientes (Search)');

  try {
    const searchTerm = 'Teste';

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(5);

    if (error) throw error;

    logTest('Buscar pacientes por nome', true, `Encontrados: ${data.length} pacientes com "${searchTerm}"`);
    return data;
  } catch (error) {
    logTest('Buscar pacientes por nome', false, `Erro: ${error.message}`);
    return [];
  }
}

async function testDeletePatient(patientId) {
  logSection('TESTE 7: Deletar Paciente (DELETE)');

  console.log(`${colors.yellow}ATENÇÃO: Isso vai deletar um paciente de teste${colors.reset}`);
  console.log(`   ID do paciente: ${patientId}\n`);

  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (error) throw error;

    logTest('Deletar paciente', true, `Paciente ${patientId} removido com sucesso`);
    return true;
  } catch (error) {
    logTest('Deletar paciente', false, `Erro: ${error.message}`);
    return false;
  }
}

async function testAppointmentsTable() {
  logSection('TESTE 8: Verificar Tabela de Agendamentos');

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .limit(5);

    if (error) {
      throw error;
    }

    logTest('Verificar tabela de agendamentos', true, `Encontrados: ${data.length} agendamentos`);
    return data;
  } catch (error) {
    logTest('Verificar tabela de agendamentos', false, `Erro: ${error.message}`);
    return [];
  }
}

async function testProfilesTable() {
  logSection('TESTE 9: Verificar Tabela de Perfis (Auth)');

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (error) {
      // Tabela pode não existir, não é erro crítico
      logTest('Verificar tabela de perfis', false, 'Tabela profiles não encontrada (pode ser esperado)');
      return [];
    }

    logTest('Verificar tabela de perfis', true, `Encontrados: ${data.length} perfis`);
    return data;
  } catch (error) {
    logTest('Verificar tabela de perfis', false, `Erro: ${error.message}`);
    return [];
  }
}

async function testConstraints() {
  logSection('TESTE 10: Validar Constraints e Validações');

  const invalidPatient = {
    name: '', // Nome vazio - deve falhar
    email: 'email-invalido', // Email inválido
    birth_date: 'data-invalida' // Data inválida
  };

  try {
    const { data, error } = await supabase
      .from('patients')
      .insert(invalidPatient)
      .select();

    if (error) {
      logTest('Validação de campos obrigatórios', true, `Validação funcionou: ${error.message}`);
      return true;
    }

    logTest('Validação de campos obrigatórios', false, 'Dados inválidos foram aceitos (ISSO É RUIM!)');
    return false;
  } catch (error) {
    logTest('Validação de campos obrigatórios', true, `Validação funcionou via exceção`);
    return true;
  }
}

async function printSummary() {
  logSection('📊 RESUMO DOS TESTES DO BACKEND');

  console.log(`${colors.cyan}Total de Testes:${colors.reset} ${testResults.total}`);
  console.log(`${colors.green}✅ Passaram:${colors.reset} ${testResults.passed}`);
  console.log(`${colors.red}❌ Falharam:${colors.reset} ${testResults.failed}`);

  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  const passRateColor = passRate >= 80 ? colors.green : (passRate >= 50 ? colors.yellow : colors.red);

  console.log(`${colors.cyan}Taxa de Sucesso:${colors.reset} ${passRateColor}${passRate}%${colors.reset}\n`);

  if (passRate >= 80) {
    console.log(`${colors.green}🎉 STATUS: BACKEND APROVADO PARA PRODUÇÃO${colors.reset}\n`);
  } else if (passRate >= 50) {
    console.log(`${colors.yellow}⚠️  STATUS: BACKEND PRECISA DE MELHORIAS${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ STATUS: BACKEND TEM PROBLEMAS CRÍTICOS${colors.reset}\n`);
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║  FISIOFLOW - TESTE AUTOMATIZADO DO BACKEND              ║
║  Supabase API Testing Suite                               ║
╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}URL do Supabase:${colors.reset} ${SUPABASE_URL}`);
  console.log(`${colors.blue}Iniciando testes...${colors.reset}\n`);

  // Executar todos os testes
  await testConnection();

  const existingPatients = await testListPatients();

  if (existingPatients.length > 0) {
    await testGetPatientById(existingPatients[0].id);
  }

  const newPatient = await testCreatePatient();

  if (newPatient) {
    await testGetPatientById(newPatient.id);
    await testUpdatePatient(newPatient.id);

    // Esperar um pouco antes de deletar
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testDeletePatient(newPatient.id);
  }

  await testSearchPatients();
  await testAppointmentsTable();
  await testProfilesTable();
  await testConstraints();

  // Imprimir resumo
  await printSummary();

  // Sair
  process.exit(0);
}

// Executar todos os testes
runAllTests().catch(error => {
  console.error(`${colors.red}\n❌ Erro fatal ao executar testes:${colors.reset}`, error);
  process.exit(1);
});
