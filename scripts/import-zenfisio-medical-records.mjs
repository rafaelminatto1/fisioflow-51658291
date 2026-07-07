import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const SOURCE_DIR = path.resolve(process.env.SOURCE_DIR ?? 'scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast');
const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const LOG_PATH = path.join(SOURCE_DIR, APPLY ? 'medical_records_apply_log.txt' : 'medical_records_dryrun_log.txt');
const STATE_PATH = path.join(SOURCE_DIR, APPLY ? 'medical_records_apply_estado.json' : 'medical_records_dryrun_estado.json');

if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!IMPORT_USER_EMAIL) throw new Error('IMPORT_USER_EMAIL não informado');

function normalizeName(value) {
  return String(value ?? '').trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
function parseBrDate(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}
function clean(text) {
  return String(text ?? '').replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
function extractSection(text, startLabels, endLabels) {
  const raw = clean(text);
  const lower = raw.toLowerCase();
  let start = -1;
  let labelLen = 0;
  for (const label of startLabels) {
    const idx = lower.indexOf(label.toLowerCase());
    if (idx >= 0 && (start < 0 || idx < start)) { start = idx; labelLen = label.length; }
  }
  if (start < 0) return null;
  let end = raw.length;
  for (const label of endLabels) {
    const idx = lower.indexOf(label.toLowerCase(), start + labelLen);
    if (idx >= 0 && idx < end) end = idx;
  }
  const value = raw.slice(start + labelLen, end).trim();
  return value || null;
}
function buildPhysicalExam(text, event, patientJson) {
  const raw = clean(text);
  return {
    source: 'zenfisio',
    imported_at: new Date().toISOString(),
    zenfisio_patient_id: patientJson.paciente_id ?? null,
    zenfisio_appointment_id: event.appointment_id ?? null,
    original_type: event.tipo ?? null,
    raw_text: raw,
    sections: {
      inspection: extractSection(raw, ['Inspeção:', 'Inspeção'], ['Palpação', 'ADM', 'CCF', 'Força', 'Propriocepção', 'Testes', 'PLANO TERAPÊUTICO', 'CONDUTA']),
      palpation: extractSection(raw, ['Palpação:', 'Palpação'], ['ADM', 'CCF', 'Força', 'Propriocepção', 'Testes', 'PLANO TERAPÊUTICO', 'CONDUTA']),
      range_of_motion: extractSection(raw, ['ADM:', 'ADM'], ['CCF', 'Força', 'Propriocepção', 'Testes', 'PLANO TERAPÊUTICO', 'CONDUTA']),
      strength: extractSection(raw, ['Força:', 'Força', 'Teste de força:'], ['Propriocepção', 'Pliometria', 'Testes especiais', 'PLANO TERAPÊUTICO', 'CONDUTA']),
      special_tests: extractSection(raw, ['Testes especiais:', 'Testes especiais'], ['PLANO TERAPÊUTICO', 'CONDUTA']),
      therapeutic_plan: extractSection(raw, ['PLANO TERAPÊUTICO', 'Plano terapêutico'], ['CONDUTA']),
      conduct: extractSection(raw, ['CONDUTA', 'Conduta:'], []),
    },
  };
}
async function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  await writeFile(LOG_PATH, `${msg}\n`, { flag: 'a' });
}
async function loadFiles() {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  return entries.filter(e => e.isFile() && /^paciente_.*\.json$/i.test(e.name)).map(e => path.join(SOURCE_DIR, e.name)).sort();
}

async function main() {
  await mkdir(SOURCE_DIR, { recursive: true });
  await writeFile(LOG_PATH, '');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const state = { apply: APPLY, evaluatedEvents: 0, recordsWouldCreate: 0, recordsCreated: 0, recordsWouldUpdate: 0, recordsUpdated: 0, skipped: [], failures: [] };
  try {
    const profileRes = await client.query(`
      SELECT id, organization_id
      FROM profiles
      WHERE lower(email) = lower($1)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1
    `, [IMPORT_USER_EMAIL]);
    if (!profileRes.rows.length) throw new Error('Perfil de importação não encontrado');
    const therapistId = profileRes.rows[0].id;
    const organizationId = profileRes.rows[0].organization_id;
    await log(`Modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'} | org=${organizationId}`);
    const seen = new Set();
    for (const file of await loadFiles()) {
      const patientJson = JSON.parse(await readFile(file, 'utf8'));
      const patientName = normalizeName(patientJson.paciente_nome ?? patientJson.nome);
      if (!patientName) continue;
      const patientRes = await client.query(`
        SELECT id FROM patients
        WHERE organization_id = $1 AND deleted_at IS NULL
          AND lower(regexp_replace(full_name, '\\s+', ' ', 'g')) = lower($2)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `, [organizationId, patientName]);
      if (!patientRes.rows.length) { state.skipped.push({ patientName, reason: 'patient_not_found' }); continue; }
      const patientId = patientRes.rows[0].id;
      for (const event of Array.isArray(patientJson.historico) ? patientJson.historico : []) {
        if (!/^avalia/i.test(String(event.tipo ?? ''))) continue;
        const text = clean(event.conteudo_texto);
        const recordDate = parseBrDate(event.data_completa ?? event.data);
        const key = `${patientId}|${recordDate}|${event.appointment_id || ''}|${text.length}`;
        if (seen.has(key)) continue;
        seen.add(key);
        state.evaluatedEvents += 1;
        if (!recordDate || text.length < 80) { state.skipped.push({ patientName, date: event.data_completa, reason: 'empty_or_short_assessment' }); continue; }
        const physicalExam = buildPhysicalExam(text, event, patientJson);
        const existing = await client.query(`
          SELECT id, physical_exam
          FROM medical_records
          WHERE organization_id = $1
            AND patient_id = $2
            AND record_date = $3::date
            AND deleted_at IS NULL
            AND physical_exam @> '{"source":"zenfisio"}'::jsonb
          LIMIT 1
        `, [organizationId, patientId, recordDate]);
        if (existing.rows.length) {
          state.recordsWouldUpdate += 1;
          if (APPLY) {
            await client.query(`
              UPDATE medical_records
              SET physical_exam = $1::jsonb,
                  current_history = COALESCE(NULLIF(current_history, ''), $2),
                  updated_at = NOW()
              WHERE id = $3
            `, [JSON.stringify(physicalExam), text, existing.rows[0].id]);
            state.recordsUpdated += 1;
          }
        } else {
          state.recordsWouldCreate += 1;
          if (APPLY) {
            await client.query(`
              INSERT INTO medical_records (patient_id, organization_id, record_date, current_history, physical_exam, created_by, created_at, updated_at)
              VALUES ($1, $2, $3::date, $4, $5::jsonb, $6, NOW(), NOW())
            `, [patientId, organizationId, recordDate, text, JSON.stringify(physicalExam), therapistId]);
            state.recordsCreated += 1;
          }
        }
      }
      await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    }
    await log(`Avaliações analisadas: ${state.evaluatedEvents}; criar: ${state.recordsWouldCreate}; atualizar: ${state.recordsWouldUpdate}; ignoradas: ${state.skipped.length}; falhas: ${state.failures.length}`);
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    console.log(JSON.stringify(state, null, 2));
  } finally {
    await client.end();
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : String(error)); process.exit(1); });
