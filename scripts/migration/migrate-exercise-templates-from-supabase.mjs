/**
 * Migra templates de exercícios (e itens) do Supabase para Firestore.
 * Coleções: exercise_templates, exercise_template_items.
 *
 * Uso:
 *   node scripts/migration/migrate-exercise-templates-from-supabase.mjs
 *   node scripts/migration/migrate-exercise-templates-from-supabase.mjs --dry-run
 *   node scripts/migration/migrate-exercise-templates-from-supabase.mjs --from-file=exercise_templates_export.json
 *   node scripts/migration/migrate-exercise-templates-from-supabase.mjs --from-file=exercise_templates_export.json --from-file-items=exercise_template_items_export.json
 *
 * .env: Supabase para migração direta. Firebase (FIREBASE_SERVICE_ACCOUNT_KEY_PATH) para migração (direta ou --from-file).
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
const fromFileArg = process.argv.find((a) => a.startsWith('--from-file='));
const fromFilePath = fromFileArg ? fromFileArg.split('=')[1] : null;
const fromFileItemsArg = process.argv.find((a) => a.startsWith('--from-file-items='));
const fromFileItemsPath = fromFileItemsArg ? fromFileItemsArg.split('=')[1] : null;
const BATCH_SIZE = 100;
const FIRESTORE_TEMPLATES = 'exercise_templates';
const FIRESTORE_ITEMS = 'exercise_template_items';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

const needFirebase = true;
const needSupabase = !fromFilePath && !fromFileItemsPath;

if (needSupabase && (!supabaseUrl || !supabaseKey)) {
  console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env para migração direta.');
  process.exit(1);
}
if (!serviceAccountPath) {
  console.error('❌ Defina FIREBASE_SERVICE_ACCOUNT_KEY_PATH no .env');
  process.exit(1);
}

const resolvedKeyPath = serviceAccountPath.startsWith('./') || serviceAccountPath.startsWith('../')
  ? path.join(__dirname, '../..', serviceAccountPath)
  : path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.join(__dirname, '../..', serviceAccountPath);

if (!fs.existsSync(resolvedKeyPath)) {
  console.error('❌ Arquivo da service account não encontrado:', resolvedKeyPath);
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

const db = admin.firestore();
const supabase = needSupabase && supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

function transformTemplate(row) {
  const id = row.id != null ? String(row.id) : null;
  if (!id) return null;
  return {
    name: row.name ?? '',
    description: row.description ?? null,
    category: row.category ?? null,
    condition_name: row.condition_name ?? row.condition ?? '',
    template_variant: row.template_variant ?? null,
    organization_id: row.organization_id ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at ? (row.created_at.toISOString?.() ?? row.created_at) : new Date().toISOString(),
    updated_at: row.updated_at ? (row.updated_at.toISOString?.() ?? row.updated_at) : null,
    clinical_notes: row.clinical_notes ?? null,
    contraindications: row.contraindications ?? null,
    precautions: row.precautions ?? null,
    progression_notes: row.progression_notes ?? null,
    evidence_level: row.evidence_level ?? null,
    bibliographic_references: Array.isArray(row.bibliographic_references) ? row.bibliographic_references : null,
    _migratedAt: new Date().toISOString(),
    _migratedFrom: 'supabase',
  };
}

function transformItem(row) {
  const id = row.id != null ? String(row.id) : null;
  if (!id) return null;
  return {
    template_id: row.template_id != null ? String(row.template_id) : '',
    exercise_id: row.exercise_id != null ? String(row.exercise_id) : '',
    order_index: row.order_index != null ? Number(row.order_index) : 0,
    sets: row.sets ?? null,
    repetitions: row.repetitions ?? null,
    duration: row.duration ?? null,
    notes: row.notes ?? null,
    week_start: row.week_start ?? null,
    week_end: row.week_end ?? null,
    clinical_notes: row.clinical_notes ?? null,
    focus_muscles: Array.isArray(row.focus_muscles) ? row.focus_muscles : null,
    purpose: row.purpose ?? null,
    _migratedAt: new Date().toISOString(),
    _migratedFrom: 'supabase',
  };
}

async function writeBatch(collectionName, documents) {
  if (!documents.length) return { migrated: 0, errors: 0 };
  let migrated = 0;
  let errors = 0;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    if (!isDryRun) {
      const firestoreBatch = db.batch();
      for (const { id, data } of batch) {
        firestoreBatch.set(db.collection(collectionName).doc(id), data);
      }
      try {
        await firestoreBatch.commit();
        migrated += batch.length;
      } catch (e) {
        log(`Erro no batch ${collectionName}: ${e.message}`, 'err');
        errors += batch.length;
      }
    } else {
      migrated += batch.length;
    }
  }
  return { migrated, errors };
}

async function migrate() {
  let templatesRows = [];
  let itemsRows = [];

  if (fromFilePath) {
    const filePath = path.isAbsolute(fromFilePath) ? fromFilePath : path.join(process.cwd(), fromFilePath);
    if (!fs.existsSync(filePath)) {
      log(`Arquivo não encontrado: ${filePath}`, 'err');
      return { templates: { migrated: 0, errors: 1 }, items: { migrated: 0, errors: 0 } };
    }
    log(`Lendo templates de ${filePath}...`);
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
      templatesRows = JSON.parse(raw);
    } catch (e) {
      log(`Erro ao parsear JSON: ${e.message}`, 'err');
      return { templates: { migrated: 0, errors: 1 }, items: { migrated: 0, errors: 0 } };
    }
    if (!Array.isArray(templatesRows)) templatesRows = [];
  } else if (supabase) {
    log('Buscando exercise_templates no Supabase...');
    const { data, error } = await supabase.from('exercise_templates').select('*');
    if (error) {
      log(`Erro Supabase exercise_templates: ${error.message}`, 'err');
      return { templates: { migrated: 0, errors: 1 }, items: { migrated: 0, errors: 0 } };
    }
    templatesRows = data ?? [];
  }

  if (fromFileItemsPath) {
    const filePath = path.isAbsolute(fromFileItemsPath) ? fromFileItemsPath : path.join(process.cwd(), fromFileItemsPath);
    if (fs.existsSync(filePath)) {
      log(`Lendo itens de ${filePath}...`);
      const raw = fs.readFileSync(filePath, 'utf8');
      try {
        itemsRows = JSON.parse(raw);
      } catch (e) {
        log(`Erro ao parsear JSON itens: ${e.message}`, 'err');
      }
      if (!Array.isArray(itemsRows)) itemsRows = [];
    }
  } else if (supabase) {
    log('Buscando exercise_template_items no Supabase...');
    const { data, error } = await supabase.from('exercise_template_items').select('*');
    if (error) {
      log(`Erro Supabase exercise_template_items: ${error.message}`, 'err');
    } else {
      itemsRows = data ?? [];
    }
  }

  const templateDocs = [];
  for (const row of templatesRows) {
    const doc = transformTemplate(row);
    if (doc) {
      const id = row.id != null ? String(row.id) : null;
      if (id) templateDocs.push({ id, data: toFirestoreValue(doc) });
    }
  }

  const itemDocs = [];
  for (const row of itemsRows) {
    const doc = transformItem(row);
    if (doc) {
      const id = row.id != null ? String(row.id) : null;
      if (id) itemDocs.push({ id, data: toFirestoreValue(doc) });
    }
  }

  log(`Templates: ${templateDocs.length} registros. ${isDryRun ? '(dry-run)' : 'Escrevendo em Firestore...'}`);
  const templatesResult = await writeBatch(FIRESTORE_TEMPLATES, templateDocs);

  log(`Itens: ${itemDocs.length} registros. ${isDryRun ? '(dry-run)' : 'Escrevendo em Firestore...'}`);
  const itemsResult = await writeBatch(FIRESTORE_ITEMS, itemDocs);

  if (isDryRun) {
    log(`[DRY-RUN] Seriam migrados ${templateDocs.length} templates e ${itemDocs.length} itens.`, 'info');
  } else {
    if (templatesResult.migrated > 0) {
      log(`Validação templates: ${templatesResult.migrated} em ${FIRESTORE_TEMPLATES}`, 'success');
    }
    if (itemsResult.migrated > 0) {
      log(`Validação itens: ${itemsResult.migrated} em ${FIRESTORE_ITEMS}`, 'success');
    }
  }

  return { templates: templatesResult, items: itemsResult };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO TEMPLATES DE EXERCÍCIOS (Supabase → Firestore)    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  if (isDryRun) console.log('⚠️  DRY-RUN: nenhuma alteração será feita.\n');
  if (fromFilePath) console.log(`Fonte templates: ${fromFilePath}`);
  if (fromFileItemsPath) console.log(`Fonte itens: ${fromFileItemsPath}`);
  if (!fromFilePath && !fromFileItemsPath) console.log('Fonte: Supabase (exercise_templates + exercise_template_items)');
  console.log(`Destino: Firestore ${FIRESTORE_TEMPLATES}, ${FIRESTORE_ITEMS}\n`);

  const { templates, items } = await migrate();

  console.log('\n' + '='.repeat(60));
  log(`Templates: ${templates.migrated} migrados${templates.errors ? `, ${templates.errors} erros` : ''}`, 'success');
  log(`Itens: ${items.migrated} migrados${items.errors ? `, ${items.errors} erros` : ''}`, 'success');
  if (templates.migrated > 0 || items.migrated > 0) {
    log('A aba Templates em /exercises deve exibir os dados após recarregar.', 'info');
  }
  if (isDryRun) log('Execute sem --dry-run para aplicar.', 'warn');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
