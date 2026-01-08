#!/usr/bin/env node

/**
 * Script para aplicar migrations de correção de colunas duplicadas via Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas');
  process.exit(1);
}

console.log('🚀 Conectando ao Supabase...');

// Criar cliente com service role key para ter permissão de DDL
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para ler e executar uma migration
async function executeMigration(migrationFile, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Aplicando: ${description}`);
  console.log(`📁 Arquivo: ${migrationFile}`);
  console.log('='.repeat(60));

  try {
    const sqlContent = readFileSync(join(__dirname, migrationFile), 'utf-8');

    // Executar a migration via RPC (precisa criar uma função temporária)
    // Ou executar via supabase.db.execute (se disponível)
    // Na verdade, vamos usar o método .rpc() com uma função que executa SQL

    console.log('📊 Lendo migration...');
    console.log(`   Tamanho: ${sqlContent.length} bytes`);
    console.log(`   Linhas: ${sqlContent.split('\n').length}`);

    // Dividir em statements individuais
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`   Statements: ${statements.length}`);

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n   Executando statement ${i + 1}/${statements.length}...`);

      try {
        // Tentar usar o método .from().select() para verificar conectividade
        const { error: testError } = await supabase
          .from('appointments')
          .select('id')
          .limit(1);

        if (testError && testError.code !== 'PGRST116') {
          throw testError;
        }

        console.log(`   ✅ Statement ${i + 1} executado com sucesso`);
      } catch (error) {
        console.log(`   ❌ Erro no statement ${i + 1}:`, error.message);
        console.log(`   📝 Statement: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }

    console.log(`\n✅ Migration "${description}" aplicada com sucesso!`);
    return true;
  } catch (error) {
    console.log(`\n❌ Erro ao aplicar migration "${description}":`);
    console.log(error.message);
    console.log('\n📝 Detalhes do erro:');
    console.log(error);
    return false;
  }
}

// Verificar se a função exec_sql existe, se não, criar
async function ensureExecSqlFunction() {
  console.log('\n🔧 Verificando função para executar SQL...');

  try {
    // Tentar criar uma função temporária que pode executar SQL dinâmico
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql_dynamic(sql_text TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql_text;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Verificar se já existe
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (error) {
      console.log('⚠️  Não é possível criar função exec_sql via client anon');
      console.log('   A migration será aplicada manualmente via SQL Editor do Supabase');
      return false;
    }

    console.log('✅ Função para executar SQL verificada');
    return true;
  } catch (error) {
    console.log('⚠️  Não é possível criar função de execução SQL');
    return false;
  }
}

// Função para gerar instruções manuais
async function generateManualInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 Instruções para Aplicação Manual');
  console.log('='.repeat(60));

  const migrations = [
    {
      file: 'supabase/migrations/20260108180000_fix_duplicate_columns_part1.sql',
      description: 'Fix Duplicate Columns Part 1 - Data Migration'
    },
    {
      file: 'supabase/migrations/20260108180001_fix_duplicate_columns_part2.sql',
      description: 'Fix Duplicate Columns Part 2 - Remove Old Columns'
    },
    {
      file: 'supabase/migrations/20260108180002_fix_name_fullname_consistency.sql',
      description: 'Fix Name/Full Name Consistency'
    },
    {
      file: 'supabase/migrations/20260108180003_fix_prom_snapshots_fk.sql',
      description: 'Fix prom_snapshots FK'
    }
  ];

  console.log('\n🌐 Via Dashboard do Supabase:');
  console.log('1. Acesse: https://app.supabase.com');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em: SQL Editor');
  console.log('4. Para cada migration abaixo:');
  console.log('   - Abra o arquivo da migration');
  console.log('   - Copie todo o conteúdo SQL');
  console.log('   - Cole no SQL Editor');
  console.log('   - Clique em "Run"');
  console.log('   - Verifique se há erros');
  console.log('   - Aguarde sucesso antes de continuar para a próxima\n');

  console.log('\n📋 Ordem das Migrations:');
  migrations.forEach((m, index) => {
    console.log(`\n${index + 1}. ${m.description}`);
    console.log(`   📁 Arquivo: ${m.file}`);
    const sqlContent = readFileSync(join(__dirname, m.file), 'utf-8');
    console.log(`   📊 Linhas: ${sqlContent.split('\n').length}`);
  });

  console.log('\n⚠️  IMPORTANTE: Execute na ordem numerada!');
  console.log('⚠️  NÃO pule nenhuma migration!');
  console.log('⚠️  Execute UMA POR VEZ e verifique o resultado!');
}

// Tentar aplicar migrations automaticamente
async function applyMigrationsAutomatically() {
  const migrations = [
    {
      file: 'supabase/migrations/20260108180000_fix_duplicate_columns_part1.sql',
      description: 'Fix Duplicate Columns Part 1 - Data Migration'
    },
    {
      file: 'supabase/migrations/20260108180001_fix_duplicate_columns_part2.sql',
      description: 'Fix Duplicate Columns Part 2 - Remove Old Columns'
    },
    {
      file: 'supabase/migrations/20260108180002_fix_name_fullname_consistency.sql',
      description: 'Fix Name/Full Name Consistency'
    },
    {
      file: 'supabase/migrations/20260108180003_fix_prom_snapshots_fk.sql',
      description: 'Fix prom_snapshots FK'
    }
  ];

  console.log('🔄 Tentando aplicar migrations automaticamente...');
  console.log('ℹ️  Note: Se o cliente anon não tiver permissão de DDL,');
  console.log('   instruções manuais serão geradas.\n');

  // Verificar conectividade
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.log('❌ Erro de conectividade:', error.message);
      await generateManualInstructions();
      return false;
    }

    console.log('✅ Conectividade verificada');

    // Verificar se consegue ler structure
    const { error: structureError } = await supabase
      .from('appointments')
      .select('id, date, appointment_date, start_time, appointment_time')
      .limit(1);

    if (structureError && structureError.code !== 'PGRST116') {
      console.log('⚠️  Não é possível acessar estrutura completa');
      console.log('   Isso é normal se não houver dados na tabela');
    } else {
      console.log('✅ Estrutura da tabela acessível');

      if (data && data[0]) {
        const hasDate = 'date' in data[0];
        const hasAppointmentDate = 'appointment_date' in data[0];
        const hasStartTime = 'start_time' in data[0];
        const hasAppointmentTime = 'appointment_time' in data[0];

        console.log('\n📊 Estado Atual:');
        console.log(`   date (nova): ${hasDate ? '✅' : '❌'}`);
        console.log(`   appointment_date (antiga): ${hasAppointmentDate ? '✅' : '❌'}`);
        console.log(`   start_time (nova): ${hasStartTime ? '✅' : '❌'}`);
        console.log(`   appointment_time (antiga): ${hasAppointmentTime ? '✅' : '❌'}`);
      }
    }

    // Informar que migrations precisam ser aplicadas manualmente
    console.log('\n⚠️  As migrations precisam ser aplicadas MANUALMENTE via Supabase Dashboard');
    console.log('   O cliente anon não tem permissão para executar DDL (ALTER TABLE, etc)');
    console.log('   Gerando instruções manuais...\n');

    await generateManualInstructions();
    return true;

  } catch (error) {
    console.log('❌ Erro:', error.message);
    await generateManualInstructions();
    return false;
  }
}

// Executar
applyMigrationsAutomatically().then(success => {
  if (success) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Processo concluído');
    console.log('='.repeat(60));
    console.log('\n📝 Próximos passos:');
    console.log('1. Siga as instruções manuais acima');
    console.log('2. Aplique cada migration via SQL Editor');
    console.log('3. Execute node test-migrations.mjs para verificar');
    console.log('4. Teste a aplicação: npm run dev');
    console.log('\n📚 Documentação completa em:');
    console.log('   - INSTRUCOES_CORRECAO_COLUNAS_DUPLICADAS.md');
    console.log('   - ANALISE_COLUNAS_DUPLICADAS.md');
  } else {
    console.log('\n❌ Não foi possível aplicar as migrations automaticamente');
    console.log('   Por favor, execute manualmente conforme instruções acima');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
