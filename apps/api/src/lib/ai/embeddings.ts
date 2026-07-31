import type { Env } from "../../types/env";
import { getRawSql } from "../db";
import { CLINICAL_EMBEDDING_DIM, CLINICAL_EMBEDDING_MODEL } from "../workersAi";

/** Menor texto que vale indexar. Abaixo disso o vetor não carrega sinal clínico. */
const MIN_TEXT_LENGTH = 10;

export class ClinicalEmbeddingError extends Error {
  constructor(
    message: string,
    readonly stage: "generate" | "dimension" | "persist",
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ClinicalEmbeddingError";
  }
}

/**
 * Emite a falha para o Analytics Engine.
 *
 * Why: este pipeline roda em `ctx.waitUntil`, então uma exceção morre sem deixar
 * rastro na resposta. Entre 2026 e jul/2026 um `catch { console.error }` escondeu
 * ~11 mil falhas de dimensão e a tabela ficou vazia sem ninguém perceber.
 * Registrar aqui é o que torna a próxima falha visível em vez de silenciosa.
 */
function recordFailure(env: Env, stage: string, evolutionId: string, detail: string) {
  try {
    env.ANALYTICS?.writeDataPoint({
      blobs: ["clinical_embedding_failed", stage, evolutionId, detail.slice(0, 200)],
      indexes: ["clinical_embedding_failed"],
      doubles: [1],
    });
  } catch {
    // Telemetria nunca pode derrubar o pipeline.
  }
}

/**
 * Gera e salva o embedding de uma evolução clínica.
 * Executado em background via ctx.waitUntil.
 *
 * Lança `ClinicalEmbeddingError` em qualquer falha — o chamador decide se engole.
 * Toda falha também vai para o Analytics Engine antes de subir.
 */
export async function processClinicalEmbedding(
  env: Env,
  organizationId: string,
  patientId: string,
  evolutionId: string,
  text: string,
) {
  if (!text || text.length < MIN_TEXT_LENGTH) return;

  let embedding: number[];
  try {
    const response = await env.AI.run(CLINICAL_EMBEDDING_MODEL, { text: [text] });
    embedding = response.data?.[0];
  } catch (error) {
    recordFailure(env, "generate", evolutionId, String(error));
    throw new ClinicalEmbeddingError(
      `Workers AI falhou ao gerar embedding para a evolução ${evolutionId}`,
      "generate",
      error,
    );
  }

  if (!Array.isArray(embedding) || embedding.length === 0) {
    recordFailure(env, "generate", evolutionId, "resposta sem vetor");
    throw new ClinicalEmbeddingError(
      `Workers AI devolveu resposta sem vetor para a evolução ${evolutionId}`,
      "generate",
    );
  }

  // Guarda de dimensão: falha aqui, com mensagem legível, em vez de virar um
  // erro opaco do Postgres no INSERT.
  if (embedding.length !== CLINICAL_EMBEDDING_DIM) {
    const detail = `esperado ${CLINICAL_EMBEDDING_DIM}, recebido ${embedding.length}`;
    recordFailure(env, "dimension", evolutionId, detail);
    throw new ClinicalEmbeddingError(
      `Dimensão incompatível com clinical_embeddings.embedding (${detail}). ` +
        `Modelo ${CLINICAL_EMBEDDING_MODEL} mudou de dimensão ou a coluna está desalinhada.`,
      "dimension",
    );
  }

  try {
    const sql = getRawSql(env, "write");
    await sql`
      INSERT INTO clinical_embeddings (
        organization_id, patient_id, evolution_id, embedding, content_summary, created_at
      )
      VALUES (
        ${organizationId}::uuid,
        ${patientId}::uuid,
        ${evolutionId}::uuid,
        ${JSON.stringify(embedding)}::vector,
        ${text.substring(0, 500)},
        NOW()
      )
      ON CONFLICT (evolution_id) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        content_summary = EXCLUDED.content_summary,
        created_at = NOW();
    `;
  } catch (error) {
    recordFailure(env, "persist", evolutionId, String(error));
    throw new ClinicalEmbeddingError(
      `Falha ao gravar embedding da evolução ${evolutionId}`,
      "persist",
      error,
    );
  }
}
