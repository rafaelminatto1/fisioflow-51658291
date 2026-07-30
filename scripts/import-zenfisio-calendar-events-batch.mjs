import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const SOURCE_FILE = path.resolve(process.env.SOURCE_FILE ?? 'scripts/zenfisio-scraper/data/calendar_events_20210701_20260802_raw.json');
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const AUTHORITATIVE = process.argv.includes('--authoritative') || process.env.AUTHORITATIVE === '1';
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!IMPORT_USER_EMAIL) throw new Error('IMPORT_USER_EMAIL não informado');

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function displayName(event) {
  return String(event.name ?? event.title ?? '').normalize('NFKC').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
function normalizeStatus(value) {
  const text = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
function endTime(event) {
  return parseTimestamp(event.end)?.time ?? '23:59:00';
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
function appointmentTimeKey(patientId, parsed) {
  return `${patientId}|${parsed.date}|${parsed.time}`;
}
function eventKey(event) {
  return String(event.id ?? `${event.contact_id}|${event.start}|${displayName(event)}`);
}

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const profile = await client.query(`
    SELECT id, organization_id FROM profiles
    WHERE lower(email)=lower($1)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  `, [IMPORT_USER_EMAIL]);
  if (!profile.rows.length) throw new Error('Perfil de importação não encontrado');
  const therapistId = profile.rows[0].id;
  const organizationId = profile.rows[0].organization_id;

  const raw = JSON.parse(await readFile(SOURCE_FILE, 'utf8'));
  const sourceByZenId = new Map();
  const events = [];
  for (const event of raw) {
    const parsed = parseTimestamp(event.start ?? event.date);
    const name = displayName(event);
    if (!parsed || !name) continue;
    const key = eventKey(event);
    if (sourceByZenId.has(key)) continue;
    sourceByZenId.set(key, event);
    events.push(event);
  }
  const dates = events.map((e) => parseTimestamp(e.start ?? e.date).date).sort();
  const minDate = dates[0];
  const maxDate = dates.at(-1);

  const patientsRes = await client.query(`
    SELECT id, full_name, notes
    FROM patients
    WHERE organization_id=$1 AND deleted_at IS NULL
  `, [organizationId]);
  const patientsByName = new Map();
  const patientsByZenId = new Map();
  for (const row of patientsRes.rows) {
    const nk = normalizeName(row.full_name);
    if (!patientsByName.has(nk)) patientsByName.set(nk, row.id);
    const m = String(row.notes ?? '').match(/ZenFisio paciente_id:\s*(\d+)/);
    if (m) patientsByZenId.set(m[1], row.id);
  }

  const apptRes = await client.query(`
    SELECT id, patient_id, date::text, start_time::text, end_time::text, status, type::text, notes
    FROM appointments
    WHERE organization_id=$1 AND deleted_at IS NULL
      AND date >= $2::date AND date <= $3::date
  `, [organizationId, minDate, maxDate]);
  const apptsByZenId = new Map();
  const apptsByTime = new Map();
  for (const row of apptRes.rows) {
    const m = String(row.notes ?? '').match(/ZenFisio appointment_id:\s*(\d+)/);
    if (m) apptsByZenId.set(m[1], row);
    if (!apptsByTime.has(`${row.patient_id}|${row.date}|${String(row.start_time).slice(0, 8)}`)) {
      apptsByTime.set(`${row.patient_id}|${row.date}|${String(row.start_time).slice(0, 8)}`, row);
    }
  }

  const state = {
    apply: APPLY,
    authoritative: AUTHORITATIVE,
    sourceFile: SOURCE_FILE,
    rawEvents: raw.length,
    uniqueEvents: events.length,
    patientsExisting: patientsRes.rows.length,
    patientsWouldCreate: 0,
    patientsCreated: 0,
    appointmentsExistingInRange: apptRes.rows.length,
    appointmentsWouldCreate: 0,
    appointmentsCreated: 0,
    appointmentsWouldUpdate: 0,
    appointmentsUpdated: 0,
    appointmentsSkippedExisting: 0,
    appointmentsWouldSoftDelete: 0,
    appointmentsSoftDeleted: 0,
    failures: [],
    samples: [],
  };

  await client.query('BEGIN');
  try {
    for (const event of events) {
      try {
        const parsed = parseTimestamp(event.start ?? event.date);
        const name = displayName(event);
        const zenPatientId = String(event.contact_id ?? '').trim();
        let patientId = (zenPatientId && patientsByZenId.get(zenPatientId)) || patientsByName.get(normalizeName(name));
        if (!patientId) {
          state.patientsWouldCreate += 1;
          if (APPLY) {
            const inserted = await client.query(`
              INSERT INTO patients (full_name, organization_id, is_active, incomplete_registration, consent_data, consent_image, notes, created_at, updated_at)
              VALUES ($1, $2, true, true, true, false, $3, NOW(), NOW())
              RETURNING id
            `, [name, organizationId, buildNotes(event)]);
            patientId = inserted.rows[0].id;
            patientsByName.set(normalizeName(name), patientId);
            if (zenPatientId) patientsByZenId.set(zenPatientId, patientId);
            state.patientsCreated += 1;
          } else {
            patientId = `DRY_PATIENT:${normalizeName(name)}`;
          }
        }

        const desiredStatus = normalizeStatus(event.status);
        const desiredType = normalizeType(event);
        const desiredEnd = endTime(event);
        const desiredDuration = durationMinutes(event.start, event.end);
        const zenId = String(event.id ?? '').trim();
        const timeMatch = apptsByTime.get(appointmentTimeKey(patientId, parsed));
        const timeMatchHasOtherZenId = timeMatch && /ZenFisio appointment_id:\s*\d+/i.test(String(timeMatch.notes ?? ''));
        const existing = (zenId && apptsByZenId.get(zenId)) || (timeMatchHasOtherZenId ? null : timeMatch);
        if (!existing) {
          state.appointmentsWouldCreate += 1;
          if (state.samples.length < 20) state.samples.push({ action: 'create', name, start: event.start, status: event.status });
          if (APPLY) {
            const inserted = await client.query(`
              INSERT INTO appointments (patient_id, therapist_id, organization_id, date, start_time, end_time, duration_minutes, status, type, notes, created_at, updated_at)
              VALUES ($1, $2, $3, $4::date, $5::time, $6::time, $7, $8, $9::appointment_type, $10, NOW(), NOW())
              RETURNING id, patient_id, date::text, start_time::text, end_time::text, status, type::text, notes
            `, [patientId, therapistId, organizationId, parsed.date, parsed.time, desiredEnd, desiredDuration, desiredStatus, desiredType, buildNotes(event)]);
            const row = inserted.rows[0];
            if (zenId) apptsByZenId.set(zenId, row);
            apptsByTime.set(appointmentTimeKey(patientId, parsed), row);
            state.appointmentsCreated += 1;
          }
          continue;
        }

        const oldNotes = String(existing.notes ?? '');
        const shouldUpdate = existing.status !== desiredStatus
          || existing.type !== desiredType
          || String(existing.start_time).slice(0, 8) !== parsed.time
          || String(existing.end_time).slice(0, 8) !== desiredEnd
          || !oldNotes.includes(`ZenFisio appointment_id: ${zenId}`);
        if (shouldUpdate) {
          state.appointmentsWouldUpdate += 1;
          if (state.samples.length < 20) state.samples.push({ action: 'update', name, start: event.start, status: event.status, from: { status: existing.status, type: existing.type } });
          if (APPLY) {
            await client.query(`
              UPDATE appointments
              SET status=$1,
                  type=$2::appointment_type,
                  start_time=$3::time,
                  end_time=$4::time,
                  duration_minutes=$5,
                  notes = CASE
                    WHEN COALESCE(notes, '') ILIKE '%ZenFisio appointment_id:%' THEN notes
                    ELSE CONCAT_WS(E'\n\n', NULLIF(notes, ''), $6::text)
                  END,
                  updated_at=NOW()
              WHERE id=$7
            `, [desiredStatus, desiredType, parsed.time, desiredEnd, desiredDuration, buildNotes(event), existing.id]);
            state.appointmentsUpdated += 1;
          }
        } else {
          state.appointmentsSkippedExisting += 1;
        }
      } catch (error) {
        state.failures.push({ name: displayName(event), start: event.start, status: event.status, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (AUTHORITATIVE) {
      for (const [zenId, row] of apptsByZenId.entries()) {
        if (sourceByZenId.has(zenId)) continue;
        state.appointmentsWouldSoftDelete += 1;
        if (state.samples.length < 20) state.samples.push({ action: 'soft_delete_extra', id: row.id, zenId, date: row.date, start_time: row.start_time });
        if (APPLY) {
          await client.query(`UPDATE appointments SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1`, [row.id]);
          state.appointmentsSoftDeleted += 1;
        }
      }
    }

    if (APPLY) await client.query('COMMIT');
    else await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  const outPath = path.join(path.dirname(SOURCE_FILE), APPLY ? 'calendar_events_batch_import_apply.json' : 'calendar_events_batch_import_dryrun.json');
  await writeFile(outPath, JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
} finally {
  await client.end();
}
