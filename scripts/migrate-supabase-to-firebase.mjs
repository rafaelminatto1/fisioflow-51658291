/**
 * Script para migrar dados do Supabase para Firebase Firestore
 *
 * Características:
 * - Migração em batches para melhor performance
 * - Suporte a dry-run (simulação)
 * - Continuidade de migração interrompida
 * - Validação de dados antes e depois da migração
 * - Transformação de dados durante migração
 * - Logging detalhado com timestamps
 * - Tratamento robusto de erros
 *
 * Uso:
 *   node migrate-supabase-to-firebase.mjs                    # Migração completa
 *   node migrate-supabase-to-firebase.mjs --dry-run         # Simulação
 *   node migrate-supabase-to-firebase.mjs --from=appointments # A partir de tabela específica
 *   node migrate-supabase-to-firebase.mjs --tables=patients,appointments # Tabelas específicas
 */

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

// Parse argumentos de linha de comando
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const fromTable = args.find(arg => arg.startsWith('--from='))?.split('=')[1];
const tablesArg = args.find(arg => arg.startsWith('--tables='))?.split('=')[1];
const specificTables = tablesArg ? tablesArg.split(',') : null;

// Constantes
const BATCH_SIZE = 400; // Limite do Firestore é 500 operações por batch
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms
const MIGRATION_STATE_FILE = path.join(__dirname, '.migration-state.json');

// Configurar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.error('   Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configurar Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

if (!serviceAccountPath) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY_PATH não encontrado no .env');
  process.exit(1);
}

const resolvedKeyPath = serviceAccountPath.startsWith('./')
  ? path.join(__dirname, '..', serviceAccountPath)
  : serviceAccountPath;

let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, 'utf8'));
} catch (e) {
  console.error(`❌ Erro ao ler service account: ${e.message}`);
  console.error(`   Caminho: ${resolvedKeyPath}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configurações de cada tabela para migração
const TABLE_CONFIG = {
  patients: {
    collection: 'patients',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString(),
      _migratedFrom: 'supabase'
    })
  },
  appointments: {
    collection: 'appointments',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString(),
      _migratedFrom: 'supabase'
    })
  },
  soap_records: {
    collection: 'soap_records',
    transform: (record) => ({
      ...record,
      subjective: record.subjective || {},
      objective: record.objective || {},
      assessment: record.assessment || {},
      plan: record.plan || {},
      _migratedAt: new Date().toISOString()
    })
  },
  patient_gamification: {
    collection: 'patient_gamification',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  daily_quests: {
    collection: 'daily_quests',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  achievements: {
    collection: 'achievements',
    transform: (record) => ({
      ...record,
      requirements: record.requirements || {},
      _migratedAt: new Date().toISOString()
    })
  },
  achievements_log: {
    collection: 'achievements_log',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  xp_transactions: {
    collection: 'xp_transactions',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  shop_items: {
    collection: 'shop_items',
    transform: (record) => ({
      ...record,
      requirements: record.requirements || {},
      _migratedAt: new Date().toISOString()
    })
  },
  user_inventory: {
    collection: 'user_inventory',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  patient_surgeries: {
    collection: 'patient_surgeries',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  patient_goals: {
    collection: 'patient_goals',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  patient_pathologies: {
    collection: 'patient_pathologies',
    transform: (record) => ({
      ...record,
      _migratedAt: new Date().toISOString()
    })
  },
  evolution_measurements: {
    collection: 'evolution_measurements',
    transform: (record) => ({
      ...record,
      measurements: record.measurements || {},
      _migratedAt: new Date().toISOString()
    })
  },
  treatment_sessions: {
    collection: 'treatment_sessions',
    transform: (record) => ({
      ...record,
      exercises: record.exercises || [],
      notes: record.notes || '',
      _migratedAt: new Date().toISOString()
    })
  },
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Logger com timestamp e níveis
 */
const logger = {
  info: (msg) => console.log(`${timestamp()} ℹ️  ${msg}`),
  success: (msg) => console.log(`${timestamp()} ✅ ${msg}`),
  warning: (msg) => console.log(`${timestamp()} ⚠️  ${msg}`),
  error: (msg) => console.log(`${timestamp()} ❌ ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`${timestamp()} 🔍 ${msg}`),
};

function timestamp() {
  return new Date().toISOString().split('T')[1].slice(0, 8);
}

/**
 * Sleep/delay utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper com exponential backoff
 */
async function retry(fn, retries = MAX_RETRIES, delay = RETRY_DELAY) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      logger.warning(`Tentativa ${i + 1}/${retries} falhou: ${e.message}`);
      await sleep(delay * Math.pow(2, i));
    }
  }
}

// ============================================================================
// ESTADO DA MIGRAÇÃO
// ============================================================================

/**
 * Carrega estado anterior da migração
 */
function loadMigrationState() {
  if (fs.existsSync(MIGRATION_STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MIGRATION_STATE_FILE, 'utf8'));
    } catch (e) {
      logger.warning('Não foi possível carregar estado anterior');
    }
  }
  return { completed: [], failed: [], startedAt: null };
}

/**
 * Salva estado da migração
 */
function saveMigrationState(state) {
  try {
    fs.writeFileSync(MIGRATION_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    logger.warning(`Não foi possível salvar estado: ${e.message}`);
  }
}

/**
 * Limpa estado da migração
 */
function clearMigrationState() {
  if (fs.existsSync(MIGRATION_STATE_FILE)) {
    fs.unlinkSync(MIGRATION_STATE_FILE);
  }
}

// ============================================================================
// MIGRAÇÃO
// ============================================================================

/**
 * Valida um registro antes da migração
 */
function validateRecord(record, tableName) {
  const errors = [];

  if (!record.id) {
    errors.push('ID ausente');
  }

  // Validações específicas por tabela
  switch (tableName) {
    case 'patients':
      if (!record.name) errors.push('Nome ausente');
      break;
    case 'appointments':
      if (!record.patient_id) errors.push('patient_id ausente');
      if (!record.date) errors.push('Data ausente');
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Migra uma tabela usando batch writes
 */
async function migrateTable(tableName, collectionName, transform) {
  const startTime = Date.now();
  logger.info(`Migrando ${tableName} → ${collectionName}`);

  try {
    // Buscar dados do Supabase com paginação
    let allData = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(page * 1000, (page + 1) * 1000 - 1);

      if (error) {
        throw new Error(`Erro ao buscar dados (página ${page}): ${error.message}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(data);
        logger.debug(`  Página ${page}: ${data.length} registros`);
        page++;
      }
    }

    if (allData.length === 0) {
      logger.warning(`  Tabela ${tableName} vazia`);
      return { success: true, migrated: 0, errors: 0, duration: Date.now() - startTime };
    }

    logger.info(`  Encontrados ${allData.length} registros`);

    // Validar registros
    const validationErrors = [];
    allData.forEach((record, idx) => {
      const validation = validateRecord(record, tableName);
      if (!validation.valid) {
        validationErrors.push({ idx, id: record.id, errors: validation.errors });
      }
    });

    if (validationErrors.length > 0) {
      logger.warning(`  ${validationErrors.length} registros com erros de validação`);
      validationErrors.forEach(v => {
        logger.debug(`    ID ${v.id}: ${v.errors.join(', ')}`);
      });
    }

    if (isDryRun) {
      logger.info(`  [DRY-RUN] Seriam migrados ${allData.length} registros`);
      return { success: true, migrated: allData.length, errors: validationErrors.length, duration: Date.now() - startTime };
    }

    // Migrar em batches
    let migrated = 0;
    let errors = 0;
    let batchCount = 0;

    for (let i = 0; i < allData.length; i += BATCH_SIZE) {
      const batch = allData.slice(i, i + BATCH_SIZE);
      batchCount++;

      try {
        await retry(async () => {
          const firestoreBatch = db.batch();

          for (const record of batch) {
            const docId = record.id;
            const { id, ...recordData } = record;
            const transformedData = transform ? transform(record) : recordData;

            const docRef = db.collection(collectionName).doc(docId);
            firestoreBatch.set(docRef, transformedData);
          }

          await firestoreBatch.commit();
        });

        migrated += batch.length;
        logger.debug(`  Batch ${batchCount}: ${batch.length} registros`);
      } catch (e) {
        errors += batch.length;
        logger.error(`  Erro no batch ${batchCount}: ${e.message}`);
      }
    }

    const duration = Date.now() - startTime;
    logger.success(`  Concluído: ${migrated} registros em ${(duration / 1000).toFixed(2)}s`);

    if (errors > 0) {
      logger.warning(`  ${errors} registros falharam`);
    }

    return { success: true, migrated, errors, duration };

  } catch (e) {
    logger.error(`  Erro fatal: ${e.message}`);
    return { success: false, migrated: 0, errors: 1, duration: Date.now() - startTime, error: e.message };
  }
}

/**
 * Valida dados após migração
 */
async function validateMigration(tableName, collectionName, sourceCount) {
  if (isDryRun) return { valid: true };

  try {
    const snapshot = await db.collection(collectionName).count().get();
    const destCount = snapshot.data().count;

    if (destCount !== sourceCount) {
      logger.warning(`  Contagem divergente: ${sourceCount} (origem) vs ${destCount} (destino)`);
      return { valid: false, sourceCount, destCount };
    }

    logger.debug(`  Validação OK: ${destCount} registros`);
    return { valid: true, sourceCount, destCount };
  } catch (e) {
    logger.error(`  Erro na validação: ${e.message}`);
    return { valid: false, error: e.message };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const startTime = Date.now();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     MIGRAÇÃO SUPABASE → FIREBASE                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: Nenhuma alteração será feita\n');
  }

  logger.info(`Supabase: ${supabaseUrl}`);
  logger.info(`Firebase: ${serviceAccount.project_id}`);
  console.log('');

  // Carregar estado anterior
  const migrationState = loadMigrationState();
  const shouldResume = migrationState.startedAt && !migrationState.completed.length;

  if (shouldResume) {
    logger.info(`Continuando migração anterior (${new Date(migrationState.startedAt).toLocaleString()})`);
    logger.info(`  Concluídas: ${migrationState.completed.join(', ')}`);
    console.log('');
  }

  // Determinar tabelas para migrar
  let tablesToMigrate = Object.entries(TABLE_CONFIG);

  if (specificTables) {
    tablesToMigrate = tablesToMigrate.filter(([table]) => specificTables.includes(table));
  }

  if (fromTable) {
    const startIndex = tablesToMigrate.findIndex(([table]) => table === fromTable);
    if (startIndex >= 0) {
      tablesToMigrate = tablesToMigrate.slice(startIndex);
      logger.info(`Iniciando a partir de: ${fromTable}`);
    }
  }

  // Remover tabelas já concluídas
  if (shouldResume) {
    tablesToMigrate = tablesToMigrate.filter(([table]) => !migrationState.completed.includes(table));
  }

  if (tablesToMigrate.length === 0) {
    logger.info('Nenhuma tabela para migrar');
    return;
  }

  logger.info(`Tabelas a migrar: ${tablesToMigrate.map(([t]) => t).join(', ')}`);
  console.log('');

  // Executar migração
  const results = [];
  migrationState.startedAt = migrationState.startedAt || Date.now();

  for (const [tableName, config] of tablesToMigrate) {
    const { collection, transform } = config;

    const result = await migrateTable(tableName, collection, transform);
    results.push({ table: tableName, collection, ...result });

    // Atualizar estado
    if (result.success && result.migrated > 0) {
      migrationState.completed.push(tableName);
      saveMigrationState(migrationState);
    } else if (!result.success) {
      migrationState.failed.push({ table: tableName, error: result.error });
      saveMigrationState(migrationState);
    }

    // Validação pós-migração
    if (result.success && result.migrated > 0) {
      await validateMigration(tableName, collection, result.migrated);
    }

    console.log('');
  }

  // Limpar estado em caso de sucesso total
  if (results.every(r => r.success)) {
    clearMigrationState();
  }

  // Relatório final
  const totalDuration = Date.now() - startTime;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RELATÓRIO FINAL                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  logger.success(`Tempo total: ${(totalDuration / 1000).toFixed(2)}s`);
  logger.success(`Registros migrados: ${totalMigrated}`);

  if (totalErrors > 0) {
    logger.warning(`Registros com erro: ${totalErrors}`);
  }

  console.log('');
  logger.info(`Tabelas bem-sucedidas (${successful.length}):`);
  successful.forEach(r => {
    const duration = ((r.duration || 0) / 1000).toFixed(2);
    console.log(`  ✅ ${r.table.padEnd(25)} ${r.migrated.toString().padStart(6)} regs (${duration}s)`);
  });

  if (failed.length > 0) {
    console.log('');
    logger.error(`Tabelas com falha (${failed.length}):`);
    failed.forEach(r => {
      console.log(`  ❌ ${r.table}: ${r.error || 'Erro desconhecido'}`);
    });
  }

  console.log('');
  console.log('='.repeat(60));

  if (isDryRun) {
    logger.info('[DRY-RUN] Nenhuma alteração foi feita');
    logger.info('Execute sem --dry-run para realizar a migração');
  } else if (failed.length === 0) {
    logger.success('✨ Migração concluída com sucesso!');
  } else {
    logger.warning(`⚠️  Migração concluída com ${failed.length} erro(s)`);
    logger.info('Execute novamente para retomar de onde parou');
  }

  console.log('');
}

// Executar
main().catch((e) => {
  logger.error(`Erro fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
