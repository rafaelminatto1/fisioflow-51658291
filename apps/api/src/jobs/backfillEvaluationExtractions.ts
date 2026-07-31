/**
 * Backfill da camada derivada sobre as avaliações importadas do ZenFisio.
 *
 * Why: mesmo desenho do backfill das evoluções — lotes com cursor por `id`,
 * cada lote idempotente, retomável se o processo morrer no meio. São 531
 * avaliações, muito menos que as 11.346 evoluções, mas cada uma tem um blob de
 * texto bem maior; o limite de CPU do Worker continua sendo o fator.
 *
 * `staleOnly` existe pelo mesmo motivo: quando `LEXICON_VERSION` sobe, só o que
 * ficou defasado precisa rodar de novo.
 */

import type { Env } from "../types/env";
import { getRawSql } from "../lib/db";
import {
  extractAndStoreEvaluation,
  EVALUATION_SOURCE_TABLE,
} from "../lib/clinical/extractionStore";
import { LEXICON_VERSION } from "../lib/clinical/lexicon";

export interface BackfillEvaluationParams {
  organizationId: string;
  /** Restringe a um formulário — a importação do ZenFisio criou dois. */
  formId?: string | null;
  batchSize?: number;
  /** Retomada: processa apenas avaliações com id > cursor. */
  cursor?: string | null;
  staleOnly?: boolean;
}

export interface BackfillEvaluationResult {
  processed: number;
  rowsWritten: number;
  /** Avaliações em que nenhuma seção foi identificada — sinaliza texto atípico. */
  withoutMatch: number;
  /** Chaves de formulário que o parser não reconheceu, agregadas para revisão. */
  unknownFields: string[];
  nextCursor: string | null;
  lexiconVersion: string;
}

/** Lote menor que o das evoluções: o texto por registro é várias vezes maior. */
const DEFAULT_BATCH = 50;

export async function backfillEvaluationExtractions(
  env: Env,
  params: BackfillEvaluationParams,
): Promise<BackfillEvaluationResult> {
  const batchSize = Math.min(Math.max(params.batchSize ?? DEFAULT_BATCH, 1), 200);
  const sql = getRawSql(env, "read");
  const cursor = params.cursor ?? null;
  const formId = params.formId ?? null;

  // Ordenação por id (não por data) mantém o cursor estável mesmo se novas
  // avaliações forem criadas durante o backfill.
  const batch = await sql<{ id: string; patient_id: string; responses: unknown }>`
    SELECT r.id, r.patient_id, r.responses
    FROM patient_evaluation_responses r
    WHERE r.organization_id = ${params.organizationId}::uuid
      AND (${formId}::uuid IS NULL OR r.form_id = ${formId}::uuid)
      AND r.responses ? 'fields'
      AND (${cursor}::uuid IS NULL OR r.id > ${cursor}::uuid)
      AND (
        ${!params.staleOnly}
        OR NOT EXISTS (
          SELECT 1 FROM clinical_extractions ce
          WHERE ce.source_table = ${EVALUATION_SOURCE_TABLE}
            AND ce.source_id = r.id
            AND ce.method = 'parser'
            AND ce.lexicon_version = ${LEXICON_VERSION}
        )
      )
    ORDER BY r.id
    LIMIT ${batchSize}
  `;

  const rows = batch.rows ?? [];
  let rowsWritten = 0;
  let withoutMatch = 0;
  const unknownFields = new Set<string>();

  for (const row of rows) {
    const result = await extractAndStoreEvaluation(env, {
      organizationId: params.organizationId,
      patientId: row.patient_id,
      sourceId: row.id,
      // `responses` chega como jsonb já desserializado pelo driver; quando vier
      // como string (caminho de alguns drivers), parseia — sem alterar a origem.
      responses: normalizeResponses(row.responses),
    });
    rowsWritten += result.rowsWritten;
    if (!result.hasAnyMatch) withoutMatch++;
    for (const key of result.unknownFields) unknownFields.add(key);
  }

  return {
    processed: rows.length,
    rowsWritten,
    withoutMatch,
    unknownFields: [...unknownFields].sort(),
    // Lote incompleto significa fim da fila.
    nextCursor: rows.length === batchSize ? rows[rows.length - 1].id : null,
    lexiconVersion: LEXICON_VERSION,
  };
}

function normalizeResponses(value: unknown): { fields?: Record<string, unknown> | null } | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as { fields?: Record<string, unknown> | null };
    } catch {
      return null;
    }
  }
  return value as { fields?: Record<string, unknown> | null };
}
