import { createHash } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { HttpsError } from 'firebase-functions/v2/https';
import type { Pool, QueryResult } from 'pg';
import { getPool } from '../../init';
import { getLogger } from '../../lib/logger';
import { generateEmbeddingsForTexts } from './vertex-embeddings';

const logger = getLogger('ai-rag-index-maintenance');

const MIGRATION_API_KEY = process.env.MIGRATION_API_KEY || 'fisioflow-migration-2026';
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;
const DEFAULT_MAX_CHUNKS_PER_PATIENT = 220;
const CHUNK_SIZE = 520;
const CHUNK_OVERLAP = 100;

type PatientSourceType = 'treatment_session' | 'medical_record' | 'goal' | 'pain_record';

interface RebuildPatientRagInput {
  patientId?: string;
  organizationId?: string;
  limit?: number;
  dryRun?: boolean;
}

interface TriggerPatientRagReindexInput {
  patientId: string;
  organizationId?: string;
  reason?: string;
}

interface SourceDocument {
  sourceType: PatientSourceType;
  sourceId: string;
  sourceDate?: string;
  text: string;
  metadata: Record<string, unknown>;
}

interface ChunkDocument {
  patientId: string;
  organizationId?: string;
  sourceType: PatientSourceType;
  sourceId: string;
  sourceDate?: string;
  documentKey: string;
  chunkIndex: number;
  chunkText: string;
  chunkHash: string;
  metadata: Record<string, unknown>;
}

interface PatientProcessResult {
  patientId: string;
  chunkCount: number;
  status: 'indexed' | 'skipped' | 'error';
  error?: string;
}

interface RebuildPatientRagOutput {
  success: boolean;
  mode: 'dry-run' | 'write';
  processedPatients: number;
  indexedChunks: number;
  skippedPatients: number;
  patients: PatientProcessResult[];
  durationMs: number;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function truncateText(text: string, maxLength = 1200): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + CHUNK_SIZE);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }
  return chunks;
}

function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`;
}

function extractApiKey(req: any): string {
  const queryKey = req?.query?.key;
  if (Array.isArray(queryKey)) return String(queryKey[0] || '');
  if (typeof queryKey === 'string') return queryKey;

  const headerKey = req?.headers?.['x-migration-key'];
  if (Array.isArray(headerKey)) return String(headerKey[0] || '');
  if (typeof headerKey === 'string') return headerKey;

  return '';
}

function parseBody(req: any): Record<string, unknown> {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof req.body === 'object') return req.body as Record<string, unknown>;
  return {};
}

function sanitizeLimit(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

function sanitizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}

async function assertAdmin(uid: string): Promise<void> {
  const user = await getAuth().getUser(uid);
  const claims = (user.customClaims || {}) as Record<string, unknown>;
  const role = toStringValue(claims.role);
  if (role !== 'admin' && role !== 'owner' && role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Admin only');
  }
}

async function safeQuery(
  pool: Pool,
  label: string,
  sql: string,
  params: unknown[]
): Promise<QueryResult<Record<string, unknown>>> {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    logger.warn(`RAG indexing query failed (${label})`, {
      error: (error as Error).message,
    });
    return {
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
      rows: [],
    };
  }
}

async function fetchPatients(pool: Pool, input: Required<Pick<RebuildPatientRagInput, 'limit'>> & RebuildPatientRagInput) {
  const params: unknown[] = [];
  const where: string[] = [];

  if (input.patientId) {
    params.push(input.patientId);
    where.push(`id = $${params.length}`);
  }

  if (input.organizationId) {
    params.push(input.organizationId);
    where.push(`organization_id = $${params.length}`);
  }

  params.push(input.limit);
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT id, organization_id, name, main_condition, medical_history
    FROM patients
    ${whereClause}
    ORDER BY COALESCE(updated_at, created_at, NOW()) DESC
    LIMIT $${params.length}
  `;

  const result = await safeQuery(pool, 'patients', sql, params);
  return result.rows;
}

async function fetchPatientSources(pool: Pool, patientId: string, organizationId?: string) {
  const orgFilter = organizationId ? 'AND organization_id = $2' : '';
  const sessionParams = organizationId ? [patientId, organizationId, 80] : [patientId, 80];
  const defaultParams = organizationId ? [patientId, organizationId, 60] : [patientId, 60];
  const goalParams = organizationId ? [patientId, organizationId, 30] : [patientId, 30];
  const painParams = organizationId ? [patientId, organizationId, 30] : [patientId, 30];

  const sessionsSql = organizationId
    ? `
      SELECT id, session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after
      FROM treatment_sessions
      WHERE patient_id = $1 ${orgFilter}
      ORDER BY session_date DESC, created_at DESC
      LIMIT $3
    `
    : `
      SELECT id, session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after
      FROM treatment_sessions
      WHERE patient_id = $1
      ORDER BY session_date DESC, created_at DESC
      LIMIT $2
    `;

  const medicalSql = organizationId
    ? `
      SELECT id, record_date, type, title, content
      FROM medical_records
      WHERE patient_id = $1 ${orgFilter}
      ORDER BY record_date DESC, created_at DESC
      LIMIT $3
    `
    : `
      SELECT id, record_date, type, title, content
      FROM medical_records
      WHERE patient_id = $1
      ORDER BY record_date DESC, created_at DESC
      LIMIT $2
    `;

  const goalsSql = organizationId
    ? `
      SELECT id, description, status, priority, target_date
      FROM patient_goals
      WHERE patient_id = $1 ${orgFilter}
      ORDER BY target_date DESC NULLS LAST
      LIMIT $3
    `
    : `
      SELECT id, description, status, priority, target_date
      FROM patient_goals
      WHERE patient_id = $1
      ORDER BY target_date DESC NULLS LAST
      LIMIT $2
    `;

  const painRecordsSql = organizationId
    ? `
      SELECT id, record_date, pain_level, notes
      FROM pain_records
      WHERE patient_id = $1 ${orgFilter}
      ORDER BY record_date DESC, created_at DESC
      LIMIT $3
    `
    : `
      SELECT id, record_date, pain_level, notes
      FROM pain_records
      WHERE patient_id = $1
      ORDER BY record_date DESC, created_at DESC
      LIMIT $2
    `;

  const patientPainRecordsSql = organizationId
    ? `
      SELECT id, created_at, pain_level, notes
      FROM patient_pain_records
      WHERE patient_id = $1 ${orgFilter}
      ORDER BY created_at DESC
      LIMIT $3
    `
    : `
      SELECT id, created_at, pain_level, notes
      FROM patient_pain_records
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

  const [sessionsRes, medicalRes, goalsRes, painRes, patientPainRes] = await Promise.all([
    safeQuery(pool, 'treatment_sessions', sessionsSql, sessionParams),
    safeQuery(pool, 'medical_records', medicalSql, defaultParams),
    safeQuery(pool, 'patient_goals', goalsSql, goalParams),
    safeQuery(pool, 'pain_records', painRecordsSql, painParams),
    safeQuery(pool, 'patient_pain_records', patientPainRecordsSql, painParams),
  ]);

  const mergedPainRows = [
    ...painRes.rows,
    ...patientPainRes.rows.map((row) => ({
      ...row,
      record_date: toStringValue(row.created_at),
    })),
  ];

  return {
    sessions: sessionsRes.rows,
    medicalRecords: medicalRes.rows,
    goals: goalsRes.rows,
    painRecords: mergedPainRows,
  };
}

function pushSourceDocument(target: SourceDocument[], doc: SourceDocument | null): void {
  if (!doc) return;
  if (!doc.text || doc.text.trim().length === 0) return;
  target.push({
    ...doc,
    text: truncateText(doc.text, 6000),
  });
}

function buildSourceDocuments(
  patient: Record<string, unknown>,
  sources: {
    sessions: Record<string, unknown>[];
    medicalRecords: Record<string, unknown>[];
    goals: Record<string, unknown>[];
    painRecords: Record<string, unknown>[];
  }
): SourceDocument[] {
  const documents: SourceDocument[] = [];

  const patientName = toStringValue(patient.name) || 'Paciente';
  const mainCondition = toStringValue(patient.main_condition) || 'Nao informada';
  const medicalHistory = toStringValue(patient.medical_history);
  pushSourceDocument(documents, {
    sourceType: 'medical_record',
    sourceId: 'patient_profile',
    sourceDate: undefined,
    text: `Perfil clinico: ${patientName}. Condicao principal: ${mainCondition}.${medicalHistory ? ` Historico: ${medicalHistory}` : ''}`,
    metadata: { kind: 'patient_profile' },
  });

  sources.sessions.forEach((row, index) => {
    const sourceId = toStringValue(row.id) || `session_${index + 1}`;
    const sourceDate = toStringValue(row.session_date);
    const evolution = toStringValue(row.evolution);
    const observations = toStringValue(row.observations);
    const nextGoals = toStringValue(row.next_session_goals);
    const painBefore = toNumberValue(row.pain_level_before);
    const painAfter = toNumberValue(row.pain_level_after);
    const summary = [
      painBefore !== null ? `Dor antes ${painBefore}/10.` : '',
      painAfter !== null ? `Dor apos ${painAfter}/10.` : '',
      evolution ? `Evolucao: ${evolution}` : '',
      observations ? `Observacoes: ${observations}` : '',
      nextGoals ? `Proximos objetivos: ${nextGoals}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    pushSourceDocument(documents, {
      sourceType: 'treatment_session',
      sourceId,
      sourceDate,
      text: summary,
      metadata: { kind: 'treatment_session' },
    });
  });

  sources.medicalRecords.forEach((row, index) => {
    const sourceId = toStringValue(row.id) || `medical_${index + 1}`;
    const sourceDate = toStringValue(row.record_date);
    const type = toStringValue(row.type) || 'registro';
    const title = toStringValue(row.title);
    const content = toStringValue(row.content);
    pushSourceDocument(documents, {
      sourceType: 'medical_record',
      sourceId,
      sourceDate,
      text: `${title ? `[${title}] ` : ''}${type}: ${content || ''}`,
      metadata: { kind: 'medical_record', type, title },
    });
  });

  sources.goals.forEach((row, index) => {
    const sourceId = toStringValue(row.id) || `goal_${index + 1}`;
    const sourceDate = toStringValue(row.target_date);
    const description = toStringValue(row.description);
    const status = toStringValue(row.status) || 'sem_status';
    const priority = toStringValue(row.priority) || 'sem_prioridade';
    pushSourceDocument(documents, {
      sourceType: 'goal',
      sourceId,
      sourceDate,
      text: `Meta (${status}, prioridade ${priority})${sourceDate ? `, prazo ${sourceDate}` : ''}: ${description || ''}`,
      metadata: { kind: 'goal', status, priority },
    });
  });

  sources.painRecords.forEach((row, index) => {
    const sourceId = toStringValue(row.id) || `pain_${index + 1}`;
    const sourceDate = toStringValue(row.record_date);
    const painLevel = toNumberValue(row.pain_level);
    const notes = toStringValue(row.notes);
    pushSourceDocument(documents, {
      sourceType: 'pain_record',
      sourceId,
      sourceDate,
      text: `Registro de dor${painLevel !== null ? ` ${painLevel}/10` : ''}${notes ? `: ${notes}` : ''}`,
      metadata: { kind: 'pain_record' },
    });
  });

  return documents;
}

function buildChunkDocuments(
  patientId: string,
  organizationId: string | undefined,
  sourceDocuments: SourceDocument[],
  maxChunks: number
): ChunkDocument[] {
  const chunks: ChunkDocument[] = [];

  for (const sourceDocument of sourceDocuments) {
    const documentKey = `${sourceDocument.sourceType}:${sourceDocument.sourceId}`;
    const splitChunks = splitIntoChunks(sourceDocument.text);

    splitChunks.forEach((chunkText, chunkIndex) => {
      const normalizedChunk = chunkText.trim();
      if (normalizedChunk.length === 0) return;

      const chunkHash = createHash('sha256')
        .update(`${patientId}:${documentKey}:${chunkIndex}:${normalizedChunk}`)
        .digest('hex')
        .slice(0, 32);

      chunks.push({
        patientId,
        organizationId,
        sourceType: sourceDocument.sourceType,
        sourceId: sourceDocument.sourceId,
        sourceDate: sourceDocument.sourceDate,
        documentKey,
        chunkIndex,
        chunkText: normalizedChunk,
        chunkHash,
        metadata: sourceDocument.metadata,
      });
    });
  }

  return chunks.slice(0, Math.max(1, maxChunks));
}

async function writePatientChunks(
  pool: Pool,
  patientId: string,
  chunks: ChunkDocument[],
  embeddings: number[][]
): Promise<number> {
  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM patient_rag_chunks WHERE patient_id = $1', [patientId]);

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      if (!embedding || embedding.length === 0) continue;

      await client.query(
        `
        INSERT INTO patient_rag_chunks (
          patient_id, organization_id, source_type, source_id, source_date,
          document_key, chunk_index, chunk_text, chunk_hash, embedding, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11::jsonb, NOW(), NOW())
        `,
        [
          chunk.patientId,
          chunk.organizationId || null,
          chunk.sourceType,
          chunk.sourceId,
          chunk.sourceDate || null,
          chunk.documentKey,
          chunk.chunkIndex,
          chunk.chunkText,
          chunk.chunkHash,
          vectorLiteral(embedding),
          JSON.stringify(chunk.metadata || {}),
        ]
      );
      inserted += 1;
    }

    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function rebuildPatientRagIndexCore(input: RebuildPatientRagInput): Promise<RebuildPatientRagOutput> {
  const startTime = Date.now();
  const pool = getPool();

  const limit = sanitizeLimit(input.limit);
  const dryRun = sanitizeBoolean(input.dryRun);
  const maxChunksPerPatient = Math.max(
    20,
    Number(process.env.RAG_MAX_CHUNKS_PER_PATIENT || DEFAULT_MAX_CHUNKS_PER_PATIENT)
  );

  const patients = await fetchPatients(pool, {
    ...input,
    limit,
  });

  const patientResults: PatientProcessResult[] = [];
  let indexedChunks = 0;
  let skippedPatients = 0;

  for (const patient of patients) {
    const patientId = toStringValue(patient.id);
    if (!patientId) {
      skippedPatients += 1;
      continue;
    }

    const patientOrgId = toStringValue(patient.organization_id) || input.organizationId;

    try {
      const sources = await fetchPatientSources(pool, patientId, patientOrgId);
      const sourceDocuments = buildSourceDocuments(patient, sources);
      const chunks = buildChunkDocuments(patientId, patientOrgId, sourceDocuments, maxChunksPerPatient);

      if (chunks.length === 0) {
        skippedPatients += 1;
        patientResults.push({ patientId, chunkCount: 0, status: 'skipped' });
        continue;
      }

      if (dryRun) {
        indexedChunks += chunks.length;
        patientResults.push({ patientId, chunkCount: chunks.length, status: 'indexed' });
        continue;
      }

      const embeddings = await generateEmbeddingsForTexts(chunks.map((chunk) => chunk.chunkText));
      if (embeddings.length === 0) {
        skippedPatients += 1;
        patientResults.push({
          patientId,
          chunkCount: chunks.length,
          status: 'error',
          error: 'Embedding generation returned no vectors',
        });
        continue;
      }

      if (embeddings.length !== chunks.length) {
        const padded = [...embeddings];
        while (padded.length < chunks.length) padded.push([]);
        const inserted = await writePatientChunks(pool, patientId, chunks, padded);
        indexedChunks += inserted;
        patientResults.push({
          patientId,
          chunkCount: inserted,
          status: inserted > 0 ? 'indexed' : 'error',
          error: inserted > 0 ? undefined : 'No chunks inserted',
        });
      } else {
        const inserted = await writePatientChunks(pool, patientId, chunks, embeddings);
        indexedChunks += inserted;
        patientResults.push({ patientId, chunkCount: inserted, status: 'indexed' });
      }
    } catch (error) {
      skippedPatients += 1;
      patientResults.push({
        patientId,
        chunkCount: 0,
        status: 'error',
        error: (error as Error).message,
      });
    }
  }

  return {
    success: true,
    mode: dryRun ? 'dry-run' : 'write',
    processedPatients: patients.length,
    indexedChunks,
    skippedPatients,
    patients: patientResults,
    durationMs: Date.now() - startTime,
  };
}

export function isPatientRagIndexingEnabled(): boolean {
  return process.env.ENABLE_PGVECTOR_RAG === 'true';
}

export async function triggerPatientRagReindex(
  input: TriggerPatientRagReindexInput
): Promise<{ success: boolean; indexedChunks: number }> {
  if (!isPatientRagIndexingEnabled()) {
    return { success: false, indexedChunks: 0 };
  }

  const patientId = toStringValue(input.patientId);
  if (!patientId) {
    return { success: false, indexedChunks: 0 };
  }

  try {
    const output = await rebuildPatientRagIndexCore({
      patientId,
      organizationId: toStringValue(input.organizationId),
      limit: 1,
      dryRun: false,
    });

    const patientResult = output.patients[0];
    if (patientResult?.status === 'error') {
      logger.warn('Incremental patient RAG reindex returned error status', {
        patientId,
        reason: input.reason || 'unspecified',
        error: patientResult.error,
      });
      return { success: false, indexedChunks: 0 };
    }

    logger.info('Incremental patient RAG reindex completed', {
      patientId,
      reason: input.reason || 'unspecified',
      indexedChunks: patientResult?.chunkCount || 0,
      mode: output.mode,
      durationMs: output.durationMs,
    });

    return {
      success: true,
      indexedChunks: patientResult?.chunkCount || 0,
    };
  } catch (error) {
    logger.warn('Incremental patient RAG reindex failed', {
      patientId,
      reason: input.reason || 'unspecified',
      error: (error as Error).message,
    });
    return { success: false, indexedChunks: 0 };
  }
}

export async function clearPatientRagIndex(
  patientId: string,
  organizationId?: string
): Promise<{ success: boolean; deletedChunks: number }> {
  if (!isPatientRagIndexingEnabled()) {
    return { success: false, deletedChunks: 0 };
  }

  const normalizedPatientId = toStringValue(patientId);
  if (!normalizedPatientId) {
    return { success: false, deletedChunks: 0 };
  }

  try {
    const pool = getPool();
    const result = organizationId
      ? await pool.query(
        'DELETE FROM patient_rag_chunks WHERE patient_id = $1 AND organization_id = $2',
        [normalizedPatientId, organizationId]
      )
      : await pool.query(
        'DELETE FROM patient_rag_chunks WHERE patient_id = $1',
        [normalizedPatientId]
      );

    const deletedChunks = result.rowCount ?? 0;
    logger.info('Cleared patient RAG chunks', {
      patientId: normalizedPatientId,
      organizationId: organizationId || null,
      deletedChunks,
    });

    return { success: true, deletedChunks };
  } catch (error) {
    logger.warn('Failed to clear patient RAG chunks', {
      patientId: normalizedPatientId,
      organizationId: organizationId || null,
      error: (error as Error).message,
    });
    return { success: false, deletedChunks: 0 };
  }
}

export const rebuildPatientRagIndexHandler = async (request: any) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  await assertAdmin(request.auth.uid);
  const data = (request.data || {}) as RebuildPatientRagInput;

  return rebuildPatientRagIndexCore({
    patientId: toStringValue(data.patientId),
    organizationId: toStringValue(data.organizationId),
    limit: sanitizeLimit(data.limit),
    dryRun: sanitizeBoolean(data.dryRun),
  });
};

export const rebuildPatientRagIndexHttpHandler = async (req: any, res: any) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed - use POST' });
    return;
  }

  const apiKey = extractApiKey(req);
  if (apiKey !== MIGRATION_API_KEY) {
    res.status(403).json({ error: 'Forbidden - invalid migration key' });
    return;
  }

  try {
    const body = parseBody(req);
    const result = await rebuildPatientRagIndexCore({
      patientId: toStringValue(body.patientId),
      organizationId: toStringValue(body.organizationId),
      limit: sanitizeLimit(body.limit),
      dryRun: sanitizeBoolean(body.dryRun),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
