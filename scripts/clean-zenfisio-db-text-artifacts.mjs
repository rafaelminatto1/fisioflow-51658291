import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_CLEAN === '1';
const ORG_ID = process.env.ORG_ID || '00000000-0000-0000-0000-000000000001';
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');

function cleanText(value) {
  let out = String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<(p|div|li|h[1-6]|tr|section|article)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&times;/gi, '')
    .replace(/×/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/\s+$/g, '')
    .trim();
  if (/^(?:Navegação principal|Central de ajuda|Indique o ZenFisio|Agenda\nPacientes)/i.test(out)) {
    const dateMatch = out.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
    if (dateMatch?.index != null) out = out.slice(dateMatch.index).trim();
  }
  return out;
}

function cleanJson(value) {
  if (value == null) return value;
  if (typeof value === 'string') return cleanText(value);
  if (Array.isArray(value)) return value.map(cleanJson);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanJson(v)]));
  }
  return value;
}

function changed(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

const state = {
  apply: APPLY,
  sessionsScanned: 0,
  sessionsWouldClean: 0,
  sessionsCleaned: 0,
  medicalRecordsScanned: 0,
  medicalRecordsWouldClean: 0,
  medicalRecordsCleaned: 0,
  evaluationResponsesScanned: 0,
  evaluationResponsesWouldClean: 0,
  evaluationResponsesCleaned: 0,
  samples: [],
};

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const sessions = await client.query(`
    SELECT id, patient_id, observacao
    FROM sessions
    WHERE organization_id = $1
      AND observacao IS NOT NULL
      AND (
        observacao ILIKE '%&times;%'
        OR observacao LIKE '%×%'
        OR observacao ILIKE '%</p>%'
        OR observacao ILIKE '%<br%'
        OR observacao ILIKE '%Boleto gerado%'
        OR observacao ILIKE '%Navegação principal%'
        OR observacao ILIKE '%Central de ajuda%'
        OR observacao ILIKE '%Indique o ZenFisio%'
      )
  `, [ORG_ID]);
  state.sessionsScanned = sessions.rows.length;
  for (const row of sessions.rows) {
    const oldText = String(row.observacao ?? '');
    const newText = cleanText(oldText);
    if (newText !== oldText) {
      state.sessionsWouldClean += 1;
      if (state.samples.length < 10) state.samples.push({ table: 'sessions', id: row.id, before: oldText.slice(-80), after: newText.slice(-80) });
      if (APPLY) {
        await client.query(`UPDATE sessions SET observacao = $1, updated_at = NOW() WHERE id = $2`, [newText, row.id]);
        state.sessionsCleaned += 1;
      }
    }
  }

  const records = await client.query(`
    SELECT id, current_history, physical_exam
    FROM medical_records
    WHERE organization_id = $1
      AND deleted_at IS NULL
      AND (
        current_history ILIKE '%&times;%'
        OR current_history LIKE '%×%'
        OR current_history ILIKE '%</p>%'
        OR current_history ILIKE '%Navegação principal%'
        OR current_history ILIKE '%Central de ajuda%'
        OR current_history ILIKE '%Indique o ZenFisio%'
        OR physical_exam::text ILIKE '%&times;%'
        OR physical_exam::text LIKE '%×%'
        OR physical_exam::text ILIKE '%</p>%'
      )
  `, [ORG_ID]);
  state.medicalRecordsScanned = records.rows.length;
  for (const row of records.rows) {
    const newHistory = cleanText(row.current_history ?? '');
    const newExam = cleanJson(row.physical_exam);
    const needs = newHistory !== String(row.current_history ?? '') || changed(newExam, row.physical_exam);
    if (needs) {
      state.medicalRecordsWouldClean += 1;
      if (state.samples.length < 10) state.samples.push({ table: 'medical_records', id: row.id });
      if (APPLY) {
        await client.query(`UPDATE medical_records SET current_history = $1, physical_exam = $2::jsonb, updated_at = NOW() WHERE id = $3`, [newHistory, JSON.stringify(newExam), row.id]);
        state.medicalRecordsCleaned += 1;
      }
    }
  }

  const responses = await client.query(`
    SELECT id, responses
    FROM patient_evaluation_responses
    WHERE organization_id = $1
      AND responses::text ~* '(&times;|×|</p>|<br)'
  `, [ORG_ID]);
  state.evaluationResponsesScanned = responses.rows.length;
  for (const row of responses.rows) {
    const newResponses = cleanJson(row.responses);
    if (changed(newResponses, row.responses)) {
      state.evaluationResponsesWouldClean += 1;
      if (state.samples.length < 10) state.samples.push({ table: 'patient_evaluation_responses', id: row.id });
      if (APPLY) {
        await client.query(`UPDATE patient_evaluation_responses SET responses = $1::jsonb, updated_at = NOW() WHERE id = $2`, [JSON.stringify(newResponses), row.id]);
        state.evaluationResponsesCleaned += 1;
      }
    }
  }

  console.log(JSON.stringify(state, null, 2));
} finally {
  await client.end();
}
