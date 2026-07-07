import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const SOURCE_DIR = path.resolve(process.env.SOURCE_DIR ?? 'scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast');
const DATABASE_URL = process.env.DATABASE_URL;
const ORG_ID = '00000000-0000-0000-0000-000000000001';
const APPLY = process.argv.includes('--apply') || process.env.APPLY_CLEAN === '1';
if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');

const STOP_MARKERS = [
  '× Boleto gerado com sucesso',
  'Boleto gerado com sucesso',
  'Indicações por e-mail para seus amigos',
  '$.widget.bridge',
  '$("#showCompleteRegistration")',
  'Nossa equipe está aqui para ajudar',
  'Solicitação de Demonstração ZenFisio',
  'Use este código de barras',
  'Informações importantes:',
];

function cleanText(text) {
  let out = String(text ?? '').replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ');
  let cut = -1;
  for (const marker of STOP_MARKERS) {
    const idx = out.indexOf(marker);
    if (idx >= 0 && (cut < 0 || idx < cut)) cut = idx;
  }
  if (cut >= 0) out = out.slice(0, cut);
  return out
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/\s+$/g, '')
    .trim();
}
function parseBrDateTime(raw) {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = '12', min = '00'] = match;
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
}
async function loadFiles() {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  return entries.filter(e => e.isFile() && /^paciente_.*\.json$/i.test(e.name)).map(e => path.join(SOURCE_DIR, e.name)).sort();
}

const state = { apply: APPLY, filesChanged: 0, eventsCleaned: 0, dbSessionsCleaned: 0, details: [] };
const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  for (const file of await loadFiles()) {
    const json = JSON.parse(await readFile(file, 'utf8'));
    let fileChanged = false;
    const patientName = String(json.paciente_nome ?? '').trim();
    for (const event of json.historico ?? []) {
      if (!/^(Evolução|Avaliação)/i.test(String(event.tipo ?? ''))) continue;
      const oldText = String(event.conteudo_texto ?? '');
      const newText = cleanText(oldText);
      const changed = newText !== oldText;
      if (changed) {
        event.conteudo_texto = newText;
        fileChanged = true;
        state.eventsCleaned += 1;
      }
      const date = parseBrDateTime(event.data_completa ?? event.data);
      if (!date) continue;
      const session = await client.query(`
        SELECT s.id, s.observacao
        FROM sessions s
        JOIN patients p ON p.id = s.patient_id
        WHERE s.organization_id = $1
          AND lower(regexp_replace(p.full_name, '\\s+', ' ', 'g')) = lower($2)
          AND s.date >= ($3::timestamp - interval '2 minutes')
          AND s.date <= ($3::timestamp + interval '2 minutes')
        ORDER BY ABS(EXTRACT(EPOCH FROM (s.date - $3::timestamp))) ASC
        LIMIT 1
      `, [ORG_ID, patientName, date]);
      if (!session.rows.length) continue;
      const dbOld = String(session.rows[0].observacao ?? '');
      const dbNew = cleanText(dbOld);
      if (dbNew !== dbOld) {
        state.dbSessionsCleaned += 1;
        state.details.push({ patientName, date, oldChars: dbOld.length, newChars: dbNew.length });
        if (APPLY) {
          await client.query(`UPDATE sessions SET observacao = $1, updated_at = NOW() WHERE id = $2`, [dbNew, session.rows[0].id]);
        }
      }
    }
    if (fileChanged) {
      state.filesChanged += 1;
      if (APPLY) await writeFile(file, JSON.stringify(json, null, 2));
    }
  }
  await writeFile(path.join(SOURCE_DIR, APPLY ? 'limpeza_boilerplate_apply.json' : 'limpeza_boilerplate_dryrun.json'), JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
} finally {
  await client.end();
}
