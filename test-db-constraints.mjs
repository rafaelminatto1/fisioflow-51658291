/**
 * Teste de Restrições de Banco de Dados
 *
 * Este script verifica tabelas com unique constraints que podem causar
 * erros 409 em produção devido a race conditions.
 *
 * Uso: node test-db-constraints.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY é necessário');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Busca todas as tabelas com unique constraints
 */
async function getTablesWithUniqueConstraints() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        t.table_name,
        c.constraint_name,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN information_schema.tables t ON t.table_name = cl.relname
      WHERE c.contype = 'u'
      AND t.table_schema = 'public'
      ORDER BY t.table_name, c.constraint_name;
    `
  });

  if (error) {
    // Fallback: usar query direta via REST
    const { data: tables } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    return tables?.map(t => t.tablename) || [];
  }

  return data;
}

/**
 * Analisa código fonte buscando patterns perigosos
 */
async function analyzeCodeForRiskyPatterns() {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { glob } = await import('glob');

  const riskyPatterns = [
    {
      name: 'Insert sem verificação de duplicidade',
      pattern: /\.from\(['"](\w+)['"]\)\s*\.insert\(/g,
      severity: 'high',
      description: 'INSERT sem UPSERT pode causar erro 409 em tabelas com unique constraint'
    },
    {
      name: 'Verificação race condition',
      pattern: /maybeSingle\(\)[\s\S]*?\.insert\(/g,
      severity: 'medium',
      description: 'Pattern check-then-insert suscetível a race condition'
    }
  ];

  const files = await glob('src/**/*.{ts,tsx}', { ignore: '**/node_modules/**' });
  const findings = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    for (const pattern of riskyPatterns) {
      const matches = [...content.matchAll(pattern.pattern)];
      if (matches.length > 0) {
        findings.push({
          file,
          pattern: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          count: matches.length,
          lines: matches.map(m => {
            const lines = content.substring(0, m.index).split('\n');
            return lines.length;
          })
        });
      }
    }
  }

  return findings;
}

/**
 * Testa race condition simulando requisições simultâneas
 */
async function testRaceCondition(tableName, testData) {
  console.log(`\n🧪 Testando race condition em ${tableName}...`);

  const promises = Array(10).fill(null).map((_, i) =>
    supabase
      .from(tableName)
      .insert({ ...testData, test_run: Date.now() })
      .then(({ error, data }) => ({ error, data, index: i }))
  );

  const results = await Promise.all(promises);

  const successes = results.filter(r => !r.error && r.data).length;
  const conflicts = results.filter(r => r.error?.code === '23505').length;
  const otherErrors = results.filter(r => r.error && r.error.code !== '23505');

  return {
    total: results.length,
    successes,
    conflicts,
    otherErrors: otherErrors.length,
    hasRaceCondition: conflicts > 0 && successes > 0
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Analisando restrições de banco de dados...\n');

  // 1. Buscar tabelas com unique constraints
  console.log('📋 Tabelas com unique constraints:');
  const tables = await getTablesWithUniqueConstraints();

  if (Array.isArray(tables) && tables.length > 0) {
    tables.forEach(t => {
      if (typeof t === 'object') {
        console.log(`  - ${t.table_name}: ${t.constraint_definition}`);
      }
    });
  }

  // 2. Analisar código
  console.log('\n📝 Analisando código fonte...');
  const findings = await analyzeCodeForRiskyPatterns();

  if (findings.length === 0) {
    console.log('  ✅ Nenhum pattern arriscado encontrado');
  } else {
    console.log(`  ⚠️  ${findings.length} findings encontrados:\n`);

    findings.forEach(finding => {
      const emoji = finding.severity === 'high' ? '🔴' : '🟡';
      console.log(`  ${emoji} ${finding.file}`);
      console.log(`     Pattern: ${finding.pattern}`);
      console.log(`     Linhas: ${finding.lines.join(', ')}`);
      console.log(`     ${finding.description}\n`);
    });
  }

  // 3. Gerar relatório
  console.log('\n📊 RELATÓRIO:\n');

  const highSeverity = findings.filter(f => f.severity === 'high').length;
  const mediumSeverity = findings.filter(f => f.severity === 'medium').length;

  if (highSeverity === 0 && mediumSeverity === 0) {
    console.log('✅ Sem problemas detectados!');
  } else {
    console.log(`🔴 ${highSeverity} problemas de alta severidade`);
    console.log(`🟡 ${mediumSeverity} problemas de média severidade`);
    console.log('\n💡 RECOMENDAÇÕES:\n');
    console.log('1. Substitua .insert() por .upsert() com onConflict em tabelas com unique constraint');
    console.log('2. Use ignoreDuplicates: true para evitar erros 409');
    console.log('3. Exemplo:');
    console.log('   ❌ .insert({ user_id, role })');
    console.log('   ✅ .upsert({ user_id, role }, { onConflict: "user_id,role", ignoreDuplicates: true })');
  }

  console.log('\n✨ Análise concluída!\n');
}

main().catch(console.error);
