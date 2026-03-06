/**
 * Migração: patients + appointments do Firestore → Neon
 *
 * Uso: node scripts/migrate-patients-appointments-to-neon.mjs [--dry-run]
 *
 * Ordem:
 *  1. Adiciona coluna firestore_id nas tabelas (se não existir)
 *  2. Migra patients (preserva UUID quando possível, gera novo UUID caso contrário)
 *  3. Constrói mapa firestoreId → neonUUID
 *  4. Migra appointments usando o mapa de pacientes
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const BATCH_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
  ?? join(__dirname, '../fisioflow-migration-firebase-adminsdk-fbsvc-88b745cfd6.json');

initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))) });
const fsdb = getFirestore();
const sql = neon(process.env.DATABASE_URL);

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return null;
}

function toDateOnly(val) {
  const d = toDate(val);
  return d ? d.split('T')[0] : null;
}

async function ensureColumn(table, column, type) {
  const exists = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  if (!exists.length) {
    console.log(`  ⚙️  Adicionando ${table}.${column}...`);
    if (!DRY_RUN) {
      await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
    }
  }
}

// ===== PATIENTS =====

async function migratePatients() {
  console.log('\n📦 Migrando PATIENTS...\n');
  await ensureColumn('patients', 'firestore_id', 'VARCHAR(255) UNIQUE');

  const snap = await fsdb.collection('patients').get();
  console.log(`   Firestore: ${snap.size} pacientes`);

  let inserted = 0, skipped = 0, errors = 0;
  const idMap = {}; // firestoreId → neonUUID

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (docSnap) => {
      const fid = docSnap.id;
      const d = docSnap.data();

      const neonId = UUID_RE.test(fid) ? fid : randomUUID();
      idMap[fid] = neonId;

      if (DRY_RUN) {
        console.log(`  [DRY] ${fid} → ${neonId} | ${d.name ?? d.full_name}`);
        inserted++;
        return;
      }

      try {
        const orgId = UUID_RE.test(d.organization_id ?? d.organizationId)
          ? (d.organization_id ?? d.organizationId)
          : DEFAULT_ORG_ID;

        const fullName = d.full_name ?? d.name ?? 'Paciente sem nome';
        const birthDate = toDateOnly(d.birth_date);
        const genderMap = {
          male: 'M', M: 'M', masculino: 'M', m: 'M',
          female: 'F', F: 'F', feminino: 'F', f: 'F',
          other: 'O', O: 'O', outro: 'O', o: 'O',
        };
        const gender = d.gender ? (genderMap[d.gender] ?? null) : null;

        await sql`
          INSERT INTO patients (
            id, firestore_id, full_name, cpf, rg, email, phone,
            birth_date, gender, main_condition, status, progress,
            is_active, notes, organization_id,
            created_at, updated_at
          ) VALUES (
            ${neonId}::uuid, ${fid}, ${fullName},
            ${d.cpf ?? null}, ${d.rg ?? null},
            ${d.email ?? null}, ${d.phone ?? null},
            ${birthDate}, ${gender},
            ${d.main_condition ?? null},
            ${d.status ?? 'Inicial'},
            ${d.progress ?? 0},
            ${d.is_active !== false},
            ${d.notes ?? null},
            ${orgId}::uuid,
            ${toDate(d.created_at) ?? new Date().toISOString()},
            ${toDate(d.updated_at) ?? new Date().toISOString()}
          )
          ON CONFLICT (firestore_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            updated_at = EXCLUDED.updated_at
          RETURNING id
        `;
        inserted++;
      } catch (err) {
        console.error(`  ❌ Patient ${fid}:`, err.message);
        errors++;
      }
    }));
    const progress = Math.min(i + BATCH_SIZE, docs.length);
    process.stdout.write(`\r   ${progress}/${docs.length} processados...`);
  }

  console.log(`\n   ✅ Patients: inseridos=${inserted} erros=${errors} skipped=${skipped}`);

  if (!DRY_RUN) {
    // Reload the map from Neon to ensure consistency
    const rows = await sql`SELECT id, firestore_id FROM patients WHERE firestore_id IS NOT NULL`;
    rows.forEach(r => { idMap[r.firestore_id] = r.id; });
  }

  return idMap;
}

// ===== APPOINTMENTS =====

async function migrateAppointments(patientIdMap) {
  console.log('\n📦 Migrando APPOINTMENTS...\n');
  await ensureColumn('appointments', 'firestore_id', 'VARCHAR(255) UNIQUE');

  const snap = await fsdb.collection('appointments').get();
  console.log(`   Firestore: ${snap.size} appointments`);

  let inserted = 0, skipped = 0, errors = 0;
  const apptIdMap = {}; // firestoreId → neonUUID

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (docSnap) => {
      const fid = docSnap.id;
      const d = docSnap.data();

      const neonId = UUID_RE.test(fid) ? fid : randomUUID();
      apptIdMap[fid] = neonId;

      const patientNeonId = patientIdMap[d.patient_id] ?? null;
      const orgId = UUID_RE.test(d.organization_id) ? d.organization_id : DEFAULT_ORG_ID;

      if (DRY_RUN) {
        const resolved = patientNeonId ? '✓' : '⚠️ sem paciente';
        console.log(`  [DRY] ${fid} | patient=${d.patient_id} ${resolved} | date=${d.date} | status=${d.status}`);
        inserted++;
        return;
      }

      if (!patientNeonId) {
        console.error(`  ⚠️  Appointment ${fid}: patient ${d.patient_id} não encontrado no Neon`);
        errors++;
        return;
      }

      try {
        const apptDate = d.date
          ? (typeof d.date === 'string' ? d.date : toDateOnly(d.date))
          : toDateOnly(d.created_at) ?? new Date().toISOString().split('T')[0];

        const statusMap = {
          scheduled: 'scheduled', agendado: 'scheduled', Agendado: 'scheduled', Pendente: 'scheduled',
          confirmed: 'confirmed', Confirmado: 'confirmed', confirmado: 'confirmed',
          in_progress: 'in_progress', 'Em atendimento': 'in_progress',
          completed: 'completed', Realizado: 'completed', realizado: 'completed', done: 'completed',
          cancelled: 'cancelled', Cancelado: 'cancelled', cancelado: 'cancelled',
          no_show: 'no_show', 'Faltou': 'no_show', faltou: 'no_show',
          rescheduled: 'rescheduled', Reagendado: 'rescheduled',
        };
        const typeMap = {
          evaluation: 'evaluation', avaliacao: 'evaluation', avaliação: 'evaluation', Avaliação: 'evaluation',
          session: 'session', individual: 'session', sessao: 'session', sessão: 'session',
          reassessment: 'reassessment', reavaliacao: 'reassessment',
          group: 'group', grupo: 'group',
          return: 'return', retorno: 'return',
        };

        const status = statusMap[d.status] ?? 'scheduled';
        const type = typeMap[d.session_type ?? d.type ?? ''] ?? null;

        // Helper: only pass a UUID if it's valid, otherwise null
        const uuid = (v) => UUID_RE.test(v ?? '') ? v : null;

        await sql`
          INSERT INTO appointments (
            id, firestore_id,
            patient_id, therapist_id, organization_id,
            date, start_time, end_time, duration_minutes,
            status, type, notes, cancellation_reason,
            cancelled_at, cancelled_by,
            created_by, created_at, updated_at
          ) VALUES (
            ${neonId}::uuid, ${fid},
            ${patientNeonId}::uuid,
            ${uuid(d.therapist_id)}::uuid,
            ${orgId}::uuid,
            ${apptDate},
            ${d.start_time ?? null},
            ${d.end_time ?? null},
            ${d.duration_minutes != null ? Number(d.duration_minutes) : null},
            ${status},
            ${type},
            ${d.notes ?? null},
            ${d.cancellation_reason ?? null},
            ${toDate(d.cancelled_at) ?? null},
            ${uuid(d.cancelled_by)}::uuid,
            ${uuid(d.created_by)}::uuid,
            ${toDate(d.created_at) ?? new Date().toISOString()},
            ${toDate(d.updated_at) ?? new Date().toISOString()}
          )
          ON CONFLICT (firestore_id) DO NOTHING
        `;
        inserted++;
      } catch (err) {
        console.error(`  ❌ Appointment ${fid}:`, err.message);
        errors++;
      }
    }));
    const progress = Math.min(i + BATCH_SIZE, docs.length);
    process.stdout.write(`\r   ${progress}/${docs.length} processados...`);
  }

  console.log(`\n   ✅ Appointments: inseridos=${inserted} erros=${errors} skipped=${skipped}`);

  if (!DRY_RUN) {
    const rows = await sql`SELECT id, firestore_id FROM appointments WHERE firestore_id IS NOT NULL`;
    rows.forEach(r => { apptIdMap[r.firestore_id] = r.id; });
  }

  return apptIdMap;
}

// ===== MAIN =====

async function main() {
  console.log(`\n🚀 Migração patients + appointments → Neon (${DRY_RUN ? 'DRY RUN' : 'EXECUÇÃO REAL'})\n`);

  const patientIdMap = await migratePatients();
  const apptIdMap = await migrateAppointments(patientIdMap);

  if (!DRY_RUN) {
    const [{ p }] = await sql`SELECT COUNT(*)::int AS p FROM patients`;
    const [{ a }] = await sql`SELECT COUNT(*)::int AS a FROM appointments`;
    console.log(`\n📊 Totais no Neon:`);
    console.log(`   Patients:     ${p}`);
    console.log(`   Appointments: ${a}`);
  }

  console.log('\n✅ Concluído!\n');
  return { patientIdMap, apptIdMap };
}

main().catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
