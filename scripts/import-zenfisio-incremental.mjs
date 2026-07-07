import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const SOURCE_DIR = path.resolve(process.env.SOURCE_DIR ?? 'scripts/zenfisio-scraper/data/zenfisio-export-20260707-incremental-fast');
const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1';
const LOG_PATH = path.join(SOURCE_DIR, APPLY ? 'importacao_incremental_apply_log.txt' : 'importacao_incremental_dryrun_log.txt');
const STATE_PATH = path.join(SOURCE_DIR, APPLY ? 'importacao_incremental_apply_estado.json' : 'importacao_incremental_dryrun_estado.json');

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
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
}
function isImportableEvent(event) {
  return /^(evolução|avaliação)/i.test(String(event?.tipo ?? '').trim());
}
function extractPainScale(text) {
  const raw = String(text ?? '');
  for (const pattern of [/\bEVA\b[^\d]{0,20}(\d{1,2})\s*\/\s*10/i, /\bEVA\b[^\d]{0,20}(\d{1,2})\b/i, /\bdor\b[^\d]{0,20}(\d{1,2})\s*\/\s*10/i]) {
    const m = raw.match(pattern);
    if (!m) continue;
    const v = Number(m[1]);
    if (Number.isFinite(v) && v >= 0 && v <= 10) return v;
  }
  return null;
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
  const state = {
    apply: APPLY,
    sourceDir: SOURCE_DIR,
    files: 0,
    clinicalEventsFound: 0,
    patientsCreated: 0,
    sessionsCreated: 0,
    sessionsUpdated: 0,
    sessionsSkippedExisting: 0,
    patientsNotFoundOrCreated: [],
    eventsSkipped: [],
    failures: [],
  };
  try {
    const profileRes = await client.query(`
      SELECT id, organization_id, role
      FROM profiles
      WHERE lower(email) = lower($1)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1
    `, [IMPORT_USER_EMAIL]);
    if (!profileRes.rows.length) throw new Error('Perfil de importação não encontrado');
    const profile = profileRes.rows[0];
    const organizationId = profile.organization_id;
    const therapistId = profile.id;
    if (!organizationId) throw new Error('Perfil sem organization_id');
    await log(`Modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'} | org=${organizationId} | therapist=${therapistId}`);

    const files = await loadFiles();
    state.files = files.length;
    await log(`Arquivos incrementais encontrados: ${files.length}`);

    for (const file of files) {
      try {
        const patientJson = JSON.parse(await readFile(file, 'utf8'));
        const patientName = normalizeName(patientJson.paciente_nome ?? patientJson.nome);
        const events = (Array.isArray(patientJson.historico) ? patientJson.historico : [])
          .filter(isImportableEvent)
          .map((event) => ({
            event,
            date: parseBrDateTime(event.data_completa ?? event.data),
            observacao: String(event.conteudo_texto ?? '').trim(),
          }))
          .filter(item => item.date);
        state.clinicalEventsFound += events.length;
        if (!events.length) continue;

        let patientRes = await client.query(`
          SELECT id, full_name
          FROM patients
          WHERE organization_id = $1 AND lower(regexp_replace(full_name, '\\s+', ' ', 'g')) = lower($2)
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          LIMIT 1
        `, [organizationId, patientName]);

        let patientId;
        if (patientRes.rows.length) {
          patientId = patientRes.rows[0].id;
        } else {
          if (!APPLY) {
            state.patientsNotFoundOrCreated.push({ name: patientName, action: 'would_create' });
            patientId = null;
          } else {
            patientId = randomUUID();
            await client.query(`
              INSERT INTO patients (id, full_name, organization_id, is_active, incomplete_registration, consent_data, consent_image, created_at, updated_at)
              VALUES ($1, $2, $3, true, true, true, false, NOW(), NOW())
            `, [patientId, patientName, organizationId]);
            state.patientsCreated += 1;
            state.patientsNotFoundOrCreated.push({ name: patientName, action: 'created', id: patientId });
          }
        }
        if (!patientId) continue;

        for (const item of events) {
          const date = item.date;
          const existing = await client.query(`
            SELECT id, observacao, session_number
            FROM sessions
            WHERE organization_id = $1
              AND patient_id = $2
              AND date >= ($3::timestamp - interval '2 minutes')
              AND date <= ($3::timestamp + interval '2 minutes')
            ORDER BY ABS(EXTRACT(EPOCH FROM (date - $3::timestamp))) ASC
            LIMIT 1
          `, [organizationId, patientId, date]);

          if (existing.rows.length) {
            const row = existing.rows[0];
            const oldObs = String(row.observacao ?? '').trim();
            if (item.observacao && oldObs !== item.observacao) {
              if (APPLY) {
                await client.query(`
                  UPDATE sessions
                  SET observacao = $1,
                      pain_scale = COALESCE($2, pain_scale),
                      status = 'finalized',
                      updated_at = NOW()
                  WHERE id = $3
                `, [item.observacao, extractPainScale(item.observacao), row.id]);
              }
              state.sessionsUpdated += 1;
              await log(`${APPLY ? 'Atualizada' : 'Atualizaria'} sessão: ${patientName} | ${item.event.data_completa} | chars=${item.observacao.length}`);
            } else {
              state.sessionsSkippedExisting += 1;
            }
            continue;
          }

          const maxRes = await client.query(`SELECT COALESCE(MAX(session_number), 0) + 1 AS next_number FROM sessions WHERE organization_id = $1 AND patient_id = $2`, [organizationId, patientId]);
          const sessionNumber = Number(maxRes.rows[0].next_number ?? 1);
          if (APPLY) {
            await client.query(`
              INSERT INTO sessions (patient_id, therapist_id, organization_id, date, observacao, pain_scale, session_number, status, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, 'finalized', $4, NOW())
            `, [patientId, therapistId, organizationId, date, item.observacao, extractPainScale(item.observacao), sessionNumber]);
          }
          state.sessionsCreated += 1;
          await log(`${APPLY ? 'Criada' : 'Criaria'} sessão: ${patientName} | ${item.event.data_completa} | chars=${item.observacao.length}`);
        }
      } catch (error) {
        state.failures.push({ file: path.basename(file), error: error instanceof Error ? error.message : String(error) });
        await log(`FALHA ${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    }

    await log('Importação incremental concluída.');
    await log(`Eventos clínicos encontrados: ${state.clinicalEventsFound}`);
    await log(`Pacientes criados: ${state.patientsCreated}`);
    await log(`Sessões criadas: ${state.sessionsCreated}`);
    await log(`Sessões atualizadas: ${state.sessionsUpdated}`);
    await log(`Sessões já existentes sem mudança: ${state.sessionsSkippedExisting}`);
    await log(`Falhas: ${state.failures.length}`);
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
  } finally {
    await client.end();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
