import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const SOURCE_DIR = path.resolve(process.env.SOURCE_DIR ?? 'scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast');
const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const ORG_FALLBACK = '00000000-0000-0000-0000-000000000001';
const LOG_PATH = path.join(SOURCE_DIR, APPLY ? 'agenda_incremental_apply_log.txt' : 'agenda_incremental_dryrun_log.txt');
const STATE_PATH = path.join(SOURCE_DIR, APPLY ? 'agenda_incremental_apply_estado.json' : 'agenda_incremental_dryrun_estado.json');

if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!IMPORT_USER_EMAIL) throw new Error('IMPORT_USER_EMAIL não informado');

function normalizeName(value) {
  return String(value ?? '').trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
function parseBrDateTime(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = '12', min = '00'] = match;
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}:00`, timestamp: `${yyyy}-${mm}-${dd} ${hh}:${min}:00` };
}
function appointmentType(event) {
  return /^avalia/i.test(String(event?.tipo ?? '')) ? 'evaluation' : 'session';
}
function appointmentStatus(event) {
  const tipo = String(event?.tipo ?? '').toLowerCase();
  const text = String(event?.conteudo_texto ?? '').trim();
  if (tipo.includes('cancel')) return 'cancelado';
  if (tipo.includes('falt')) return 'faltou';
  if (tipo.includes('não atendido') || tipo.includes('nao atendido')) return 'nao_atendido';
  if ((tipo.includes('evolu') || tipo.includes('avalia')) && text.length > 0) return 'atendido';
  return 'agendado';
}
function endTime(startTime, duration = 60) {
  const [hh, mm] = startTime.split(':').map(Number);
  const total = hh * 60 + mm + duration;
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}
function isClinicalWithText(event) {
  return /^(evolução|avaliação)/i.test(String(event?.tipo ?? '').trim()) && String(event?.conteudo_texto ?? '').trim().length > 0;
}
function eventKey(patientId, patientName, event) {
  return [patientId || '', patientName, event.data_completa || event.data || '', event.tipo || '', event.appointment_id || ''].join('|');
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
async function getProfile(client) {
  const res = await client.query(`
    SELECT id, organization_id
    FROM profiles
    WHERE lower(email) = lower($1)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  `, [IMPORT_USER_EMAIL]);
  if (!res.rows.length) throw new Error('Perfil de importação não encontrado');
  return { therapistId: res.rows[0].id, organizationId: res.rows[0].organization_id || ORG_FALLBACK };
}
async function findOrCreatePatient(client, organizationId, patientName, state) {
  const existing = await client.query(`
    SELECT id, full_name
    FROM patients
    WHERE organization_id = $1
      AND deleted_at IS NULL
      AND lower(regexp_replace(full_name, '\\s+', ' ', 'g')) = lower($2)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  `, [organizationId, patientName]);
  if (existing.rows.length) return existing.rows[0].id;
  state.patientsWouldCreate += 1;
  if (!APPLY) return null;
  const inserted = await client.query(`
    INSERT INTO patients (full_name, organization_id, is_active, incomplete_registration, consent_data, consent_image, created_at, updated_at)
    VALUES ($1, $2, true, true, true, false, NOW(), NOW())
    RETURNING id
  `, [patientName, organizationId]);
  state.patientsCreated += 1;
  return inserted.rows[0].id;
}
async function findExistingAppointment(client, organizationId, patientId, parsed, event) {
  const zenId = String(event.appointment_id ?? '').trim();
  const byNote = zenId
    ? await client.query(`
        SELECT id, status, type, notes
        FROM appointments
        WHERE organization_id = $1
          AND patient_id = $2
          AND deleted_at IS NULL
          AND notes ILIKE $3
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      `, [organizationId, patientId, `%ZenFisio appointment_id: ${zenId}%`])
    : { rows: [] };
  if (byNote.rows.length) return byNote.rows[0];
  const byTime = await client.query(`
    SELECT id, status, type, notes
    FROM appointments
    WHERE organization_id = $1
      AND patient_id = $2
      AND deleted_at IS NULL
      AND date = $3::date
      AND start_time >= ($4::time - interval '2 minutes')
      AND start_time <= ($4::time + interval '2 minutes')
    ORDER BY created_at ASC
    LIMIT 1
  `, [organizationId, patientId, parsed.date, parsed.time]);
  return byTime.rows[0] ?? null;
}
function buildNotes(event, patientJson) {
  const parts = ['Importado do ZenFisio'];
  if (event.appointment_id) parts.push(`ZenFisio appointment_id: ${event.appointment_id}`);
  if (patientJson.paciente_id) parts.push(`ZenFisio paciente_id: ${patientJson.paciente_id}`);
  if (event.tipo) parts.push(`Tipo original: ${event.tipo}`);
  return parts.join('\n');
}
async function linkSession(client, organizationId, patientId, appointmentId, parsed, state) {
  const res = await client.query(`
    UPDATE sessions
    SET appointment_id = COALESCE(appointment_id, $1), updated_at = NOW()
    WHERE organization_id = $2
      AND patient_id = $3
      AND date >= ($4::timestamp - interval '2 minutes')
      AND date <= ($4::timestamp + interval '2 minutes')
      AND (appointment_id IS NULL OR appointment_id = $1)
    RETURNING id
  `, [appointmentId, organizationId, patientId, parsed.timestamp]);
  state.sessionsLinked += res.rowCount ?? 0;
}

async function main() {
  await mkdir(SOURCE_DIR, { recursive: true });
  await writeFile(LOG_PATH, '');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const state = {
    apply: APPLY,
    sourceDir: SOURCE_DIR,
    rawEvents: 0,
    uniqueEvents: 0,
    patientsWouldCreate: 0,
    patientsCreated: 0,
    appointmentsWouldCreate: 0,
    appointmentsCreated: 0,
    appointmentsWouldUpdate: 0,
    appointmentsUpdated: 0,
    appointmentsSkippedExisting: 0,
    sessionsLinked: 0,
    skipped: [],
    failures: [],
  };
  try {
    const { therapistId, organizationId } = await getProfile(client);
    await log(`Modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'} | org=${organizationId} | therapist=${therapistId}`);
    const seen = new Set();
    const files = await loadFiles();
    for (const file of files) {
      const patientJson = JSON.parse(await readFile(file, 'utf8'));
      const patientName = normalizeName(patientJson.paciente_nome ?? patientJson.nome);
      if (!patientName) continue;
      for (const event of Array.isArray(patientJson.historico) ? patientJson.historico : []) {
        state.rawEvents += 1;
        const key = eventKey(patientJson.paciente_id, patientName, event);
        if (seen.has(key)) continue;
        seen.add(key);
        state.uniqueEvents += 1;
        const parsed = parseBrDateTime(event.data_completa ?? event.data);
        if (!parsed) {
          state.skipped.push({ patientName, event, reason: 'invalid_date' });
          continue;
        }
        try {
          const patientId = await findOrCreatePatient(client, organizationId, patientName, state);
          if (!patientId) {
            state.skipped.push({ patientName, date: event.data_completa, reason: 'patient_would_create' });
            continue;
          }
          const desiredStatus = appointmentStatus(event);
          const desiredType = appointmentType(event);
          const notes = buildNotes(event, patientJson);
          const existing = await findExistingAppointment(client, organizationId, patientId, parsed, event);
          let appointmentId;
          if (existing) {
            appointmentId = existing.id;
            const oldNotes = String(existing.notes ?? '');
            const shouldUpdate = existing.status !== desiredStatus || existing.type !== desiredType || !oldNotes.includes('Importado do ZenFisio');
            if (shouldUpdate) {
              state.appointmentsWouldUpdate += 1;
              if (APPLY) {
                await client.query(`
                  UPDATE appointments
                  SET status = $1,
                      type = $2::appointment_type,
                      notes = CASE WHEN COALESCE(notes, '') ILIKE '%Importado do ZenFisio%' THEN notes ELSE CONCAT_WS(E'\n\n', NULLIF(notes, ''), $3::text) END,
                      updated_at = NOW()
                  WHERE id = $4
                `, [desiredStatus, desiredType, notes, appointmentId]);
                state.appointmentsUpdated += 1;
              }
            } else {
              state.appointmentsSkippedExisting += 1;
            }
          } else {
            state.appointmentsWouldCreate += 1;
            if (APPLY) {
              const inserted = await client.query(`
                INSERT INTO appointments (patient_id, therapist_id, organization_id, date, start_time, end_time, duration_minutes, status, type, notes, created_at, updated_at)
                VALUES ($1, $2, $3, $4::date, $5::time, $6::time, 60, $7, $8::appointment_type, $9, NOW(), NOW())
                RETURNING id
              `, [patientId, therapistId, organizationId, parsed.date, parsed.time, endTime(parsed.time), desiredStatus, desiredType, notes]);
              appointmentId = inserted.rows[0].id;
              state.appointmentsCreated += 1;
            }
          }
          if (APPLY && appointmentId && isClinicalWithText(event)) {
            await linkSession(client, organizationId, patientId, appointmentId, parsed, state);
          }
        } catch (error) {
          state.failures.push({ patientName, date: event.data_completa, tipo: event.tipo, error: error instanceof Error ? error.message : String(error) });
        }
      }
      await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    }
    await log(`Eventos brutos: ${state.rawEvents}; únicos: ${state.uniqueEvents}`);
    await log(`Appointments criados: ${state.appointmentsCreated}/${state.appointmentsWouldCreate}; atualizados: ${state.appointmentsUpdated}/${state.appointmentsWouldUpdate}; existentes: ${state.appointmentsSkippedExisting}`);
    await log(`Sessões linkadas: ${state.sessionsLinked}; falhas: ${state.failures.length}; ignorados: ${state.skipped.length}`);
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    console.log(JSON.stringify(state, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
