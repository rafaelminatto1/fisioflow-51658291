/**
 * Backfill dos embeddings clínicos.
 *
 * Why em lotes pequenos: cada item chama Workers AI e escreve no Neon. São
 * ~11,3 mil evoluções; uma varredura única estouraria o limite de CPU do Worker.
 * O cursor por `id` torna a operação retomável e estável mesmo se novas
 * evoluções forem criadas durante a execução.
 *
 * Idempotente por construção: `processClinicalEmbedding` faz UPSERT com
 * `ON CONFLICT (evolution_id)`.
 */

import type { Env } from "../types/env";
import { getRawSql } from "../lib/db";
import { processClinicalEmbedding } from "../lib/ai/embeddings";
import { CLINICAL_EMBEDDING_DIM, CLINICAL_EMBEDDING_MODEL } from "../lib/workersAi";

export interface EmbeddingBackfillParams {
  organizationId: string;
  /**
   * Lote pequeno de propósito: cada item é uma chamada de inferência, bem mais
   * cara que a extração determinística (que roda com 200 por lote).
   */
  batchSize?: number;
  cursor?: string | null;
  /** Reprocessa também o que já tem embedding. Padrão: só o que falta. */
  includeExisting?: boolean;
}

export interface EmbeddingBackfillResult {
  processed: number;
  succeeded: number;
  failed: number;
  /** Primeiros erros, para diagnóstico sem inundar a resposta. */
  errors: string[];
  nextCursor: string | null;
  model: string;
  dimensions: number;
}

const DEFAULT_BATCH = 25;
const MAX_BATCH = 100;
const MAX_REPORTED_ERRORS = 5;

export async function backfillClinicalEmbeddings(
  env: Env,
  params: EmbeddingBackfillParams,
): Promise<EmbeddingBackfillResult> {
  const batchSize = Math.min(Math.max(params.batchSize ?? DEFAULT_BATCH, 1), MAX_BATCH);
  const cursor = params.cursor ?? null;
  const sql = getRawSql(env, "read");

  const batch = await sql<{ id: string; patient_id: string; observacao: string }>`
    SELECT s.id, s.patient_id, s.observacao
    FROM sessions s
    WHERE s.organization_id = ${params.organizationId}::uuid
      AND s.deleted_at IS NULL
      AND length(coalesce(s.observacao, '')) >= 10
      AND (${cursor}::uuid IS NULL OR s.id > ${cursor}::uuid)
      AND (
        ${!!params.includeExisting}
        OR NOT EXISTS (
          SELECT 1 FROM clinical_embeddings ce WHERE ce.evolution_id = s.id
        )
      )
    ORDER BY s.id
    LIMIT ${batchSize}
  `;

  const rows = batch.rows ?? [];
  let succeeded = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      await processClinicalEmbedding(
        env,
        params.organizationId,
        row.patient_id,
        row.id,
        row.observacao,
      );
      succeeded++;
    } catch (error) {
      // Uma evolução que falha não pode derrubar o lote inteiro: com 11 mil
      // itens, abortar tudo por causa de um significa nunca terminar.
      if (errors.length < MAX_REPORTED_ERRORS) {
        errors.push(`${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return {
    processed: rows.length,
    succeeded,
    failed: rows.length - succeeded,
    errors,
    nextCursor: rows.length === batchSize ? rows[rows.length - 1].id : null,
    model: CLINICAL_EMBEDDING_MODEL,
    dimensions: CLINICAL_EMBEDDING_DIM,
  };
}
