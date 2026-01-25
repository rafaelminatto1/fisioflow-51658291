/**
 * Script para verificar dados existentes no Supabase antes da migração
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tabelas críticas para o "Iniciar Atendimento"
const CRITICAL_TABLES = [
  'patients',
  'appointments',
  'soap_records',
  'treatment_sessions',
  'patient_goals',
  'patient_surgeries',
  'patient_pathologies',
  'evolution_measurements',
];

// Tabelas de gamificação
const GAMIFICATION_TABLES = [
  'patient_gamification',
  'daily_quests',
  'achievements',
  'achievements_log',
  'xp_transactions',
  'shop_items',
  'user_inventory',
];

// Outras tabelas importantes
const OTHER_TABLES = [
  'profiles',
  'eventos',
  'medical_records',
  'prescribed_exercises',
  'leads',
  'crm_tarefas',
  'crm_campanhas',
];

async function checkTable(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { table: tableName, count: null, error: error.message };
    }

    return { table: tableName, count: count || 0, error: null };
  } catch (e) {
    return { table: tableName, count: null, error: e.message };
  }
}

async function main() {
  console.log('🔍 Verificando dados no Supabase...\n');
  console.log('URL:', supabaseUrl);
  console.log('');

  const allTables = [...CRITICAL_TABLES, ...GAMIFICATION_TABLES, ...OTHER_TABLES];
  const results = [];

  for (const table of allTables) {
    process.stdout.write(`\r⏳ Verificando ${table}...`);
    const result = await checkTable(table);
    results.push(result);
    process.stdout.write(`\r✅ ${table}: ${result.count === null ? 'ERRO' : result.count + ' registros'}\n`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO');
  console.log('='.repeat(60));

  const withData = results.filter(r => r.count && r.count > 0);
  const withErrors = results.filter(r => r.error);
  const empty = results.filter(r => r.count === 0);

  console.log(`\n✅ Tabelas com dados: ${withData.length}`);
  withData.forEach(r => {
    console.log(`   - ${r.table}: ${r.count} registros`);
  });

  if (withErrors.length > 0) {
    console.log(`\n❌ Tabelas com erro (provavelmente não existem): ${withErrors.length}`);
    ErrorsErrors.forEach(r => {
      console.log(`   - ${r.table}: ${r.error}`);
    });
  }

  console.log(`\n📭 Tabelas vazias: ${empty.length}`);
  empty.forEach(r => {
    console.log(`   - ${r.table}`);
  });

  // Salvar resultado em JSON
  const outputPath = path.join(__dirname, '../supabase-data-check.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Resultado salvo em: ${outputPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('⚠️  RECOMENDAÇÕES');
  console.log('='.repeat(60));

  if (withData.length > 0) {
    console.log('\n🔴 DADOS CRÍTICOS ENCONTRADOS!');
    console.log('   Você PRECISA migrar esses dados antes de cancelar o Supabase.');
    console.log('   Use o script: migrate-supabase-to-firebase.mjs');
  } else {
    console.log('\n✅ Nenhum dado crítico encontrado.');
    console.log('   Você pode prosseguir com a migração do código.');
  }
}

main().catch(console.error);
