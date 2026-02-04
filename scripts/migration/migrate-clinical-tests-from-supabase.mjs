/**
 * Migra testes clínicos do Supabase para Firestore (coleção clinical_test_templates).
 * Cenário A: --table=<nome> para tabela de templates com colunas alinhadas ao Firestore.
 * Cenário B (padrão): usa assessment_test_configs e transforma para o formato PhysioTests DB.
 *
 * Uso:
 *   node scripts/migration/migrate-clinical-tests-from-supabase.mjs
 *   node scripts/migration/migrate-clinical-tests-from-supabase.mjs --dry-run
 *   node scripts/migration/migrate-clinical-tests-from-supabase.mjs --table=clinical_test_templates
 *   node scripts/migration/migrate-clinical-tests-from-supabase.mjs --export-to=clinical_tests_export.json
 *   node scripts/migration/migrate-clinical-tests-from-supabase.mjs --from-file=clinical_tests_export.json
 *   node scripts/migration/migrate-clinical-tests-from-supabase.mjs --from-file=clinical_tests_export.json --table=assessment_test_configs
 *
 * .env: Supabase (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) para migração direta ou --export-to.
 *       Firebase (FIREBASE_SERVICE_ACCOUNT_KEY_PATH) para migração direta ou --from-file.
 */

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env') });

const isDryRun = process.argv.includes('--dry-run');
const tableArg = process.argv.find((a) => a.startsWith('--table='));
const sourceTable = tableArg ? tableArg.split('=')[1] : 'assessment_test_configs';
const fromFileArg = process.argv.find((a) => a.startsWith('--from-file='));
const fromFilePath = fromFileArg ? fromFileArg.split('=')[1] : null;
const exportToArg = process.argv.find((a) => a.startsWith('--export-to='));
const exportToPath = exportToArg ? exportToArg.split('=')[1] : null;
const BATCH_SIZE = 100;
const FIRESTORE_COLLECTION = 'clinical_test_templates';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

if (!fromFilePath && !exportToPath) {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) no .env');
    process.exit(1);
  }
  if (!serviceAccountPath) {
    console.error('❌ Defina FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env');
    process.exit(1);
  }
} else if (exportToPath) {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Para --export-to defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
  }
} else if (fromFilePath) {
  if (!serviceAccountPath) {
    console.error('❌ Para --from-file defina FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env');
    process.exit(1);
  }
}

const resolvedKeyPath = serviceAccountPath && (serviceAccountPath.startsWith('./') || serviceAccountPath.startsWith('../'))
  ? path.join(__dirname, '../..', serviceAccountPath)
  : serviceAccountPath && path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : serviceAccountPath
      ? path.join(__dirname, '../..', serviceAccountPath)
      : null;

let db = null;
let supabase = null;

if (!fromFilePath || exportToPath) {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
}
if (!exportToPath) {
  if (!resolvedKeyPath || !fs.existsSync(resolvedKeyPath)) {
    console.error('❌ Arquivo da service account não encontrado. Verifique FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env');
    process.exit(1);
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, 'utf8'));
  } catch (e) {
    console.error('❌ Erro ao ler service account:', e.message);
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
}

const log = (msg, type = 'info') => {
  const t = new Date().toISOString().slice(11, 19);
  const icon = type === 'success' ? '✅' : type === 'warn' ? '⚠️' : type === 'err' ? '❌' : 'ℹ️';
  console.log(`${t} ${icon} ${msg}`);
};

function toFirestoreValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null && typeof v.toISOString === 'function') return v.toISOString();
  if (Array.isArray(v)) return v.map(toFirestoreValue);
  if (typeof v === 'object' && v !== null && !Buffer.isBuffer(v)) {
    const out = {};
    for (const key of Object.keys(v)) out[key] = toFirestoreValue(v[key]);
    return out;
  }
  return v;
}

/**
 * Cenário B: transforma uma linha de assessment_test_configs no formato clinical_test_templates.
 */
function transformAssessmentConfigToTemplate(row) {
  const id = row.id != null ? String(row.id) : null;
  if (!id) return null;
  return {
    name: row.test_name ?? 'Teste sem nome',
    name_en: row.name_en ?? null,
    category: row.test_type ?? 'Ortopedia',
    target_joint: row.target_joint ?? row.pathology_name ?? '',
    purpose: row.purpose ?? row.instructions ?? '',
    execution: row.execution ?? '',
    positive_sign: row.positive_sign ?? null,
    reference: row.reference ?? null,
    sensitivity_specificity: row.sensitivity_specificity ?? null,
    tags: Array.isArray(row.tags) ? row.tags : (row.test_type ? [row.test_type] : []),
    type: row.type ?? 'special_test',
    fields_definition: row.fields_definition ?? [],
    regularity_sessions: row.frequency_sessions ?? row.regularity_sessions ?? null,
    layout_type: row.layout_type ?? null,
    image_url: row.image_url ?? null,
    media_urls: row.media_urls ?? null,
    description: row.description ?? row.instructions ?? null,
    organization_id: row.organization_id ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at ? (row.created_at.toISOString?.() ?? row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? (row.updated_at.toISOString?.() ?? row.updated_at) : null,
    _migratedAt: new Date().toISOString(),
    _migratedFrom: 'supabase',
  };
}

/**
 * Cenário A: mapeia colunas de uma tabela de templates para o formato Firestore (snake_case preservado).
 */
function transformTemplateRow(row) {
  const id = row.id != null ? String(row.id) : null;
  if (!id) return null;
  const doc = {
    name: row.name ?? '',
    name_en: row.name_en ?? null,
    category: row.category ?? 'Ortopedia',
    target_joint: row.target_joint ?? '',
    purpose: row.purpose ?? '',
    execution: row.execution ?? '',
    positive_sign: row.positive_sign ?? null,
    reference: row.reference ?? null,
    sensitivity_specificity: row.sensitivity_specificity ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    type: row.type ?? 'special_test',
    fields_definition: row.fields_definition ?? [],
    regularity_sessions: row.regularity_sessions ?? null,
    layout_type: row.layout_type ?? null,
    image_url: row.image_url ?? null,
    media_urls: row.media_urls ?? null,
    description: row.description ?? null,
    organization_id: row.organization_id ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at ? (row.created_at.toISOString?.() ?? row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? (row.updated_at.toISOString?.() ?? row.updated_at) : null,
    _migratedAt: new Date().toISOString(),
    _migratedFrom: 'supabase',
  };
  return doc;
}

async function migrate() {
  const useAssessmentConfigs = sourceTable === 'assessment_test_configs';
  let rows = [];

  if (exportToPath) {
    log(`Exportando do Supabase (tabela: ${sourceTable}) para ${exportToPath}...`);
    const { data, error } = await supabase.from(sourceTable).select('*');
    if (error) {
      log(`Erro Supabase ${sourceTable}: ${error.message}`, 'err');
      return { migrated: 0, errors: 1, sourceCount: 0 };
    }
    if (!data?.length) {
      log('Nenhum registro encontrado na tabela.');
      return { migrated: 0, errors: 0, sourceCount: 0 };
    }
    const outPath = path.isAbsolute(exportToPath) ? exportToPath : path.join(process.cwd(), exportToPath);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    log(`Exportados ${data.length} registros para ${outPath}`, 'success');
    return { migrated: 0, errors: 0, sourceCount: data.length, exported: true };
  }

  if (fromFilePath) {
    const filePath = path.isAbsolute(fromFilePath) ? fromFilePath : path.join(process.cwd(), fromFilePath);
    if (!fs.existsSync(filePath)) {
      log(`Arquivo não encontrado: ${filePath}`, 'err');
      return { migrated: 0, errors: 1, sourceCount: 0 };
    }
    log(`Lendo dados de ${filePath}...`);
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      rows = JSON.parse(raw);
    } catch (e) {
      log(`Erro ao parsear JSON: ${e.message}`, 'err');
      return { migrated: 0, errors: 1, sourceCount: 0 };
    }
    if (!Array.isArray(rows) || !rows.length) {
      log('Nenhum registro no arquivo.');
      return { migrated: 0, errors: 0, sourceCount: 0 };
    }
  } else {
    log(`Buscando dados no Supabase (tabela: ${sourceTable})...`);
    const { data, error } = await supabase.from(sourceTable).select('*');
    if (error) {
      log(`Erro Supabase ${sourceTable}: ${error.message}`, 'err');
      return { migrated: 0, errors: 1, sourceCount: 0 };
    }
    if (!data?.length) {
      log('Nenhum registro encontrado na tabela.');
      return { migrated: 0, errors: 0, sourceCount: 0 };
    }
    rows = data;
  }

  const transform = useAssessmentConfigs ? transformAssessmentConfigToTemplate : transformTemplateRow;
  const documents = [];
  for (const row of rows) {
    const doc = transform(row);
    if (doc) {
      const id = row.id != null ? String(row.id) : null;
      if (!id) continue;
      documents.push({ id, data: toFirestoreValue(doc) });
    }
  }

  const sourceCount = documents.length;
  log(`Encontrados ${sourceCount} registros. ${isDryRun ? '(dry-run: nenhuma escrita)' : 'Escrevendo em Firestore...'}`);

  let migrated = 0;
  let errors = 0;

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    if (!isDryRun && db) {
      const firestoreBatch = db.batch();
      for (const { id, data } of batch) {
        const ref = db.collection(FIRESTORE_COLLECTION).doc(id);
        firestoreBatch.set(ref, data);
      }
      try {
        await firestoreBatch.commit();
        migrated += batch.length;
      } catch (e) {
        log(`Erro no batch: ${e.message}`, 'err');
        errors += batch.length;
      }
    } else {
      migrated += batch.length;
    }
  }

  if (isDryRun) {
    log(`[DRY-RUN] Seriam migrados ${migrated} documentos para ${FIRESTORE_COLLECTION}.`, 'info');
  }

  if (!isDryRun && db && migrated > 0) {
    const snapshot = await db.collection(FIRESTORE_COLLECTION).count().get();
    const destCount = snapshot.data().count;
    if (destCount !== sourceCount) {
      log(`Divergência de contagem: origem ${sourceCount}, Firestore ${destCount}`, 'warn');
    } else {
      log(`Validação: ${destCount} documentos em ${FIRESTORE_COLLECTION}`, 'success');
    }
  }

  return { migrated, errors, sourceCount };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  if (exportToPath) {
    console.log('║  EXPORTAR TESTES CLÍNICOS (Supabase → JSON)                  ║');
  } else if (fromFilePath) {
    console.log('║  MIGRAÇÃO TESTES CLÍNICOS (JSON → Firestore)               ║');
  } else {
    console.log('║  MIGRAÇÃO TESTES CLÍNICOS (Supabase → Firestore)           ║');
  }
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  if (isDryRun) console.log('⚠️  DRY-RUN: nenhuma alteração será feita.\n');
  if (fromFilePath) {
    console.log(`Fonte: arquivo ${fromFilePath}`);
    console.log(`Formato esperado: tabela ${sourceTable}`);
  } else {
    console.log(`Tabela fonte: ${sourceTable}`);
  }
  if (!exportToPath) {
    console.log(`Coleção destino: ${FIRESTORE_COLLECTION}`);
  }
  console.log('');

  const { migrated, errors, sourceCount, exported } = await migrate();

  console.log('\n' + '='.repeat(60));
  if (exported) {
    log(`Exportação concluída: ${sourceCount} registros em ${exportToPath}`, 'success');
  } else {
    log(`Total: ${migrated} registros migrados${errors ? `, ${errors} erros` : ''}`, 'success');
    if (sourceCount > 0 && migrated === sourceCount && !errors) {
      log('A página /clinical-tests deve exibir os testes após recarregar (e com regras Firestore publicadas).', 'info');
    }
  }
  if (isDryRun && !exportToPath) log('Execute sem --dry-run para aplicar.', 'warn');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
