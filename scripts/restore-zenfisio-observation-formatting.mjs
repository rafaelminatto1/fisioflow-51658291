import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const ORG_ID = process.env.ORG_ID || '00000000-0000-0000-0000-000000000001';
const SOURCE_DIRS = (process.env.SOURCE_DIRS || process.env.SOURCE_DIR || '')
  .split(':')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => path.resolve(p));
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!SOURCE_DIRS.length) throw new Error('SOURCE_DIRS/SOURCE_DIR não informado');

function normalizeName(value) {
  return String(value ?? '').trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
function cleanClinicalText(value) {
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
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/\s+$/g, '')
    .trim();
  if (/^(?:Navegação principal|Central de ajuda|Indique o ZenFisio|Agenda\nPacientes)/i.test(out)) {
    const dateMatch = out.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
    if (dateMatch?.index != null) out = out.slice(dateMatch.index).trim();
  }
  return out;
}
function parseBrDateTime(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = '12', min = '00'] = match;
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
}
function isClinical(event) {
  return /^(evolução|avaliação)/i.test(String(event?.tipo ?? '').trim());
}
async function loadFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && /^paciente_.*\.json$/i.test(e.name)).map((e) => path.join(dir, e.name)).sort();
}
function shouldUpdate(oldText, newText) {
  const oldClean = cleanClinicalText(oldText);
  if (!newText || oldClean === newText) return false;
  if (newText.length < Math.max(20, oldClean.length * 0.6)) return false;
  return true;
}

const client = new Client({ connectionString: DATABASE_URL });
const state = {
  apply: APPLY,
  sourceDirs: SOURCE_DIRS,
  files: 0,
  sourceEvents: 0,
  matched: 0,
  wouldUpdate: 0,
  updated: 0,
  skipped: [],
  failures: [],
  samples: [],
};
await client.connect();
try {
  for (const dir of SOURCE_DIRS) {
    for (const file of await loadFiles(dir)) {
      state.files += 1;
      let patientJson;
      try {
        patientJson = JSON.parse(await readFile(file, 'utf8'));
      } catch (error) {
        state.failures.push({ file: path.basename(file), error: String(error?.message ?? error) });
        continue;
      }
      const patientName = normalizeName(patientJson.paciente_nome ?? patientJson.nome);
      if (!patientName) continue;
      for (const event of Array.isArray(patientJson.historico) ? patientJson.historico : []) {
        if (!isClinical(event)) continue;
        const date = parseBrDateTime(event.data_completa ?? event.data);
        const newText = cleanClinicalText(event.conteudo_texto);
        if (!date || !newText) continue;
        state.sourceEvents += 1;
        const session = await client.query(`
          SELECT s.id, s.observacao, p.full_name
          FROM sessions s
          JOIN patients p ON p.id = s.patient_id
          WHERE s.organization_id = $1
            AND lower(regexp_replace(p.full_name, '\\s+', ' ', 'g')) = lower($2)
            AND s.date >= ($3::timestamp - interval '2 minutes')
            AND s.date <= ($3::timestamp + interval '2 minutes')
          ORDER BY ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp))) ASC, s.updated_at DESC NULLS LAST
          LIMIT 1
        `, [ORG_ID, patientName, date]);
        if (!session.rows.length) {
          if (state.skipped.length < 20) state.skipped.push({ patientName, date, reason: 'session_not_found' });
          continue;
        }
        state.matched += 1;
        const row = session.rows[0];
        const oldText = String(row.observacao ?? '');
        if (!shouldUpdate(oldText, newText)) continue;
        state.wouldUpdate += 1;
        if (state.samples.length < 12) {
          state.samples.push({
            patientName,
            date,
            oldLines: oldText.split('\n').length,
            newLines: newText.split('\n').length,
            oldPreview: oldText.slice(0, 160),
            newPreview: newText.slice(0, 220),
          });
        }
        if (APPLY) {
          await client.query(`UPDATE sessions SET observacao = $1, updated_at = NOW() WHERE id = $2`, [newText, row.id]);
          state.updated += 1;
        }
      }
    }
  }
  console.log(JSON.stringify(state, null, 2));
} finally {
  await client.end();
}
