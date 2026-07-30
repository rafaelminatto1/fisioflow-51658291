import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const SOURCE_FILE = path.resolve(process.env.SOURCE_FILE ?? 'scripts/zenfisio-scraper/data/zenfisio-export-20260727-20260801-authoritative/calendar_events_raw.json');
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const AUTHORITATIVE = process.argv.includes('--authoritative') || process.env.AUTHORITATIVE === '1';
const LOG_PATH = path.join(path.dirname(SOURCE_FILE), APPLY ? 'calendar_events_import_apply.json' : 'calendar_events_import_dryrun.json');

if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!IMPORT_USER_EMAIL) throw new Error('IMPORT_USER_EMAIL não informado');

function normalizeName(value) {
  return String(value ?? '').trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
function normalizeStatus(value) {
  const text = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (text.includes('avaliacao')) return 'avaliacao';
  if (text.includes('cancel')) return 'cancelado';
  if (text.includes('faltou') && (text.includes('aviso previo') || text.includes('com aviso'))) return 'faltou_com_aviso';
  if (text.includes('faltou') && text.includes('sem aviso')) return 'faltou_sem_aviso';
  if (text.includes('faltou')) return 'faltou';
  if (text.includes('nao atendido') && text.includes('sem cobranca')) return 'nao_atendido_sem_cobranca';
  if (text.includes('nao atendido')) return 'nao_atendido';
  if (text.includes('remarcar')) return 'remarcar';
  if (text.includes('confirm')) return 'presenca_confirmada';
  if (text.includes('atendido')) return 'atendido';
  return 'agendado';
}
function normalizeType(event) {
  return normalizeStatus(event.status) === 'avaliacao' ? 'evaluation' : 'session';
}
function parseTimestamp(value) {
  const m = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (!m) return null;
  return { date: m[1], time: m[2], timestamp: `${m[1]} ${m[2]}` };
}
function durationMinutes(start, end) {
  const s = parseTimestamp(start);
  const e = parseTimestamp(end);
  if (!s || !e) return 60;
  const [sh, sm] = s.time.split(':').map(Number);
  const [eh, em] = e.time.split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
}
function buildNotes(event) {
  const parts = ['Importado do ZenFisio Calendar'];
  if (event.id != null) parts.push(`ZenFisio appointment_id: ${event.id}`);
  if (event.contact_id != null) parts.push(`ZenFisio paciente_id: ${event.contact_id}`);
  if (event.contact_slug) parts.push(`ZenFisio paciente_slug: ${event.contact_slug}`);
  if (event.status) parts.push(`Status original: ${event.status}`);
  if (event.comment) parts.push(`Comentário ZenFisio: ${event.comment}`);
  return parts.join('\n');
}
function keyOf(event) {
  const start = parseTimestamp(event.start ?? event.date);
  return `${event.contact_id ?? ''}|${normalizeName(event.name)}|${start?.timestamp ?? ''}|${event.id ?? ''}`;
}
async function getProfile(client) {
  const r = await client.query(`
    SELECT id, organization_id
    FROM profiles
    WHERE lower(email) = lower($1)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  `, [IMPORT_USER_EMAIL]);
  if (!r.rows.length) throw new Error('Perfil de importação não encontrado');
  return { therapistId: r.rows[0].id, organizationId: r.rows[0].organization_id };
}
async function findOrCreatePatient(client, organizationId, event, state) {
  const name = normalizeName(event.name ?? event.title);
  const zenId = String(event.contact_id ?? '').trim();
  const byExternal = zenId ? await client.query(`
    SELECT id FROM patients
    WHERE organization_id = $1 AND deleted_at IS NULL
      AND notes ILIKE $2
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  `, [organizationId, `%ZenFisio paciente_id: ${zenId}%`]) : { rows: [] };
  if (byExternal.rows.length) return byExternal.rows[0].id;

  const byName = await client.query(`
    SELECT id FROM patients
    WHERE organization_id = $1 AND deleted_at IS NULL
      AND lower(regexp_replace(full_name, '\\s+', ' ', 'g')) = lower($2)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  `, [organizationId, name]);
  if (byName.rows.length) return byName.rows[0].id;

  state.patientsWouldCreate += 1;
  if (!APPLY) return null;
  const inserted = await client.query(`
    INSERT INTO patients (full_name, organization_id, is_active, incomplete_registration, consent_data, consent_image, notes, created_at, updated_at)
    VALUES ($1, $2, true, true, true, false, $3, NOW(), NOW())
    RETURNING id
  `, [name, organizationId, buildNotes(event)]);
  state.patientsCreated += 1;
  return inserted.rows[0].id;
}
async function findAppointment(client, organizationId, patientId, parsed, event) {
  const zenId = String(event.id ?? '').trim();
  if (zenId) {
    const byId = await client.query(`
      SELECT id, status, type, notes, start_time, end_time
      FROM appointments
      WHERE organization_id = $1 AND deleted_at IS NULL AND notes ILIKE $2
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `, [organizationId, `%ZenFisio appointment_id: ${zenId}%`]);
    if (byId.rows.length) return byId.rows[0];
  }
  const byTime = await client.query(`
    SELECT id, status, type, notes, start_time, end_time
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

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const { therapistId, organizationId } = await getProfile(client);
  const raw = JSON.parse(await readFile(SOURCE_FILE, 'utf8'));
  const seen = new Set();
  const events = [];
  for (const event of raw) {
    const parsed = parseTimestamp(event.start ?? event.date);
    if (!parsed) continue;
    const key = keyOf(event);
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(event);
  }
  const state = {
    apply: APPLY,
    authoritative: AUTHORITATIVE,
    sourceFile: SOURCE_FILE,
    rawEvents: raw.length,
    uniqueEvents: events.length,
    patientsWouldCreate: 0,
    patientsCreated: 0,
    appointmentsWouldCreate: 0,
    appointmentsCreated: 0,
    appointmentsWouldUpdate: 0,
    appointmentsUpdated: 0,
    appointmentsSkippedExisting: 0,
    appointmentsWouldSoftDelete: 0,
    appointmentsSoftDeleted: 0,
    sessionsLinked: 0,
    failures: [],
    samples: [],
  };
  const sourceZenIds = new Set(events.map((e) => String(e.id ?? '')).filter(Boolean));
  const sourceDates = [...new Set(events.map((e) => parseTimestamp(e.start ?? e.date)?.date).filter(Boolean))].sort();
  for (const event of events) {
    try {
      const patientId = await findOrCreatePatient(client, organizationId, event, state);
      if (!patientId) continue;
      const parsed = parseTimestamp(event.start ?? event.date);
      const desiredStatus = normalizeStatus(event.status);
      const desiredType = normalizeType(event);
      const duration = durationMinutes(event.start, event.end);
      const existing = await findAppointment(client, organizationId, patientId, parsed, event);
      const notes = buildNotes(event);
      let appointmentId = existing?.id;
      if (!existing) {
        state.appointmentsWouldCreate += 1;
        if (state.samples.length < 20) state.samples.push({ action: 'create', name: event.name, start: event.start, status: event.status });
        if (APPLY) {
          const r = await client.query(`
            INSERT INTO appointments (patient_id, therapist_id, organization_id, date, start_time, end_time, duration_minutes, status, type, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4::date, $5::time, $6::time, $7, $8, $9::appointment_type, $10, NOW(), NOW())
            RETURNING id
          `, [patientId, therapistId, organizationId, parsed.date, parsed.time, parseTimestamp(event.end)?.time ?? '23:59:00', duration, desiredStatus, desiredType, notes]);
          appointmentId = r.rows[0].id;
          state.appointmentsCreated += 1;
        }
      } else {
        const oldNotes = String(existing.notes ?? '');
        const desiredEnd = parseTimestamp(event.end)?.time ?? existing.end_time;
        const shouldUpdate = existing.status !== desiredStatus || String(existing.type) !== desiredType || String(existing.start_time).slice(0, 8) !== parsed.time || String(existing.end_time).slice(0, 8) !== desiredEnd || !oldNotes.includes(`ZenFisio appointment_id: ${event.id}`);
        if (shouldUpdate) {
          state.appointmentsWouldUpdate += 1;
          if (state.samples.length < 20) state.samples.push({ action: 'update', name: event.name, start: event.start, status: event.status, from: { status: existing.status, type: existing.type } });
          if (APPLY) {
            await client.query(`
              UPDATE appointments
              SET status = $1,
                  type = $2::appointment_type,
                  start_time = $3::time,
                  end_time = $4::time,
                  duration_minutes = $5,
                  notes = CASE
                    WHEN COALESCE(notes, '') ILIKE '%ZenFisio appointment_id:%' THEN notes
                    ELSE CONCAT_WS(E'\n\n', NULLIF(notes, ''), $6::text)
                  END,
                  updated_at = NOW()
              WHERE id = $7
            `, [desiredStatus, desiredType, parsed.time, desiredEnd, duration, notes, existing.id]);
            state.appointmentsUpdated += 1;
          }
        } else {
          state.appointmentsSkippedExisting += 1;
        }
      }
      if (APPLY && appointmentId) {
        const linked = await client.query(`
          UPDATE sessions
          SET appointment_id = COALESCE(appointment_id, $1), updated_at = NOW()
          WHERE organization_id = $2
            AND patient_id = $3
            AND date >= ($4::timestamp - interval '2 minutes')
            AND date <= ($4::timestamp + interval '2 minutes')
            AND (appointment_id IS NULL OR appointment_id = $1)
          RETURNING id
        `, [appointmentId, organizationId, patientId, parsed.timestamp]);
        state.sessionsLinked += linked.rowCount ?? 0;
      }
    } catch (error) {
      state.failures.push({ name: event.name, start: event.start, status: event.status, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (AUTHORITATIVE && sourceDates.length) {
    const extra = await client.query(`
      SELECT id, notes, patient_id, date, start_time
      FROM appointments
      WHERE organization_id = $1
        AND deleted_at IS NULL
        AND date >= $2::date
        AND date <= $3::date
        AND COALESCE(notes, '') ILIKE '%ZenFisio appointment_id:%'
    `, [organizationId, sourceDates[0], sourceDates[sourceDates.length - 1]]);
    for (const row of extra.rows) {
      const m = String(row.notes ?? '').match(/ZenFisio appointment_id:\s*(\d+)/);
      if (!m || sourceZenIds.has(m[1])) continue;
      state.appointmentsWouldSoftDelete += 1;
      if (state.samples.length < 20) state.samples.push({ action: 'soft_delete_extra', id: row.id, date: row.date, start_time: row.start_time, zenId: m[1] });
      if (APPLY) {
        await client.query(`UPDATE appointments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`, [row.id]);
        state.appointmentsSoftDeleted += 1;
      }
    }
  }

  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  await writeFile(LOG_PATH, JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
} finally {
  await client.end();
}
