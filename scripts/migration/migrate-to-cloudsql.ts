/**
 * Migration Script: Supabase → Cloud SQL
 * Script para migrar dados do Supabase para Cloud SQL
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Configuração
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUD_SQL_CONNECTION_STRING = process.env.CLOUD_SQL_CONNECTION_STRING;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis Supabase não configuradas');
  process.exit(1);
}

if (!CLOUD_SQL_CONNECTION_STRING) {
  console.error('❌ CLOUD_SQL_CONNECTION_STRING não configurada');
  process.exit(1);
}

// Clientes
const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

const cloudsql = new Pool({
  connectionString: CLOUD_SQL_CONNECTION_STRING,
});

/**
 * Mapeamento de tabelas para migrar
 */
const TABLES_TO_MIGRATE = [
  'organizations',
  'profiles',
  'patients',
  'appointments',
  'payments',
  'patient_session_packages',
  'vouchers',
  'exercises',
  'exercise_plans',
  'exercise_plan_items',
  'medical_records',
  'treatment_sessions',
  'patient_progress',
  'assessment_templates',
  'assessment_sections',
  'assessment_questions',
  'patient_assessments',
  'assessment_responses',
  'medical_record_attachments',
  'invitations',
  'notifications',
];

/**
 * Estatísticas da migração
 */
interface MigrationStats {
  table: string;
  sourceCount: number;
  migratedCount: number;
  errors: number;
}

const stats: MigrationStats[] = [];

/**
 * Busca todos os registros de uma tabela (com paginação)
 */
async function fetchAllFromSupabase(tableName: string): Promise<any[]> {
  console.log(`📥 Buscando dados de ${tableName}...`);

  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(`   ❌ Erro:`, error.message);
      return [];
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      page++;
      console.log(`   ${allData.length} registros...`);

      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`   ✅ ${allData.length} registros`);
  return allData;
}

/**
 * Migra dados de uma tabela
 */
async function migrateTable(tableName: string): Promise<MigrationStats> {
  const stat: MigrationStats = {
    table: tableName,
    sourceCount: 0,
    migratedCount: 0,
    errors: 0,
  };

  console.log(`\n🔄 Migrando tabela: ${tableName}`);

  try {
    // Buscar dados do Supabase
    const data = await fetchAllFromSupabase(tableName);
    stat.sourceCount = data.length;

    if (data.length === 0) {
      console.log('   ℹ️  Tabela vazia, pulando');
      return stat;
    }

    // Inserir no Cloud SQL em lotes
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          await insertRecord(tableName, record);
          stat.migratedCount++;
        } catch (error: any) {
          stat.errors++;
          if (stat.errors <= 5) {
            console.error(`   ⚠️  Erro ao inserir registro:`, error.message);
          }
        }
      }

      process.stdout.write(`\r   ${Math.min(i + batchSize, data.length)}/${data.length} registros`);
    }

    console.log(`\r   ✅ ${stat.migratedCount} registros migrados`);
    if (stat.errors > 0) {
      console.log(`   ⚠️  ${stat.errors} erros`);
    }
  } catch (error: any) {
    console.error(`❌ Erro na migração da tabela ${tableName}:`, error.message);
  }

  stats.push(stat);
  return stat;
}

/**
 * Insere um registro no Cloud SQL
 */
async function insertRecord(tableName: string, record: any): Promise<void> {
  // Extrair colunas e valores
  const columns = Object.keys(record);
  const values = Object.values(record);

  // Construir query INSERT com ON CONFLICT para upsert
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  const conflictTarget = getConflictTarget(tableName);

  const query = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders})
    ${conflictTarget ? `ON CONFLICT (${conflictTarget}) DO UPDATE SET ` +
      columns.filter(c => c !== conflictTarget).map(c => `${c} = EXCLUDED.${c}`).join(', ') : ''}
    RETURNING id
  `;

  // Converter arrays para JSON
  const processedValues = values.map(v => {
    if (Array.isArray(v)) return JSON.stringify(v);
    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
    return v;
  });

  await cloudsql.query(query, processedValues);
}

/**
 * Retorna a coluna de conflito para ON CONFLICT
 */
function getConflictTarget(tableName: string): string | null {
  const conflictTargets: Record<string, string> = {
    profiles: 'user_id',
    patients: 'cpf',
    organizations: 'cnpj',
    vouchers: 'code',
    exercises: 'slug',
    appointments: 'id', // UUID unique
    assessments: 'id',
  };

  return conflictTargets[tableName] || 'id';
}

/**
 * Cria log de migração
 */
async function saveMigrationLog(): Promise<void> {
  const log = {
    timestamp: new Date().toISOString(),
    stats,
    summary: {
      totalTables: stats.length,
      totalRecords: stats.reduce((sum, s) => sum + stat.sourceCount, 0),
      totalMigrated: stats.reduce((sum, s) => sum + stat.migratedCount, 0),
      totalErrors: stats.reduce((sum, s) => sum + stat.errors, 0),
    },
  };

  const logPath = path.join(process.cwd(), 'migration-log.json');
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log(`\n📋 Log salvo em: ${logPath}`);
}

/**
 * Limpa tabelas antes da migração (cuidado!)
 */
async function cleanTables(): Promise<void> {
  console.log('\n⚠️  LIMPANDO TABELAS NO CLOUD SQL...');

  // Ordem reversa para respeitar foreign keys
  const reverseTables = [...TABLES_TO_MIGRATE].reverse();

  for (const table of reverseTables) {
    try {
      await cloudsql.query(`DELETE FROM ${table}`);
      console.log(`   ✅ ${table} limpa`);
    } catch (error: any) {
      console.warn(`   ⚠️  Erro ao limpar ${table}:`, error.message);
    }
  }
}

/**
 * Verifica integridade após migração
 */
async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verificando integridade...');

  for (const stat of stats) {
    if (stat.sourceCount === 0) continue;

    const { rows } = await cloudsql.query(
      `SELECT COUNT(*) as count FROM ${stat.table}`
    );

    const targetCount = parseInt(rows[0].count);

    if (targetCount !== stat.migratedCount) {
      console.warn(
        `   ⚠️  ${stat.table}: esperado ${stat.migratedCount}, encontrado ${targetCount}`
      );
    } else {
      console.log(`   ✅ ${stat.table}: ${targetCount} registros`);
    }
  }
}

/**
 * Função principal
 */
async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  MIGRAÇÃO: SUPABASE → CLOUD SQL');
  console.log('========================================\n');

  // Testar conexões
  console.log('🔌 Testando conexões...');
  await cloudsql.query('SELECT 1');
  console.log('✅ Cloud SQL conectado\n');

  // Perguntar se quer limpar tabelas
  const clean = process.argv.includes('--clean');

  if (clean) {
    await cleanTables();
  }

  // Migrar tabelas em ordem
  console.log('\n--- MIGRAÇÃO DE DADOS ---');

  for (const table of TABLES_TO_MIGRATE) {
    await migrateTable(table);
  }

  // Verificar
  await verifyMigration();

  // Salvar log
  await saveMigrationLog();

  // Resumo
  console.log('\n========================================');
  console.log('  RESUMO DA MIGRAÇÃO');
  console.log('========================================\n');

  const totalMigrated = stats.reduce((sum, s) => sum + s.migratedCount, 0);
  const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);

  console.log(`Tabelas migradas: ${stats.length}`);
  console.log(`Registros migrados: ${totalMigrated}`);
  console.log(`Erros: ${totalErrors}`);

  if (totalErrors === 0) {
    console.log('\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
  } else {
    console.log('\n⚠️  MIGRAÇÃO CONCLUÍDA COM ERROS - VERIFIQUE O LOG');
  }

  await cloudsql.end();
}

// Executar
main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
