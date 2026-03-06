/**
 * Script: Migrar soap_records do Firestore → sessions no Neon
 *
 * Uso: node scripts/migrate-soap-records-to-neon.mjs [--dry-run]
 *
 * O que faz:
 *   1. Lê todos os documentos de soap_records no Firestore
 *   2. Para cada um, insere na tabela sessions do Neon (se não existir)
 *   3. Armazena subjective/objective/assessment/plan como JSONB {text: "..."}
 *   4. Armazena pain_level/location/character em required_tests JSONB
 *   5. Mapeia organization_id via profiles ou usa o DEFAULT
 *
 * Idempotente: usa INSERT ... ON CONFLICT DO NOTHING via firestore_id como controle.
 * (Adicione coluna firestore_id à tabela sessions se quiser rodar múltiplas vezes)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const BATCH_SIZE = 50;

// ===== INIT =====

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
  ?? join(__dirname, '../fisioflow-migration-firebase-adminsdk-fbsvc-88b745cfd6.json');

initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
const fsdb = getFirestore();
const sql = neon(process.env.DATABASE_URL);

// ===== HELPERS =====

function textToJsonb(val) {
  if (val == null || val === '') return null;
  return JSON.stringify({ text: String(val) });
}

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return null;
}

// ===== MAIN =====

async function main() {
  console.log(`\n🚀 Migração soap_records → sessions (${DRY_RUN ? 'DRY RUN' : 'EXECUÇÃO REAL'})\n`);

  // Garante coluna firestore_id
  const hasFirestoreIdCol = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'firestore_id'
  `;
  if (!hasFirestoreIdCol.length) {
    console.log('⚠️  Adicionando coluna firestore_id à tabela sessions...');
    if (!DRY_RUN) await sql.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS firestore_id VARCHAR(255) UNIQUE');
    console.log('   ✓ Coluna adicionada');
  }

  // Carrega mapa firestoreId → neonUUID de patients e appointments
  console.log('📥 Carregando mapas de IDs do Neon...');
  const [patientRows, apptRows] = await Promise.all([
    sql`SELECT id, firestore_id FROM patients WHERE firestore_id IS NOT NULL`,
    sql`SELECT id, firestore_id FROM appointments WHERE firestore_id IS NOT NULL`,
  ]);
  const patientMap = Object.fromEntries(patientRows.map(r => [r.firestore_id, r.id]));
  const apptMap    = Object.fromEntries(apptRows.map(r => [r.firestore_id, r.id]));

  // Adiciona mapeamento direto UUID→UUID (para patients que já tinham UUID como Firestore ID)
  patientRows.forEach(r => { patientMap[r.id] = r.id; });
  apptRows.forEach(r => { apptMap[r.id] = r.id; });

  console.log(`   patients mapeados: ${Object.keys(patientMap).length}`);
  console.log(`   appointments mapeados: ${Object.keys(apptMap).length}`);

  // Busca todos os soap_records
  const snapshot = await fsdb.collection('soap_records').get();
  console.log(`📋 Total de soap_records no Firestore: ${snapshot.size}`);

  if (snapshot.empty) {
    console.log('   Nenhum registro encontrado. Encerrando.');
    return;
  }

  let inserted = 0, skipped = 0, errors = 0;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuid = (v) => UUID_RE.test(v ?? '') ? v : null;

  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (docSnap) => {
        const firestoreId = docSnap.id;
        const d = docSnap.data();

        // Resolve patient_id → Neon UUID
        const patientNeonId = patientMap[d.patient_id] ?? null;

        // Resolve appointment_id → Neon UUID (optional)
        const apptNeonId = d.appointment_id ? (apptMap[d.appointment_id] ?? null) : null;

        const pain = JSON.stringify({
          pain_level: d.pain_level ?? null,
          pain_location: d.pain_location ?? null,
          pain_character: d.pain_character ?? null,
        });

        const recordDate = d.record_date
          ? String(d.record_date)
          : toDate(d.created_at)?.split('T')[0] ?? new Date().toISOString().split('T')[0];

        if (DRY_RUN) {
          const resolved = patientNeonId ? '✓' : '⚠️ sem paciente';
          console.log(`  [DRY] ${firestoreId} | patient=${d.patient_id} ${resolved} | date=${recordDate}`);
          inserted++;
          return;
        }

        if (!patientNeonId) {
          console.warn(`  ⚠️  Session ${firestoreId}: patient ${d.patient_id} não encontrado no Neon — ignorando`);
          skipped++;
          return;
        }

        try {
          await sql`
            INSERT INTO sessions (
              firestore_id,
              patient_id,
              appointment_id,
              therapist_id,
              organization_id,
              date,
              duration_minutes,
              subjective,
              objective,
              assessment,
              plan,
              status,
              required_tests,
              last_auto_save_at,
              finalized_at,
              finalized_by,
              created_at,
              updated_at
            ) VALUES (
              ${firestoreId},
              ${patientNeonId}::uuid,
              ${apptNeonId}::uuid,
              ${uuid(d.created_by)}::uuid,
              ${DEFAULT_ORG_ID}::uuid,
              ${recordDate},
              ${d.duration_minutes ?? null},
              ${textToJsonb(d.subjective)}::jsonb,
              ${textToJsonb(d.objective)}::jsonb,
              ${textToJsonb(d.assessment)}::jsonb,
              ${textToJsonb(d.plan)}::jsonb,
              ${d.status ?? 'finalized'},
              ${pain}::jsonb,
              ${toDate(d.last_auto_save_at) ?? null},
              ${toDate(d.finalized_at) ?? toDate(d.signed_at) ?? null},
              ${uuid(d.finalized_by)}::uuid,
              ${toDate(d.created_at) ?? new Date().toISOString()},
              ${toDate(d.updated_at) ?? new Date().toISOString()}
            )
            ON CONFLICT (firestore_id) DO NOTHING
          `;
          inserted++;
        } catch (err) {
          console.error(`  ❌ Erro em ${firestoreId}:`, err.message);
          errors++;
        }
      }),
    );

    const progress = Math.min(i + BATCH_SIZE, docs.length);
    process.stdout.write(`\r   ${progress}/${docs.length} processados...`);
  }

  console.log(`\n\n✅ Concluído!`);
  console.log(`   Inseridos:  ${inserted}`);
  console.log(`   Sem paciente (ignorados): ${skipped}`);
  console.log(`   Erros:      ${errors}`);

  if (!DRY_RUN) {
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM sessions`;
    console.log(`\n   Total de sessions no Neon: ${n}`);
  }
}

main().catch((e) => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
