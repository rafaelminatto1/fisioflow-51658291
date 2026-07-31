/**
 * Busca clínica híbrida: full-text em português + similaridade vetorial.
 *
 * Why híbrida: os dois métodos erram em lugares opostos.
 *
 * O léxico acerta o jargão que a clínica inventou — TFS, IQT, QDP, TTFFSS, PQD,
 * EENM — que é justamente o vocabulário mais discriminativo aqui e sobre o qual
 * nenhum modelo de embedding foi treinado. O vetor acerta paráfrase clínica
 * ("paciente melhorou da dor lombar" encontra "relata alívio em região lombar"),
 * onde o léxico não casa nada.
 *
 * A fusão é por Reciprocal Rank Fusion: soma 1/(k + posição) de cada lista. RRF
 * usa POSIÇÃO, não score, o que evita ter de normalizar similaridade de cosseno
 * contra `ts_rank` — duas escalas sem relação entre si.
 */

import type { Env } from "../../types/env";
import { getRawSql } from "../db";
import { CLINICAL_EMBEDDING_MODEL } from "../workersAi";

/**
 * Constante de amortecimento do RRF. 60 é o valor do artigo original (Cormack
 * et al.) e o padrão de fato: reduz o peso das primeiras posições o bastante
 * para que um resultado bem colocado em ambas as listas supere um primeiro
 * lugar isolado.
 */
const RRF_K = 60;

export interface HybridSearchParams {
  organizationId: string;
  query: string;
  /** Restringe a um paciente. Obrigatório para qualquer uso clínico individual. */
  patientId?: string | null;
  limit?: number;
}

export interface HybridSearchHit {
  evolutionId: string;
  patientId: string;
  patientName: string;
  sessionDate: string;
  excerpt: string;
  /** Posição em cada lista (nulo = não apareceu naquela busca). */
  lexicalRank: number | null;
  vectorRank: number | null;
  rrfScore: number;
}

export async function hybridClinicalSearch(
  env: Env,
  params: HybridSearchParams,
): Promise<HybridSearchHit[]> {
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);
  const query = params.query?.trim();
  if (!query || query.length < 3) return [];

  // Pool maior que o limite final: um item pode estar em 30º no léxico e em 2º
  // no vetor, e é exatamente esse caso que a fusão existe para resgatar.
  const poolSize = Math.min(limit * 5, 100);

  const aiResponse = await env.AI.run(CLINICAL_EMBEDDING_MODEL, { text: [query] });
  const queryVector = aiResponse?.data?.[0];
  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    throw new Error("Workers AI não devolveu vetor para a consulta");
  }

  const sql = getRawSql(env, "read");

  const result = await sql`
    WITH escopo AS (
      SELECT s.id, s.patient_id, s.date, s.observacao, s.observacao_tsv
      FROM sessions s
      WHERE s.organization_id = ${params.organizationId}::uuid
        AND s.deleted_at IS NULL
        -- Filtro por paciente aplicado ANTES de qualquer ranqueamento: é a
        -- defesa contra vazamento entre prontuários, e ela precisa estar no
        -- caminho da query, não no pós-processamento.
        AND (${params.patientId ?? null}::uuid IS NULL OR s.patient_id = ${params.patientId ?? null}::uuid)
    ),
    lexical AS (
      SELECT e.id,
             row_number() OVER (
               ORDER BY ts_rank(e.observacao_tsv, plainto_tsquery('portuguese', ${query})) DESC
             ) AS rank
      FROM escopo e
      WHERE e.observacao_tsv @@ plainto_tsquery('portuguese', ${query})
      LIMIT ${poolSize}
    ),
    vetorial AS (
      SELECT ce.evolution_id AS id,
             row_number() OVER (
               ORDER BY ce.embedding <=> ${JSON.stringify(queryVector)}::vector
             ) AS rank
      FROM clinical_embeddings ce
      JOIN escopo e ON e.id = ce.evolution_id
      WHERE ce.organization_id = ${params.organizationId}::uuid
      LIMIT ${poolSize}
    ),
    fundido AS (
      SELECT
        COALESCE(l.id, v.id) AS id,
        l.rank AS lexical_rank,
        v.rank AS vector_rank,
        COALESCE(1.0 / (${RRF_K} + l.rank), 0) + COALESCE(1.0 / (${RRF_K} + v.rank), 0) AS rrf
      FROM lexical l
      FULL OUTER JOIN vetorial v ON v.id = l.id
    )
    SELECT
      f.id            AS "evolutionId",
      e.patient_id    AS "patientId",
      p.full_name     AS "patientName",
      e.date          AS "sessionDate",
      left(regexp_replace(coalesce(e.observacao, ''), '\\s+', ' ', 'g'), 300) AS "excerpt",
      f.lexical_rank  AS "lexicalRank",
      f.vector_rank   AS "vectorRank",
      f.rrf           AS "rrfScore"
    FROM fundido f
    JOIN escopo e ON e.id = f.id
    JOIN patients p ON p.id = e.patient_id
    ORDER BY f.rrf DESC, e.date DESC
    LIMIT ${limit}
  `;

  return (result.rows ?? []).map((r: any) => ({
    evolutionId: r.evolutionId,
    patientId: r.patientId,
    patientName: r.patientName,
    sessionDate: r.sessionDate,
    excerpt: r.excerpt ?? "",
    lexicalRank: r.lexicalRank != null ? Number(r.lexicalRank) : null,
    vectorRank: r.vectorRank != null ? Number(r.vectorRank) : null,
    rrfScore: Number(r.rrfScore),
  }));
}
