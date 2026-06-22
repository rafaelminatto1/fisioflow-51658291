import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const DEFAULT_SOURCE_DIR = path.resolve('scripts/zenfisio-scraper/data/zenfisio-export-20260620-v2');
const SOURCE_DIR = process.env.SOURCE_DIR ? path.resolve(process.env.SOURCE_DIR) : DEFAULT_SOURCE_DIR;
const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL;
const APPLY = process.argv.includes('--apply') || process.env.APPLY_IMPORT === '1' || process.env.APPLY_IMPORT === 'true';
const WIPE_EXISTING = process.argv.includes('--wipe') || process.env.WIPE_EXISTING !== 'false';
const LOG_PATH = path.join(SOURCE_DIR, 'importacao_log.txt');
const STATE_PATH = path.join(SOURCE_DIR, 'importacao_estado.json');

if (!DATABASE_URL) throw new Error('DATABASE_URL não informado');
if (!IMPORT_USER_EMAIL) throw new Error('IMPORT_USER_EMAIL não informado');

function logLine(stream, line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  stream.write(`${msg}\n`);
}

async function writeJsonFile(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function parseBrDateTime(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return null;

  const [, dd, mm, yyyy, hh = '12', min = '00'] = match;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00-03:00`);
}

function isImportableEvent(event) {
  const type = String(event?.tipo ?? '').trim();
  return /^(evolução|avaliação)/i.test(type);
}

function extractPainScale(text) {
  const raw = String(text ?? '');
  const patterns = [
    /\bEVA\b[^\d]{0,20}(\d{1,2})\s*\/\s*10/i,
    /\bEVA\b[^\d]{0,20}(\d{1,2})\b/i,
    /\bVAS\b[^\d]{0,20}(\d{1,2})\s*\/\s*10/i,
    /\bdor\b[^\d]{0,20}(\d{1,2})\s*\/\s*10/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 10) return value;
  }
  return null;
}

async function withRetry(fn, { attempts = 3, delayMs = 1000 } = {}) {
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts) break;
      const wait = delayMs * (2 ** (i - 1));
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError;
}

async function loadPatientFiles() {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^paciente_.*\.json$/i.test(entry.name))
    .map((entry) => path.join(SOURCE_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function buildEventRows(patientJson, therapistId) {
  const historico = Array.isArray(patientJson.historico) ? patientJson.historico : [];
  const importable = historico
    .filter(isImportableEvent)
    .map((event, index) => {
      const parsedDate = parseBrDateTime(event.data_completa ?? event.data);
      return {
        index,
        original: event,
        date: parsedDate,
        sortKey: parsedDate ? parsedDate.getTime() : Number.MAX_SAFE_INTEGER,
      };
    })
    .filter((entry) => entry.date);

  importable.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.index - b.index;
  });

  return importable.map((entry, sessionNumberIndex) => {
    const event = entry.original;
    const observacao = String(event.conteudo_texto ?? '').trim();
    return {
      date: entry.date,
      observacao,
      painScale: extractPainScale(observacao),
      therapistId,
      sessionNumber: sessionNumberIndex + 1,
      tipo: event.tipo,
    };
  });
}

async function main() {
  await mkdir(SOURCE_DIR, { recursive: true });
  const logStream = createWriteStream(LOG_PATH, { flags: 'a' });
  const state = {
    startedAt: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    apply: APPLY,
    wipeExisting: WIPE_EXISTING,
    processedFiles: [],
    failedFiles: [],
    importedPatients: 0,
    importedSessions: 0,
    patientsWithoutSessions: 0,
    totalPatients: 0,
  };

  logLine(logStream, 'Iniciando importação direta do ZenFisio');
  logLine(logStream, `Fonte: ${SOURCE_DIR}`);
  logLine(logStream, `Modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'}`);
  logLine(logStream, `Wipe existente: ${WIPE_EXISTING ? 'sim' : 'não'}`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const profileRes = await client.query(
      `
        SELECT id, organization_id, role
        FROM profiles
        WHERE lower(email) = lower($1)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
      [IMPORT_USER_EMAIL],
    );

    if (!profileRes.rows.length) {
      throw new Error(`Perfil não encontrado para ${IMPORT_USER_EMAIL}`);
    }

    const profile = profileRes.rows[0];
    const organizationId = profile.organization_id;
    const therapistId = profile.id;

    if (!organizationId) {
      throw new Error(`Usuário ${IMPORT_USER_EMAIL} sem organization_id`);
    }

    logLine(
      logStream,
      `Perfil encontrado: ${profile.id} | org: ${organizationId} | role: ${profile.role ?? 'n/a'}`,
    );

    const patientFiles = await loadPatientFiles();
    state.totalPatients = patientFiles.length;
    logLine(logStream, `Arquivos de paciente encontrados: ${patientFiles.length}`);

    const parsedPatients = [];
    for (const filePath of patientFiles) {
      const raw = await readFile(filePath, 'utf8');
      const patientJson = JSON.parse(raw);
      const patientName = normalizeName(patientJson.paciente_nome ?? patientJson.nome ?? path.basename(filePath));
      const events = buildEventRows(patientJson, therapistId);
      if (!events.length) {
        state.patientsWithoutSessions += 1;
      }
      parsedPatients.push({
        filePath,
        fileName: path.basename(filePath),
        patientName,
        externalId: String(patientJson.paciente_id ?? '').trim() || null,
        events,
      });
    }

    logLine(logStream, `Pacientes com histórico importável: ${parsedPatients.length}`);
    await writeJsonFile(STATE_PATH, state);

    if (!APPLY) {
      const preview = parsedPatients.slice(0, 3).map((item) => ({
        file: item.fileName,
        name: item.patientName,
        sessions: item.events.length,
      }));
      logLine(logStream, `Dry-run concluído. Amostra: ${JSON.stringify(preview)}`);
      await client.end();
      logStream.end();
      return;
    }

    if (WIPE_EXISTING) {
      logLine(logStream, `Limpando dados atuais da organização ${organizationId}...`);
      await client.query('BEGIN');
      try {
        await client.query(`DELETE FROM clinical_embeddings WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM clinical_reasoning_logs WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM clinical_scribe_logs WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM session_attachments WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM clinical_access_logs WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM ai_peer_reviews WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM pain_map_points WHERE pain_map_id IN (SELECT id FROM pain_maps WHERE organization_id = $1)`, [organizationId]);
        await client.query(`DELETE FROM package_usage WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_exercise_logs WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM group_checkins WHERE enrollment_id IN (SELECT id FROM group_enrollments WHERE organization_id = $1)`, [organizationId]);
        await client.query(`DELETE FROM group_enrollments WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_review_actions WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_annotations WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_events WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_frames WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_jobs WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_media WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_metrics WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM biomechanics_assessments WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM pain_maps WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM standardized_test_results WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_session_metrics WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM generated_reports WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM prescribed_exercises WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM exercise_prescriptions WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_objective_assignments WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_pathologies WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_goals WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM surgeries WHERE medical_record_id IN (SELECT id FROM medical_records WHERE organization_id = $1)`, [organizationId]);
        await client.query(`DELETE FROM pathologies WHERE medical_record_id IN (SELECT id FROM medical_records WHERE organization_id = $1)`, [organizationId]);
        await client.query(`DELETE FROM goals WHERE medical_record_id IN (SELECT id FROM medical_records WHERE organization_id = $1)`, [organizationId]);
        await client.query(`DELETE FROM medical_records WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_portal_users WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_gamification WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM xp_transactions WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM achievements_log WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM daily_quests WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_longitudinal_summary WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM patient_streaks WHERE patient_id IN (SELECT id FROM patients WHERE organization_id = $1)`, [organizationId]);
        await client.query(`DELETE FROM patient_packages WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM appointments WHERE organization_id = $1`, [organizationId]);
        await client.query(`DELETE FROM sessions WHERE organization_id = $1 OR patient_id IN (SELECT id FROM patients WHERE organization_id = $1)`, [organizationId]);
        await client.query(`DELETE FROM patients WHERE organization_id = $1`, [organizationId]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      logLine(logStream, 'Limpeza concluída.');
    }

    for (const [idx, patient] of parsedPatients.entries()) {
      const progress = `${idx + 1}/${parsedPatients.length}`;
      try {
        await withRetry(async () => {
          await client.query('BEGIN');
          try {
            const patientId = randomUUID();

            await client.query(
              `
                INSERT INTO patients (
                  id,
                  full_name,
                  organization_id,
                  is_active,
                  incomplete_registration,
                  consent_data,
                  consent_image,
                  notes,
                  observations,
                  created_at,
                  updated_at
                ) VALUES ($1, $2, $3, true, false, true, false, NULL, NULL, NOW(), NOW())
              `,
              [patientId, patient.patientName, organizationId],
            );

            const rows = patient.events;
            if (rows.length > 0) {
              const sessionValues = [];
              const placeholders = [];
              const COLS = 10;
              rows.forEach((row, i) => {
                const base = i * COLS;
                placeholders.push(
                  `(${Array.from({ length: COLS }, (_, k) => `$${base + k + 1}`).join(', ')})`,
                );
                // created_at/updated_at follow the historical session date so that
                // clinical views keyed off created_at (e.g. SessionHistoryPanel)
                // show when the session actually happened, not the import time.
                sessionValues.push(
                  patientId,
                  therapistId,
                  organizationId,
                  row.date,
                  row.observacao,
                  row.painScale,
                  row.sessionNumber,
                  'finalized',
                  row.date,
                  row.date,
                );
              });

              await client.query(
                `
                  INSERT INTO sessions (
                    patient_id,
                    therapist_id,
                    organization_id,
                    date,
                    observacao,
                    pain_scale,
                    session_number,
                    status,
                    created_at,
                    updated_at
                  ) VALUES ${placeholders.join(', ')}
                `,
                sessionValues,
              );
            }

            await client.query('COMMIT');

            state.importedPatients += 1;
            state.importedSessions += rows.length;
            state.processedFiles.push(patient.fileName);

            if (idx % 20 === 0 || idx + 1 === parsedPatients.length) {
              logLine(logStream, `${progress} importado: ${patient.patientName} | sessões: ${rows.length}`);
            }
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        }, { attempts: 3, delayMs: 1200 });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        state.failedFiles.push({ file: patient.fileName, name: patient.patientName, error: message });
        logLine(logStream, `${progress} FALHA: ${patient.patientName} -> ${message}`);
      }
      await writeJsonFile(STATE_PATH, state);
    }

    logLine(logStream, 'Importação concluída.');
    logLine(logStream, `Pacientes importados: ${state.importedPatients}`);
    logLine(logStream, `Sessões importadas: ${state.importedSessions}`);
    logLine(logStream, `Pacientes sem sessões importáveis: ${state.patientsWithoutSessions}`);
    logLine(logStream, `Falhas: ${state.failedFiles.length}`);
    await writeJsonFile(STATE_PATH, state);
  } finally {
    await client.end();
    logStream.end();
  }
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  try {
    await writeJsonFile(STATE_PATH, { error: message, finishedAt: new Date().toISOString() });
  } catch {
    // ignore
  }
  process.exit(1);
});
