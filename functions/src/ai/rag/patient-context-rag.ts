import type { QueryResult } from 'pg';
import { getPool } from '../../init';
import { getLogger } from '../../lib/logger';
import { generateEmbeddingForText } from './vertex-embeddings';

const logger = getLogger('ai-patient-rag');

const DEFAULT_MAX_SNIPPETS = 8;
const DEFAULT_MAX_LEXICAL_CANDIDATES = 48;
const MAX_SNIPPET_TEXT_LENGTH = 320;
const MAX_VECTOR_SNIPPETS = 4;
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'para', 'por', 'com', 'sem', 'na', 'no', 'nas', 'nos', 'em', 'que', 'se', 'ao', 'aos',
  'the', 'and', 'for', 'with', 'without', 'from', 'this', 'that', 'you', 'your', 'about',
]);

export type RagSourceType =
  | 'treatment_session'
  | 'medical_record'
  | 'goal'
  | 'pain_record'
  | 'vector_chunk';

export interface RagSnippet {
  sourceType: RagSourceType;
  date?: string;
  text: string;
  score: number;
}

export interface RetrievePatientContextInput {
  patientId: string;
  userId: string;
  question: string;
  organizationId?: string;
  maxSnippets?: number;
}

export interface RetrievePatientContextOutput {
  organizationId?: string;
  patientName?: string;
  patientCondition?: string;
  sessionCount?: number;
  retrievalMode: 'none' | 'lexical' | 'hybrid';
  snippets: RagSnippet[];
}

interface CandidateChunk {
  sourceType: RagSourceType;
  date?: string;
  text: string;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function truncateText(value: string, maxLength = MAX_SNIPPET_TEXT_LENGTH): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function scoreChunk(questionTokens: Set<string>, chunk: CandidateChunk): number {
  const chunkTokens = tokenize(chunk.text);
  if (chunkTokens.length === 0) return 0;

  const chunkTokenSet = new Set(chunkTokens);
  let overlapCount = 0;
  questionTokens.forEach((token) => {
    if (chunkTokenSet.has(token)) overlapCount += 1;
  });

  const overlapScore = questionTokens.size > 0 ? overlapCount / questionTokens.size : 0;
  const densityScore = overlapCount / chunkTokens.length;

  const sourceBoost =
    chunk.sourceType === 'treatment_session' ? 0.12 :
      chunk.sourceType === 'medical_record' ? 0.09 :
        chunk.sourceType === 'pain_record' ? 0.06 :
          chunk.sourceType === 'goal' ? 0.04 :
            0.02;

  let recencyBoost = 0;
  if (chunk.date) {
    const ageDays = Math.max(
      0,
      (Date.now() - new Date(chunk.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    recencyBoost = Math.max(0, 0.08 - ageDays * 0.0015);
  }

  return overlapScore * 0.72 + densityScore * 0.16 + sourceBoost + recencyBoost;
}

function splitIntoChunks(text: string, chunkSize = 460, overlap = 80): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

function mapTreatmentSessions(rows: Record<string, unknown>[]): CandidateChunk[] {
  return rows
    .flatMap((row) => {
      const date = toStringValue(row.session_date) || toStringValue(row.created_at);
      const body = [
        toStringValue(row.evolution),
        toStringValue(row.observations),
        toStringValue(row.next_session_goals),
      ]
        .filter((value): value is string => !!value)
        .join('\n');

      if (!body) return [];

      const painBefore = typeof row.pain_level_before === 'number'
        ? `Dor antes: ${row.pain_level_before}/10. `
        : '';
      const painAfter = typeof row.pain_level_after === 'number'
        ? `Dor apos: ${row.pain_level_after}/10. `
        : '';

      const fullText = `${painBefore}${painAfter}${body}`;

      return splitIntoChunks(fullText).map((chunk) => ({
        sourceType: 'treatment_session' as const,
        date,
        text: truncateText(chunk),
      }));
    });
}

function mapMedicalRecords(rows: Record<string, unknown>[]): CandidateChunk[] {
  return rows.flatMap((row) => {
    const date = toStringValue(row.record_date) || toStringValue(row.created_at);
    const title = toStringValue(row.title);
    const type = toStringValue(row.type);
    const content = toStringValue(row.content);
    if (!content) return [];

    const headerParts = [type ? `[${type}]` : '', title || ''];
    const header = headerParts.filter(Boolean).join(' ').trim();
    const fullText = header ? `${header}\n${content}` : content;

    return splitIntoChunks(fullText).map((chunk) => ({
      sourceType: 'medical_record' as const,
      date,
      text: truncateText(chunk),
    }));
  });
}

function mapGoals(rows: Record<string, unknown>[]): CandidateChunk[] {
  const chunks: CandidateChunk[] = [];

  rows.forEach((row) => {
    const description = toStringValue(row.description);
    if (!description) return;

    const status = toStringValue(row.status) || 'sem_status';
    const priority = toStringValue(row.priority) || 'sem_prioridade';
    const targetDate = toStringValue(row.target_date);
    const text = `Meta (${status}, prioridade ${priority})${targetDate ? `, prazo ${targetDate}` : ''}: ${description}`;

    chunks.push({
      sourceType: 'goal',
      date: targetDate || undefined,
      text: truncateText(text),
    });
  });

  return chunks;
}

function mapPainRecords(rows: Record<string, unknown>[]): CandidateChunk[] {
  const chunks: CandidateChunk[] = [];

  rows.forEach((row) => {
    const date = toStringValue(row.record_date) || toStringValue(row.created_at);
    const level = typeof row.pain_level === 'number' ? row.pain_level : null;
    const notes = toStringValue(row.notes);
    if (level === null && !notes) return;

    const text = `Registro de dor${level !== null ? ` ${level}/10` : ''}${notes ? `: ${notes}` : ''}`;
    chunks.push({
      sourceType: 'pain_record',
      date,
      text: truncateText(text),
    });
  });

  return chunks;
}

async function resolveOrganizationId(userId: string, providedOrganizationId?: string): Promise<string | undefined> {
  if (providedOrganizationId) return providedOrganizationId;

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT organization_id FROM profiles WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    return toStringValue(result.rows[0]?.organization_id);
  } catch (error) {
    logger.warn('Failed to resolve organization_id for RAG', {
      userId,
      error: (error as Error).message,
    });
    return undefined;
  }
}

async function getVertexQueryEmbedding(text: string): Promise<number[] | null> {
  const enabled = process.env.ENABLE_PGVECTOR_RAG === 'true';
  if (!enabled) return null;
  return generateEmbeddingForText(text);
}

async function queryVectorChunks(
  patientId: string,
  organizationId: string | undefined,
  queryEmbedding: number[] | null
): Promise<RagSnippet[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) return [];

  const vectorLiteral = `[${queryEmbedding.map((value) => Number(value).toFixed(6)).join(',')}]`;
  const pool = getPool();

  try {
    const whereOrgClause = organizationId ? 'AND organization_id = $2' : '';
    const params = organizationId
      ? [patientId, organizationId, vectorLiteral, MAX_VECTOR_SNIPPETS]
      : [patientId, vectorLiteral, MAX_VECTOR_SNIPPETS];

    const sql = organizationId
      ? `
          SELECT chunk_text, source_type, source_date,
            1 - (embedding <=> $3::vector) AS similarity
          FROM patient_rag_chunks
          WHERE patient_id = $1
            ${whereOrgClause}
          ORDER BY embedding <=> $3::vector
          LIMIT $4
        `
      : `
          SELECT chunk_text, source_type, source_date,
            1 - (embedding <=> $2::vector) AS similarity
          FROM patient_rag_chunks
          WHERE patient_id = $1
          ORDER BY embedding <=> $2::vector
          LIMIT $3
        `;

    const result = await pool.query(sql, params);
    return result.rows
      .map((row: Record<string, unknown>) => ({
        sourceType: 'vector_chunk' as const,
        date: toStringValue(row.source_date),
        text: truncateText(toStringValue(row.chunk_text) || ''),
        score: typeof row.similarity === 'number' ? row.similarity : 0,
      }))
      .filter((snippet) => snippet.text.length > 0);
  } catch (error) {
    logger.warn('Vector retrieval unavailable; continuing with lexical RAG', {
      error: (error as Error).message,
    });
    return [];
  }
}

export async function retrievePatientKnowledgeContext(
  input: RetrievePatientContextInput
): Promise<RetrievePatientContextOutput> {
  const maxSnippets = Math.max(1, input.maxSnippets ?? DEFAULT_MAX_SNIPPETS);
  const organizationId = await resolveOrganizationId(input.userId, input.organizationId);

  const output: RetrievePatientContextOutput = {
    organizationId,
    retrievalMode: 'none',
    snippets: [],
  };

  try {
    const pool = getPool();
    const emptyResult: QueryResult<Record<string, unknown>> = {
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
      rows: [],
    };

    const safeQuery = async (
      label: string,
      sql: string,
      params: unknown[]
    ): Promise<QueryResult<Record<string, unknown>>> => {
      try {
        return await pool.query(sql, params);
      } catch (error) {
        logger.warn(`RAG source query failed (${label})`, {
          patientId: input.patientId,
          error: (error as Error).message,
        });
        return emptyResult;
      }
    };

    const patientQuery = organizationId
      ? safeQuery(
        'patient',
        'SELECT id, name, main_condition, organization_id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1',
        [input.patientId, organizationId]
      )
      : safeQuery(
        'patient',
        'SELECT id, name, main_condition, organization_id FROM patients WHERE id = $1 LIMIT 1',
        [input.patientId]
      );

    const sessionsQuery = organizationId
      ? safeQuery(
        'treatment_sessions',
        `SELECT session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after, created_at
         FROM treatment_sessions
         WHERE patient_id = $1 AND organization_id = $2
         ORDER BY session_date DESC, created_at DESC
         LIMIT $3`,
        [input.patientId, organizationId, DEFAULT_MAX_LEXICAL_CANDIDATES]
      )
      : safeQuery(
        'treatment_sessions',
        `SELECT session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after, created_at
         FROM treatment_sessions
         WHERE patient_id = $1
         ORDER BY session_date DESC, created_at DESC
         LIMIT $2`,
        [input.patientId, DEFAULT_MAX_LEXICAL_CANDIDATES]
      );

    const medicalRecordsQuery = organizationId
      ? safeQuery(
        'medical_records',
        `SELECT record_date, type, title, content, created_at
         FROM medical_records
         WHERE patient_id = $1 AND organization_id = $2
         ORDER BY record_date DESC, created_at DESC
         LIMIT $3`,
        [input.patientId, organizationId, DEFAULT_MAX_LEXICAL_CANDIDATES]
      )
      : safeQuery(
        'medical_records',
        `SELECT record_date, type, title, content, created_at
         FROM medical_records
         WHERE patient_id = $1
         ORDER BY record_date DESC, created_at DESC
         LIMIT $2`,
        [input.patientId, DEFAULT_MAX_LEXICAL_CANDIDATES]
      );

    const goalsQuery = organizationId
      ? safeQuery(
        'patient_goals',
        `SELECT description, status, priority, target_date
         FROM patient_goals
         WHERE patient_id = $1 AND organization_id = $2
         ORDER BY target_date DESC NULLS LAST
         LIMIT $3`,
        [input.patientId, organizationId, 20]
      )
      : safeQuery(
        'patient_goals',
        `SELECT description, status, priority, target_date
         FROM patient_goals
         WHERE patient_id = $1
         ORDER BY target_date DESC NULLS LAST
         LIMIT $2`,
        [input.patientId, 20]
      );

    const painQuery = organizationId
      ? safeQuery(
        'patient_pain_records',
        `SELECT created_at, pain_level, notes, record_date
         FROM patient_pain_records
         WHERE patient_id = $1 AND organization_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [input.patientId, organizationId, 30]
      )
      : safeQuery(
        'patient_pain_records',
        `SELECT created_at, pain_level, notes, record_date
         FROM patient_pain_records
         WHERE patient_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [input.patientId, 30]
      );

    const [patientRes, sessionsRes, medicalRes, goalsRes, painRes] = await Promise.all([
      patientQuery,
      sessionsQuery,
      medicalRecordsQuery,
      goalsQuery,
      painQuery,
    ]);

    const patient = patientRes.rows[0] as Record<string, unknown> | undefined;
    if (patient) {
      output.patientName = toStringValue(patient.name);
      output.patientCondition = toStringValue(patient.main_condition);
    }
    output.sessionCount = sessionsRes.rowCount ?? undefined;

    const mergedPainRows = [
      ...(painRes.rows as Record<string, unknown>[]).map((row) => ({
        ...row,
        record_date: toStringValue(row.created_at) || toStringValue(row.record_date),
      })),
    ];

    const lexicalCandidates: CandidateChunk[] = [
      ...mapTreatmentSessions(sessionsRes.rows as Record<string, unknown>[]),
      ...mapMedicalRecords(medicalRes.rows as Record<string, unknown>[]),
      ...mapGoals(goalsRes.rows as Record<string, unknown>[]),
      ...mapPainRecords(mergedPainRows),
    ];

    const questionTokens = new Set(tokenize(input.question));
    const scoredLexical = lexicalCandidates
      .map((chunk) => ({
        ...chunk,
        score: scoreChunk(questionTokens, chunk),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSnippets)
      .map((chunk) => ({
        sourceType: chunk.sourceType,
        date: chunk.date,
        text: chunk.text,
        score: chunk.score,
      }));

    const queryEmbedding = await getVertexQueryEmbedding(input.question);
    const vectorSnippets = await queryVectorChunks(input.patientId, organizationId, queryEmbedding);

    const combined = [...vectorSnippets, ...scoredLexical]
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSnippets);

    output.snippets = combined;
    output.retrievalMode = vectorSnippets.length > 0
      ? 'hybrid'
      : (scoredLexical.length > 0 ? 'lexical' : 'none');

    return output;
  } catch (error) {
    logger.warn('Patient RAG retrieval failed; returning empty context', {
      patientId: input.patientId,
      userId: input.userId,
      error: (error as Error).message,
    });
    return output;
  }
}
