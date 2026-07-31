/**
 * Backfill da camada derivada sobre as evoluções já existentes.
 *
 * Why: são 11.346 evoluções. Isso não cabe numa requisição, e não deve prender
 * um Worker. Roda em lotes com cursor, e cada lote é idempotente — se o processo
 * morrer no meio, basta reinvocar com o mesmo cursor.
 *
 * Reprocessamento: quando `LEXICON_VERSION` sobe, as extrações antigas ficam
 * defasadas. `staleOnly` reprocessa só o que foi gerado por versão anterior,
 * evitando varrer o corpus inteiro à toa.
 */

import type { Env } from "../types/env";
import { getRawSql } from "../lib/db";
import { extractAndStore } from "../lib/clinical/extractionStore";
import { LEXICON_VERSION } from "../lib/clinical/lexicon";

export interface BackfillParams {
  organizationId: string;
  /** Tamanho do lote. Acima de ~200 o Worker começa a se aproximar do limite de CPU. */
  batchSize?: number;
  /** Retomada: processa apenas evoluções com id > cursor (ordenação estável). */
  cursor?: string | null;
  /** Só reprocessa origens cuja extração veio de um léxico anterior. */
  staleOnly?: boolean;
}

export interface BackfillResult {
  processed: number;
  rowsWritten: number;
  withoutMatch: number;
  /** Passe de volta na próxima chamada. `null` = terminou. */
  nextCursor: string | null;
  lexiconVersion: string;
}

const DEFAULT_BATCH = 100;

export async function backfillClinicalExtractions(
  env: Env,
  params: BackfillParams,
): Promise<BackfillResult> {
  const batchSize = Math.min(Math.max(params.batchSize ?? DEFAULT_BATCH, 1), 500);
  const sql = getRawSql(env, "read");
  const cursor = params.cursor ?? null;

  // Ordenar por id (não por data) mantém o cursor estável mesmo se novas
  // evoluções forem criadas durante o backfill.
  const batch = await sql<{ id: string; patient_id: string; observacao: string | null }>`
    SELECT s.id, s.patient_id, s.observacao
    FROM sessions s
    WHERE s.organization_id = ${params.organizationId}::uuid
      AND s.deleted_at IS NULL
      AND s.observacao IS NOT NULL
      AND length(s.observacao) > 0
      AND (${cursor}::uuid IS NULL OR s.id > ${cursor}::uuid)
      AND (
        ${!params.staleOnly}
        OR NOT EXISTS (
          SELECT 1 FROM clinical_extractions ce
          WHERE ce.source_table = 'sessions'
            AND ce.source_id = s.id
            AND ce.method = 'parser'
            AND ce.lexicon_version = ${LEXICON_VERSION}
        )
      )
    ORDER BY s.id
    LIMIT ${batchSize}
  `;

  const rows = batch.rows ?? [];
  let rowsWritten = 0;
  let withoutMatch = 0;

  for (const row of rows) {
    const result = await extractAndStore(env, {
      organizationId: params.organizationId,
      patientId: row.patient_id,
      sourceTable: "sessions",
      sourceId: row.id,
      text: row.observacao,
    });
    rowsWritten += result.rowsWritten;
    if (!result.hasAnyMatch) withoutMatch++;
  }

  return {
    processed: rows.length,
    rowsWritten,
    withoutMatch,
    // Lote incompleto significa fim da fila.
    nextCursor: rows.length === batchSize ? rows[rows.length - 1].id : null,
    lexiconVersion: LEXICON_VERSION,
  };
}
