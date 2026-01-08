#!/usr/bin/env node

/**
 * Script para testar as migrations de correção de colunas duplicadas
 * Este script verifica se as migrations podem ser aplicadas com sucesso
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas');
  process.exit(1);
}

console.log('📊 Testando conexão com Supabase...');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test 1: Verificar estrutura atual da tabela appointments
async function testAppointmentTableStructure() {
  console.log('\n🔍 Teste 1: Verificando estrutura da tabela appointments');

  try {
    const { data, error } = await supabase
      .rpc('check_table_structure', { table_name: 'appointments' })
      .select('*');

    if (error) {
      // Se a função não existe, usar uma query alternativa
      console.log('  ℹ️  Função check_table_structure não existe, usando consulta direta');

      // Tentar ler um registro para ver as colunas disponíveis
      const { data: sampleData, error: sampleError } = await supabase
        .from('appointments')
        .select('id, date, appointment_date, start_time, appointment_time')
        .limit(1);

      if (sampleError) {
        console.log('  ⚠️  Não foi possível acessar a tabela appointments:', sampleError.message);
        return false;
      }

      console.log('  ✅ Tabela appointments acessível');
      console.log('  📋 Colunas detectadas:', Object.keys(sampleData?.[0] || {}));

      // Verificar se as colunas duplicadas existem
      const hasDate = 'date' in (sampleData?.[0] || {});
      const hasAppointmentDate = 'appointment_date' in (sampleData?.[0] || {});
      const hasStartTime = 'start_time' in (sampleData?.[0] || {});
      const hasAppointmentTime = 'appointment_time' in (sampleData?.[0] || {});

      console.log(`  📊 Colunas de data:`);
      console.log(`     - date (nova): ${hasDate ? '✅' : '❌'}`);
      console.log(`     - appointment_date (antiga): ${hasAppointmentDate ? '✅' : '❌'}`);
      console.log(`  📊 Colunas de horário:`);
      console.log(`     - start_time (nova): ${hasStartTime ? '✅' : '❌'}`);
      console.log(`     - appointment_time (antiga): ${hasAppointmentTime ? '✅' : '❌'}`);

      if (hasDate && hasAppointmentDate) {
        console.log('  ⚠️  ATENÇÃO: Ambas as colunas de data existem (duplicação)');
      }
      if (hasStartTime && hasAppointmentTime) {
        console.log('  ⚠️  ATENÇÃO: Ambas as colunas de horário existem (duplicação)');
      }

      return true;
    }

    console.log('  ✅ Estrutura da tabela verificada com sucesso');
    console.log('  📋 Colunas encontradas:', data);
    return true;
  } catch (error) {
    console.log('  ❌ Erro ao verificar estrutura:', error.message);
    return false;
  }
}

// Test 2: Verificar estrutura da tabela patients
async function testPatientsTableStructure() {
  console.log('\n🔍 Teste 2: Verificando estrutura da tabela patients');

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, full_name')
      .limit(1);

    if (error) {
      console.log('  ❌ Erro ao acessar tabela patients:', error.message);
      return false;
    }

    console.log('  ✅ Tabela patients acessível');

    const hasName = 'name' in (data?.[0] || {});
    const hasFullName = 'full_name' in (data?.[0] || {});

    console.log('  📊 Colunas de nome:');
    console.log(`     - name (antiga): ${hasName ? '✅' : '❌'}`);
    console.log(`     - full_name (nova/padrão): ${hasFullName ? '✅' : '❌'}`);

    if (hasName && hasFullName) {
      console.log('  ⚠️  ATENÇÃO: Ambas as colunas de nome existem (inconsistência)');
    }

    return true;
  } catch (error) {
    console.log('  ❌ Erro:', error.message);
    return false;
  }
}

// Test 3: Verificar tabela prom_snapshots
async function testPromSnapshotsTable() {
  console.log('\n🔍 Teste 3: Verificando tabela prom_snapshots');

  try {
    const { data, error } = await supabase
      .from('prom_snapshots')
      .select('id, patient_id')
      .limit(1);

    if (error) {
      console.log('  ℹ️  Tabela prom_snapshots não existe ou não é acessível:', error.message);
      return null; // Não é um erro, a tabela pode não existir
    }

    console.log('  ✅ Tabela prom_snapshots acessível');
    console.log('  ℹ️  Verifique se a foreign key de patient_id aponta para patients ou auth.users');
    return true;
  } catch (error) {
    console.log('  ℹ️  Tabela prom_snapshots não existe:', error.message);
    return null;
  }
}

// Test 4: Verificar views
async function testViews() {
  console.log('\n🔍 Teste 4: Verificando views');

  const views = ['appointments_full', 'patient_appointment_summary', 'therapist_stats'];

  for (const viewName of views) {
    try {
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`  ❌ View ${viewName}: ${error.message}`);
      } else {
        console.log(`  ✅ View ${viewName}: acessível`);
      }
    } catch (error) {
      console.log(`  ℹ️  View ${viewName}: não existe ou erro - ${error.message}`);
    }
  }
}

// Test 5: Verificar dados de amostra
async function testSampleData() {
  console.log('\n🔍 Teste 5: Verificando dados de amostra');

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        appointment_date,
        start_time,
        appointment_time,
        patient_id,
        patients (
          name,
          full_name
        )
      `)
      .limit(5);

    if (error) {
      console.log('  ❌ Erro ao buscar dados:', error.message);
      return false;
    }

    console.log(`  ✅ ${data.length} agendamentos encontrados`);
    console.log('  📋 Exemplo de dados:');

    data.forEach((apt, index) => {
      console.log(`\n    Agendamento ${index + 1}:`);
      console.log(`      - date: ${apt.date || 'N/A'}`);
      console.log(`      - appointment_date: ${apt.appointment_date || 'N/A'}`);
      console.log(`      - start_time: ${apt.start_time || 'N/A'}`);
      console.log(`      - appointment_time: ${apt.appointment_time || 'N/A'}`);
      console.log(`      - patient.name: ${apt.patients?.name || 'N/A'}`);
      console.log(`      - patient.full_name: ${apt.patients?.full_name || 'N/A'}`);
    });

    // Verificar inconsistências
    const dateMismatch = data.filter(apt => apt.date !== apt.appointment_date);
    const timeMismatch = data.filter(apt => apt.start_time !== apt.appointment_time);
    const nameMismatch = data.filter(apt => apt.patients?.name && apt.patients?.full_name && apt.patients.name !== apt.patients.full_name);

    if (dateMismatch.length > 0) {
      console.log(`\n  ⚠️  ${dateMismatch.length} agendamentos com dados inconsistentes entre date e appointment_date`);
    }
    if (timeMismatch.length > 0) {
      console.log(`  ⚠️  ${timeMismatch.length} agendamentos com dados inconsistentes entre start_time e appointment_time`);
    }
    if (nameMismatch.length > 0) {
      console.log(`  ⚠️  ${nameMismatch.length} pacientes com dados inconsistentes entre name e full_name`);
    }

    return true;
  } catch (error) {
    console.log('  ❌ Erro:', error.message);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 Iniciando testes de verificação do banco de dados');
  console.log('='.repeat(60));

  const results = {
    appointmentStructure: await testAppointmentTableStructure(),
    patientsStructure: await testPatientsTableStructure(),
    promSnapshots: await testPromSnapshotsTable(),
    views: await testViews(),
    sampleData: await testSampleData()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 Resumo dos Testes');
  console.log('='.repeat(60));
  console.log(`✅ Estrutura appointments: ${results.appointmentStructure ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Estrutura patients: ${results.patientsStructure ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Estrutura prom_snapshots: ${results.promSnapshots === null ? 'N/A' : (results.promSnapshots ? 'PASSOU' : 'FALHOU')}`);
  console.log(`✅ Views: ${results.views ? 'VERIFICADO' : 'FALHOU'}`);
  console.log(`✅ Dados de amostra: ${results.sampleData ? 'VERIFICADO' : 'FALHOU'}`);
  console.log('='.repeat(60));

  // Verificar se há problemas críticos
  const hasCriticalIssues =
    !results.appointmentStructure ||
    !results.patientsStructure;

  if (hasCriticalIssues) {
    console.log('\n❌ Testes críticos falharam. Verifique os erros acima.');
    process.exit(1);
  }

  console.log('\n✅ Testes de conexão básicos concluídos com sucesso!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Aplique as migrations na seguinte ordem:');
  console.log('   - 20260108180000_fix_duplicate_columns_part1.sql');
  console.log('   - 20260108180001_fix_duplicate_columns_part2.sql');
  console.log('   - 20260108180002_fix_name_fullname_consistency.sql');
  console.log('   - 20260108180003_fix_prom_snapshots_fk.sql');
  console.log('\n2. Execute este script novamente para verificar os resultados');
}

runAllTests().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
