/**
 * Migração Firebase → Neon PostgreSQL
 *
 * Migra:
 *   - exercises (coleção Firestore) → tabela exercises
 *   - exercise_protocols (Firestore) → tabela exercise_protocols
 *   - exercise_templates (Firestore) → tabela exercise_templates
 *   - exercise_template_items (Firestore) → tabela exercise_template_items
 *
 * Imagens (image_url, thumbnail_url, video_url):
 *   Mantém as URLs do Firebase Storage originais.
 *   Migração para R2 pode ser feita depois com o script migrate-images-to-r2.mjs
 *
 * Uso:
 *   node scripts/migrate-firebase-to-neon.mjs
 *   node scripts/migrate-firebase-to-neon.mjs --dry-run   (só mostra o que faria)
 *   node scripts/migrate-firebase-to-neon.mjs --only=exercises
 *   node scripts/migrate-firebase-to-neon.mjs --only=protocols
 *   node scripts/migrate-firebase-to-neon.mjs --only=templates
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== CONFIG =====
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = process.argv.find(a => a.startsWith('--only='))?.split('=')[1];
const BATCH_SIZE = 50;

// ===== FIREBASE INIT =====
let app;
const serviceAccountPath = resolve(__dirname, '../fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json');
try {
  const sa = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  app = initializeApp({ credential: cert(sa) });
  console.log('✅ Firebase: usando service account');
} catch {
  app = initializeApp({ projectId: 'fisioflow-migration' });
  console.log('✅ Firebase: usando Application Default Credentials');
}
const db = getFirestore(app);

// ===== NEON INIT =====
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf8');
const DATABASE_URL = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
if (!DATABASE_URL) throw new Error('DATABASE_URL não encontrada no .env');
const sql = neon(DATABASE_URL);

// ===== UTILS =====
function toTs(firestoreTs) {
  if (!firestoreTs) return new Date();
  if (firestoreTs.toDate) return firestoreTs.toDate();
  if (firestoreTs._seconds) return new Date(firestoreTs._seconds * 1000);
  if (typeof firestoreTs === 'string') return new Date(firestoreTs);
  return new Date();
}

function sanitizeText(val) {
  if (!val) return null;
  return String(val).trim() || null;
}

function sanitizeArray(val) {
  if (!val) return '{}';
  if (Array.isArray(val)) return `{${val.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',')}}`;
  return '{}';
}

function sanitizeJsonb(val) {
  if (!val) return null;
  try { return JSON.stringify(val); } catch { return null; }
}

async function batchInsert(tableName, rows, onConflict = '') {
  if (!rows.length) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      const keys = Object.keys(row).filter(k => row[k] !== undefined);
      const vals = keys.map(k => row[k]);
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const cols = keys.map(k => `"${k}"`).join(', ');
      const query = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ${onConflict}`;
      if (!DRY_RUN) {
        try {
          await sql.query(query, vals);
          inserted++;
        } catch (e) {
          console.warn(`  ⚠️  Linha pulada (${String(e.message || e).split('\n')[0].slice(0, 120)})`);
        }
      } else {
        inserted++;
      }
    }
    process.stdout.write(`\r  📦 ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
  return inserted;
}

// ===== MAP DIFFICULTY =====
function mapDifficulty(val) {
  if (!val) return 'iniciante';
  const v = String(val).toLowerCase();
  if (v.includes('interm')) return 'intermediario';
  if (v.includes('avan') || v.includes('hard') || v.includes('adv')) return 'avancado';
  return 'iniciante';
}

// ===== CATEGORY CACHE =====
let categoryCache = null;
async function getCategoryId(categoryName) {
  if (!categoryCache) {
    const rows = await sql`SELECT id, name, slug FROM exercise_categories`;
    categoryCache = rows;
  }
  if (!categoryName) return null;
  const name = String(categoryName).toLowerCase().trim();
  const match = categoryCache.find(c =>
    c.name.toLowerCase() === name ||
    c.slug.toLowerCase() === name ||
    name.includes(c.name.toLowerCase()) ||
    c.name.toLowerCase().includes(name)
  );
  return match?.id ?? null;
}

// ===== MIGRATE EXERCISES =====
async function migrateExercises() {
  console.log('\n🏋️  Migrando exercícios...');
  const snap = await db.collection('exercises').get();
  console.log(`   Encontrados: ${snap.size} documentos`);

  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const categoryId = await getCategoryId(d.category || d.categoryId || d.categoria);

    rows.push({
      firestore_id: doc.id,
      name: sanitizeText(d.name || d.nome) || 'Sem nome',
      description: sanitizeText(d.description || d.descricao),
      instructions: sanitizeText(d.instructions || d.instrucoes),
      tips: sanitizeText(d.tips || d.dicas),
      precautions: sanitizeText(d.precautions || d.precaucoes),
      benefits: sanitizeText(d.benefits || d.beneficios),
      category_id: categoryId,
      difficulty: mapDifficulty(d.difficulty || d.dificuldade),
      muscles_primary: sanitizeArray(d.musclesPrimary || d.muscles_primary || d.musculos_primarios),
      muscles_secondary: sanitizeArray(d.musclesSecondary || d.muscles_secondary || d.musculos_secundarios),
      body_parts: sanitizeArray(d.bodyParts || d.body_parts || d.partes_do_corpo),
      equipment: sanitizeArray(d.equipment || d.equipamentos),
      sets_recommended: d.sets || d.setsRecommended || null,
      reps_recommended: d.repetitions || d.repsRecommended || null,
      duration_seconds: d.duration || d.durationSeconds || null,
      rest_seconds: d.restSeconds || d.rest_seconds || null,
      image_url: sanitizeText(d.imageUrl || d.image_url || d.imagem_url),
      thumbnail_url: sanitizeText(d.thumbnailUrl || d.thumbnail_url),
      video_url: sanitizeText(d.videoUrl || d.video_url),
      pathologies_indicated: sanitizeArray(d.pathologiesIndicated || d.indicated_pathologies || d.patologias_indicadas),
      pathologies_contraindicated: sanitizeArray(d.pathologiesContraindicated || d.contraindicated_pathologies || d.patologias_contraindicadas),
      icd10_codes: sanitizeArray(d.icd10Codes || d.icd10),
      tags: sanitizeArray(d.tags),
      is_active: d.isActive !== false,
      is_public: d.isPublic !== false,
      organization_id: null,
      created_by: sanitizeText(d.createdBy || d.created_by),
      created_at: toTs(d.createdAt || d.created_at),
      updated_at: toTs(d.updatedAt || d.updated_at),
    });
  }

  // Adiciona coluna firestore_id se não existir
  if (!DRY_RUN) {
    await sql`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS firestore_id VARCHAR(255) UNIQUE`;
  }

  const inserted = await batchInsert(
    'exercises',
    rows,
    'ON CONFLICT (firestore_id) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url, thumbnail_url = EXCLUDED.thumbnail_url, video_url = EXCLUDED.video_url, updated_at = EXCLUDED.updated_at'
  );

  console.log(`   ✅ ${inserted} exercícios ${DRY_RUN ? '(dry-run)' : 'inseridos/atualizados'}`);
  return inserted;
}

// ===== MIGRATE PROTOCOLS =====
async function migrateProtocols() {
  console.log('\n📋 Migrando protocolos...');
  const snap = await db.collection('exercise_protocols').get();
  console.log(`   Encontrados: ${snap.size} documentos`);

  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    rows.push({
      firestore_id: doc.id,
      name: sanitizeText(d.name || d.nome) || 'Sem nome',
      condition_name: sanitizeText(d.conditionName || d.condition_name || d.condicao),
      protocol_type: (d.protocolType || d.protocol_type || 'patologia') === 'pos_operatorio' ? 'pos_operatorio' : 'patologia',
      evidence_level: ['A','B','C','D'].includes(d.evidenceLevel) ? d.evidenceLevel : null,
      description: sanitizeText(d.description || d.descricao),
      objectives: sanitizeText(d.objectives || d.objetivos),
      contraindications: sanitizeText(d.contraindications || d.contraindicacoes),
      weeks_total: d.weeksTotal || d.weeks_total || null,
      phases: sanitizeJsonb(d.phases || []),
      milestones: sanitizeJsonb(d.milestones || []),
      restrictions: sanitizeJsonb(d.restrictions || []),
      progression_criteria: sanitizeJsonb(d.progressionCriteria || d.progression_criteria || []),
      references: sanitizeJsonb(d.references || []),
      icd10_codes: sanitizeArray(d.icd10Codes || d.icd10),
      tags: sanitizeArray(d.tags),
      clinical_tests: sanitizeArray(d.clinicalTests || d.clinical_tests),
      is_active: d.isActive !== false,
      is_public: d.isPublic !== false,
      organization_id: null,
      created_by: sanitizeText(d.createdBy || d.created_by),
      created_at: toTs(d.createdAt || d.created_at),
      updated_at: toTs(d.updatedAt || d.updated_at),
    });
  }

  if (!DRY_RUN) {
    await sql`ALTER TABLE exercise_protocols ADD COLUMN IF NOT EXISTS firestore_id VARCHAR(255) UNIQUE`;
  }

  const inserted = await batchInsert(
    'exercise_protocols',
    rows,
    'ON CONFLICT (firestore_id) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at'
  );

  console.log(`   ✅ ${inserted} protocolos ${DRY_RUN ? '(dry-run)' : 'inseridos/atualizados'}`);
  return inserted;
}

// ===== MIGRATE TEMPLATES =====
async function migrateTemplates() {
  console.log('\n📁 Migrando templates...');
  const snap = await db.collection('exercise_templates').get();
  console.log(`   Encontrados: ${snap.size} documentos`);

  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    rows.push({
      firestore_id: doc.id,
      name: sanitizeText(d.name || d.nome) || 'Sem nome',
      description: sanitizeText(d.description || d.descricao),
      category: sanitizeText(d.category || d.categoria),
      condition_name: sanitizeText(d.conditionName || d.condition_name),
      template_variant: sanitizeText(d.templateVariant || d.template_variant),
      clinical_notes: sanitizeText(d.clinicalNotes || d.clinical_notes),
      contraindications: sanitizeText(d.contraindications),
      precautions: sanitizeText(d.precautions),
      progression_notes: sanitizeText(d.progressionNotes || d.progression_notes),
      evidence_level: ['A','B','C','D'].includes(d.evidenceLevel) ? d.evidenceLevel : null,
      bibliographic_references: sanitizeArray(d.bibliographicReferences || d.bibliographic_references),
      is_active: d.isActive !== false,
      is_public: d.isPublic !== false,
      organization_id: null,
      created_by: sanitizeText(d.createdBy || d.created_by),
      created_at: toTs(d.createdAt || d.created_at),
      updated_at: toTs(d.updatedAt || d.updated_at),
    });
  }

  if (!DRY_RUN) {
    await sql`CREATE TABLE IF NOT EXISTS exercise_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firestore_id VARCHAR(255) UNIQUE,
      name VARCHAR(500) NOT NULL,
      description TEXT,
      category VARCHAR(200),
      condition_name VARCHAR(500),
      template_variant VARCHAR(200),
      clinical_notes TEXT,
      contraindications TEXT,
      precautions TEXT,
      progression_notes TEXT,
      evidence_level VARCHAR(1) CHECK (evidence_level IN ('A','B','C','D')),
      bibliographic_references TEXT[] DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_public BOOLEAN NOT NULL DEFAULT TRUE,
      organization_id UUID,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  }

  const inserted = await batchInsert(
    'exercise_templates',
    rows,
    'ON CONFLICT (firestore_id) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at'
  );

  console.log(`   ✅ ${inserted} templates ${DRY_RUN ? '(dry-run)' : 'inseridos/atualizados'}`);

  // Migrar itens dos templates
  await migrateTemplateItems(snap.docs.map(d => d.id));
  return inserted;
}

async function migrateTemplateItems(templateFirestoreIds) {
  console.log('\n   📎 Migrando itens dos templates...');

  if (!DRY_RUN) {
    await sql`CREATE TABLE IF NOT EXISTS exercise_template_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firestore_id VARCHAR(255) UNIQUE,
      template_id UUID NOT NULL REFERENCES exercise_templates(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      sets INTEGER,
      repetitions INTEGER,
      duration INTEGER,
      notes TEXT,
      week_start INTEGER,
      week_end INTEGER,
      clinical_notes TEXT,
      focus_muscles TEXT[] DEFAULT '{}',
      purpose TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  }

  // Busca itens da subcoleção ou coleção separada
  let totalItems = 0;
  const snap = await db.collection('exercise_template_items').get();
  if (snap.size > 0) {
    console.log(`   Encontrados: ${snap.size} itens na coleção exercise_template_items`);
    const rows = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      // Resolve template_id (Neon UUID) a partir do firestore_id do template
      const templateRow = DRY_RUN ? null : await sql`SELECT id FROM exercise_templates WHERE firestore_id = ${d.templateId || d.template_id}`.then(r => r[0]);
      if (!templateRow && !DRY_RUN) {
        console.warn(`   ⚠️  Template não encontrado: ${d.templateId}`);
        continue;
      }
      rows.push({
        firestore_id: doc.id,
        template_id: templateRow?.id || '00000000-0000-0000-0000-000000000000',
        exercise_id: sanitizeText(d.exerciseId || d.exercise_id) || 'unknown',
        order_index: d.orderIndex || d.order_index || 0,
        sets: d.sets || null,
        repetitions: d.repetitions || null,
        duration: d.duration || null,
        notes: sanitizeText(d.notes),
        week_start: d.weekStart || d.week_start || null,
        week_end: d.weekEnd || d.week_end || null,
        clinical_notes: sanitizeText(d.clinicalNotes || d.clinical_notes),
        focus_muscles: sanitizeArray(d.focusMuscles || d.focus_muscles),
        purpose: sanitizeText(d.purpose),
        created_at: toTs(d.createdAt),
        updated_at: toTs(d.updatedAt),
      });
    }
    totalItems = await batchInsert(
      'exercise_template_items',
      rows,
      'ON CONFLICT (firestore_id) DO NOTHING'
    );
  } else {
    console.log('   Sem coleção exercise_template_items separada (itens podem estar em subcoleções)');
  }

  console.log(`   ✅ ${totalItems} itens ${DRY_RUN ? '(dry-run)' : 'inseridos'}`);
}

// ===== MAIN =====
async function main() {
  console.log(`\n🚀 Migração Firebase → Neon${DRY_RUN ? ' [DRY-RUN]' : ''}`);
  console.log('='.repeat(50));

  const stats = {};

  if (!ONLY || ONLY === 'exercises') {
    stats.exercises = await migrateExercises();
  }
  if (!ONLY || ONLY === 'protocols') {
    stats.protocols = await migrateProtocols();
  }
  if (!ONLY || ONLY === 'templates') {
    stats.templates = await migrateTemplates();
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Migração concluída!');
  if (!DRY_RUN) {
    console.log('\nResumo:');
    Object.entries(stats).forEach(([k, v]) => console.log(`  ${k}: ${v} registros`));
  }
  console.log('\n💡 Próximo passo: migrar imagens para Cloudflare R2');
  console.log('   node scripts/migrate-images-to-r2.mjs\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro na migração:', err);
  process.exit(1);
});
