import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const SOURCE_DIR = path.resolve(process.env.SOURCE_DIR ?? 'scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast');
const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const LOG_PATH = path.join(SOURCE_DIR, APPLY ? 'evaluation_responses_apply_log.txt' : 'evaluation_responses_dryrun_log.txt');
const STATE_PATH = path.join(SOURCE_DIR, APPLY ? 'evaluation_responses_apply_estado.json' : 'evaluation_responses_dryrun_estado.json');

if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!IMPORT_USER_EMAIL) throw new Error('IMPORT_USER_EMAIL não informado');

const FORM_NAME = 'ZenFisio - Anamnese importada';
const FIELD_DEFS = [
  { key: 'zenfisio_raw_text', label: 'Texto original da avaliação ZenFisio', tipo_campo: 'texto_longo', ordem: 1, grupo: 'Anamnese', descricao: 'Conteúdo bruto importado do ZenFisio.' },
  { key: 'inspection', label: 'Inspeção', tipo_campo: 'texto_longo', ordem: 2, grupo: 'Exame físico', descricao: 'Seção extraída automaticamente quando encontrada.' },
  { key: 'palpation', label: 'Palpação', tipo_campo: 'texto_longo', ordem: 3, grupo: 'Exame físico', descricao: 'Seção extraída automaticamente quando encontrada.' },
  { key: 'range_of_motion', label: 'ADM', tipo_campo: 'texto_longo', ordem: 4, grupo: 'Exame físico', descricao: 'Amplitude de movimento extraída quando encontrada.' },
  { key: 'strength', label: 'Força', tipo_campo: 'texto_longo', ordem: 5, grupo: 'Exame físico', descricao: 'Teste/descrição de força extraída quando encontrada.' },
  { key: 'special_tests', label: 'Testes especiais', tipo_campo: 'texto_longo', ordem: 6, grupo: 'Exame físico', descricao: 'Testes especiais extraídos quando encontrados.' },
  { key: 'therapeutic_plan', label: 'Plano terapêutico', tipo_campo: 'texto_longo', ordem: 7, grupo: 'Plano', descricao: 'Plano terapêutico extraído quando encontrado.' },
  { key: 'zenfisio_metadata', label: 'Metadados da importação', tipo_campo: 'texto_longo', ordem: 8, grupo: 'Importação', descricao: 'Dados técnicos do vínculo com ZenFisio.' },
];

function normalizeName(value) {
  return String(value ?? '').trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
function parseBrDateTime(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = '12', min = '00'] = match;
  return { date: `${yyyy}-${mm}-${dd}`, timestamp: `${yyyy}-${mm}-${dd} ${hh}:${min}:00` };
}
function clean(text) {
  return String(text ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
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
  if (start < 0) return '';
  let end = raw.length;
  for (const label of endLabels) {
    const idx = lower.indexOf(label.toLowerCase(), start + labelLen);
    if (idx >= 0 && idx < end) end = idx;
  }
  return raw.slice(start + labelLen, end).trim();
}
function buildResponses(text, event, patientJson, parsed) {
  const raw = clean(text);
  const hasText = raw.length >= 20;
  const responses = {
    zenfisio_raw_text: hasText ? raw : 'Avaliação importada do ZenFisio sem conteúdo clínico/anamnese preenchido na origem.',
    inspection: extractSection(raw, ['Inspeção:', 'Inspeção'], ['Palpação', 'ADM', 'CCF', 'Força', 'Propriocepção', 'Testes', 'PLANO TERAPÊUTICO', 'CONDUTA']),
    palpation: extractSection(raw, ['Palpação:', 'Palpação'], ['ADM', 'CCF', 'Força', 'Propriocepção', 'Testes', 'PLANO TERAPÊUTICO', 'CONDUTA']),
    range_of_motion: extractSection(raw, ['ADM:', 'ADM'], ['CCF', 'Força', 'Propriocepção', 'Testes', 'PLANO TERAPÊUTICO', 'CONDUTA']),
    strength: extractSection(raw, ['Força:', 'Força', 'Teste de força:'], ['Propriocepção', 'Pliometria', 'Testes especiais', 'PLANO TERAPÊUTICO', 'CONDUTA']),
    special_tests: extractSection(raw, ['Testes especiais:', 'Testes especiais'], ['PLANO TERAPÊUTICO', 'CONDUTA']),
    therapeutic_plan: extractSection(raw, ['PLANO TERAPÊUTICO', 'Plano terapêutico'], ['CONDUTA']),
    zenfisio_metadata: [
      `Paciente ZenFisio: ${patientJson.paciente_id ?? ''}`,
      `Appointment ZenFisio: ${event.appointment_id ?? ''}`,
      `Tipo original: ${event.tipo ?? ''}`,
      `Status original: ${event.status ?? ''}`,
      `Data original: ${event.data_completa ?? event.data ?? ''}`,
      `Data importada: ${parsed?.timestamp ?? parsed?.date ?? ''}`,
    ].filter(Boolean).join('\n'),
  };
  return Object.fromEntries(Object.entries(responses).filter(([, value]) => String(value ?? '').trim().length > 0));
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
async function ensureForm(client, organizationId, therapistId, state) {
  const existing = await client.query(`
    SELECT id FROM evaluation_forms
    WHERE organization_id = $1 AND nome = $2
    LIMIT 1
  `, [organizationId, FORM_NAME]);
  let formId = existing.rows[0]?.id;
  if (!formId) {
    state.formsWouldCreate += 1;
    if (!APPLY) return { formId: null, fieldMap: new Map(FIELD_DEFS.map(f => [f.key, f.key])) };
    const inserted = await client.query(`
      INSERT INTO evaluation_forms (organization_id, created_by, nome, descricao, referencias, tipo, ativo, is_favorite, usage_count, created_at, updated_at)
      VALUES ($1, $2, $3, 'Importação de avaliações/anamneses do ZenFisio', 'ZenFisio', 'anamnesis', true, false, 0, NOW(), NOW())
      RETURNING id
    `, [organizationId, therapistId, FORM_NAME]);
    formId = inserted.rows[0].id;
    state.formsCreated += 1;
  }
  const fields = await client.query(`SELECT id, label FROM evaluation_form_fields WHERE form_id = $1`, [formId]);
  const fieldMap = new Map();
  for (const def of FIELD_DEFS) {
    const current = fields.rows.find(r => r.label === def.label);
    if (current) { fieldMap.set(def.key, current.id); continue; }
    state.fieldsWouldCreate += 1;
    if (!APPLY) { fieldMap.set(def.key, def.key); continue; }
    const inserted = await client.query(`
      INSERT INTO evaluation_form_fields (form_id, tipo_campo, label, placeholder, opcoes, ordem, obrigatorio, grupo, descricao, created_at, updated_at)
      VALUES ($1, $2, $3, NULL, NULL, $4, false, $5, $6, NOW(), NOW())
      RETURNING id
    `, [formId, def.tipo_campo, def.label, def.ordem, def.grupo, def.descricao]);
    fieldMap.set(def.key, inserted.rows[0].id);
    state.fieldsCreated += 1;
  }
  return { formId, fieldMap };
}
function mapResponsesToFieldIds(responses, fieldMap) {
  const mapped = {};
  for (const [key, value] of Object.entries(responses)) {
    const fieldId = fieldMap.get(key) ?? key;
    mapped[fieldId] = value;
  }
  return mapped;
}
function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJson(value[key])]));
  }
  return value;
}
function sameJson(a, b) {
  return JSON.stringify(stableJson(a ?? {})) === JSON.stringify(stableJson(b ?? {}));
}
async function findAppointment(client, organizationId, patientId, parsed, event) {
  const zenId = String(event.appointment_id ?? '').trim();
  if (zenId) {
    const byZen = await client.query(`
      SELECT id FROM appointments
      WHERE organization_id = $1 AND patient_id = $2 AND notes ILIKE $3 AND deleted_at IS NULL
      ORDER BY updated_at DESC NULLS LAST LIMIT 1
    `, [organizationId, patientId, `%ZenFisio appointment_id: ${zenId}%`]);
    if (byZen.rows.length) return byZen.rows[0].id;
  }
  const byTime = await client.query(`
    SELECT id FROM appointments
    WHERE organization_id = $1 AND patient_id = $2 AND date = $3::date
      AND start_time >= ($4::timestamp::time - interval '2 minutes')
      AND start_time <= ($4::timestamp::time + interval '2 minutes')
      AND deleted_at IS NULL
    ORDER BY updated_at DESC NULLS LAST LIMIT 1
  `, [organizationId, patientId, parsed.date, parsed.timestamp]);
  return byTime.rows[0]?.id ?? null;
}

async function main() {
  await mkdir(SOURCE_DIR, { recursive: true });
  await writeFile(LOG_PATH, '');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const state = { apply: APPLY, formsWouldCreate: 0, formsCreated: 0, fieldsWouldCreate: 0, fieldsCreated: 0, evaluatedEvents: 0, responsesWouldCreate: 0, responsesCreated: 0, responsesWouldUpdate: 0, responsesUpdated: 0, skipped: [], failures: [] };
  try {
    const profileRes = await client.query(`SELECT id, organization_id FROM profiles WHERE lower(email)=lower($1) ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1`, [IMPORT_USER_EMAIL]);
    if (!profileRes.rows.length) throw new Error('Perfil de importação não encontrado');
    const therapistId = profileRes.rows[0].id;
    const organizationId = profileRes.rows[0].organization_id;
    const { formId, fieldMap } = await ensureForm(client, organizationId, therapistId, state);
    await log(`Modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'} | org=${organizationId} | form=${formId ?? '(would-create)'}`);
    const seen = new Set();
    for (const file of await loadFiles()) {
      const patientJson = JSON.parse(await readFile(file, 'utf8'));
      const patientName = normalizeName(patientJson.paciente_nome ?? patientJson.nome);
      if (!patientName) continue;
      const patientRes = await client.query(`
        SELECT id FROM patients
        WHERE organization_id = $1 AND deleted_at IS NULL
          AND lower(regexp_replace(full_name, '\\s+', ' ', 'g')) = lower($2)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1
      `, [organizationId, patientName]);
      if (!patientRes.rows.length) { state.skipped.push({ patientName, reason: 'patient_not_found' }); continue; }
      const patientId = patientRes.rows[0].id;
      for (const event of Array.isArray(patientJson.historico) ? patientJson.historico : []) {
        if (!/^avalia/i.test(String(event.tipo ?? ''))) continue;
        const parsed = parseBrDateTime(event.data_completa ?? event.data);
        const key = `${patientId}|${event.data_completa ?? event.data}|${event.appointment_id ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        state.evaluatedEvents += 1;
        if (!parsed) { state.skipped.push({ patientName, reason: 'invalid_date', date: event.data_completa }); continue; }
        try {
          const appointmentId = await findAppointment(client, organizationId, patientId, parsed, event);
          const rawResponses = buildResponses(event.conteudo_texto, event, patientJson, parsed);
          const responses = mapResponsesToFieldIds(rawResponses, fieldMap);
          const hasText = clean(event.conteudo_texto).length >= 20;
          const status = hasText ? 'completed' : 'scheduled';
          const existing = appointmentId
            ? await client.query(`SELECT id, responses, status, appointment_id FROM patient_evaluation_responses WHERE organization_id=$1 AND appointment_id=$2 LIMIT 1`, [organizationId, appointmentId])
            : await client.query(`SELECT id, responses, status, appointment_id FROM patient_evaluation_responses WHERE organization_id=$1 AND patient_id=$2 AND form_id=$3 AND scheduled_for::date=$4::date LIMIT 1`, [organizationId, patientId, formId, parsed.date]);
          if (existing.rows.length) {
            const row = existing.rows[0];
            const shouldUpdate = row.status !== status || !sameJson(row.responses, responses) || (appointmentId && row.appointment_id !== appointmentId);
            if (shouldUpdate) {
              state.responsesWouldUpdate += 1;
              if (APPLY) {
              await client.query(`
                UPDATE patient_evaluation_responses
                SET responses=$1::jsonb, status=$2, scheduled_for=$3::timestamp,
                    completed_at=CASE WHEN $2='completed' THEN COALESCE(completed_at, $3::timestamp) ELSE completed_at END,
                    appointment_id=COALESCE(appointment_id, $4::uuid), updated_at=NOW()
                WHERE id=$5
              `, [JSON.stringify(responses), status, parsed.timestamp, appointmentId, row.id]);
                state.responsesUpdated += 1;
              }
            }
          } else {
            state.responsesWouldCreate += 1;
            if (APPLY) {
              await client.query(`
                INSERT INTO patient_evaluation_responses
                  (organization_id, patient_id, form_id, appointment_id, responses, status, scheduled_for, started_at, completed_at, created_by, created_at, updated_at)
                VALUES ($1,$2,$3,$4::uuid,$5::jsonb,$6,$7::timestamp,$7::timestamp,CASE WHEN $6='completed' THEN $7::timestamp ELSE NULL END,$8,NOW(),NOW())
              `, [organizationId, patientId, formId, appointmentId, JSON.stringify(responses), status, parsed.timestamp, therapistId]);
              state.responsesCreated += 1;
            }
          }
        } catch (error) {
          state.failures.push({ patientName, date: event.data_completa, error: error instanceof Error ? error.message : String(error) });
        }
      }
      await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    }
    await log(`Avaliações: ${state.evaluatedEvents}; criar: ${state.responsesWouldCreate}; atualizar: ${state.responsesWouldUpdate}; falhas: ${state.failures.length}`);
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    console.log(JSON.stringify(state, null, 2));
  } finally {
    await client.end();
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : String(error)); process.exit(1); });
