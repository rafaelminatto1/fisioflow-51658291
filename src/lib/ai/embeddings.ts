/**
 * Embeddings Service compatível com a API legada.
 *
 * Agora delega para o provedor Gemini direto já usado em `lib/vector/embeddings`.
 */

import { logger } from "@/lib/errors/logger";
import { withPerformanceTrace } from "@/lib/monitoring/performance";
import { stripHtml } from "@/lib/utils/stripHtml";
import {
  generateEmbedding as generateEmbeddingWithGemini,
  cosineSimilarity as cosineSimilarityDirect,
} from "@/lib/vector/embeddings";

/**
 * Gera embedding para um texto
 *
 * @param text Texto para gerar embedding
 * @returns Vetor de embeddings (768 dimensões)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Texto vazio não pode gerar embedding");
  }

  return withPerformanceTrace("generate_embedding", async () => {
    try {
      const embedding = await generateEmbeddingWithGemini(text);

      logger.debug(
        `[Embeddings] Gerado embedding para texto (${text.length} chars, ${embedding.length} dimensões)`,
      );
      return embedding;
    } catch (error) {
      logger.error("[Embeddings] Erro ao gerar embedding:", error);
      throw error;
    }
  });
}

/**
 * Gera embeddings em batch
 *
 * @param texts Lista de textos
 * @returns Matriz de embeddings
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  return withPerformanceTrace("generate_batch_embeddings", async () => {
    const results = await Promise.all(texts.map((text) => generateEmbedding(text)));

    logger.info(`[Embeddings] Gerados ${results.length} embeddings em batch`);
    return results;
  });
}

/**
 * Calcula similaridade de cosseno entre dois vetores
 *
 * @param a Primeiro vetor
 * @param b Segundo vetor
 * @returns Similaridade (0 a 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  return cosineSimilarityDirect(a, b);
}

/**
 * Encontra os vetores mais similares
 *
 * @param query Vetor de consulta
 * @param candidates Vetores candidatos
 * @param topK Número de resultados
 * @returns Lista de índices e similaridades
 */
export function findMostSimilar(
  query: number[],
  candidates: number[][],
  topK: number = 10,
): Array<{ index: number; similarity: number }> {
  const similarities = candidates
    .map((candidate, index) => ({
      index,
      similarity: cosineSimilarity(query, candidate),
    }))
    .filter((item) => !isNaN(item.similarity))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return similarities;
}

/**
 * Gera embedding para evolução clínica (texto livre + dados estruturados).
 *
 * Indexa a observação inteira (texto principal) somada a um resumo
 * estruturado de dor / procedimentos / exercícios, permitindo busca
 * semântica que reflita tanto a narrativa quanto os dados objetivos.
 */
export async function generateEvolutionEmbedding(evolution: {
  observacao?: string;
  pain_scale?: number | null;
  procedures?: Array<{ name?: string; notes?: string }>;
  exercises?: Array<{ name?: string; prescription?: string }>;
  measurements?: Array<{ name?: string; value?: number; unit?: string }>;
}): Promise<number[]> {
  const sections: string[] = [];
  if (evolution.observacao) sections.push(stripHtml(evolution.observacao));
  if (evolution.pain_scale != null) sections.push(`EVA: ${evolution.pain_scale}/10`);
  if (evolution.procedures?.length) {
    sections.push(
      `Procedimentos: ${evolution.procedures
        .map((p) => p.name)
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  if (evolution.exercises?.length) {
    sections.push(
      `Exercícios: ${evolution.exercises
        .map((e) => [e.name, e.prescription].filter(Boolean).join(" "))
        .join(", ")}`,
    );
  }
  if (evolution.measurements?.length) {
    sections.push(
      `Medições: ${evolution.measurements
        .map((m) => [m.name, m.value, m.unit].filter(Boolean).join(" "))
        .join(", ")}`,
    );
  }

  return generateEmbedding(sections.filter(Boolean).join("\n"));
}

/** @deprecated SOAP foi removido. Use {@link generateEvolutionEmbedding}. */
export const generateSOAPEmbedding = generateEvolutionEmbedding;

/**
 * Gera embedding para paciente (contexto clínico)
 */
export async function generatePatientEmbedding(patient: {
  name: string;
  diagnosis?: string[];
  complaints?: string[];
  history?: string;
}): Promise<number[]> {
  const text = [
    `Paciente: ${patient.name}`,
    patient.diagnosis?.length ? `Diagnósticos: ${patient.diagnosis.join(", ")}` : "",
    patient.complaints?.length ? `Queixas: ${patient.complaints.join(", ")}` : "",
    patient.history || "",
  ]
    .filter(Boolean)
    .join("\n");

  return generateEmbedding(text);
}

/**
 * Gera embedding para exercício
 */
export async function generateExerciseEmbedding(exercise: {
  name: string;
  description?: string;
  muscles?: string[];
  category?: string;
}): Promise<number[]> {
  const text = [
    `Exercício: ${exercise.name}`,
    exercise.description || "",
    exercise.muscles?.length ? `Músculos: ${exercise.muscles.join(", ")}` : "",
    exercise.category || "",
  ]
    .filter(Boolean)
    .join("\n");

  return generateEmbedding(text);
}

/**
 * Normaliza embedding para storage
 * (converte array para string)
 */
export function serializeEmbedding(embedding: number[]): string {
  return JSON.stringify(embedding);
}

/**
 * Deserializa embedding do storage
 */
export function deserializeEmbedding(data: string | number[]): number[] {
  if (Array.isArray(data)) {
    return data;
  }
  return JSON.parse(data);
}

/**
 * Valida se um embedding é válido
 */
export function isValidEmbedding(embedding: any): embedding is number[] {
  return (
    Array.isArray(embedding) &&
    embedding.length === 768 &&
    embedding.every((n) => typeof n === "number" && !isNaN(n))
  );
}

/**
 * Índices de embeddings para diferentes tipos de dados
 */
export const EMBEDDING_DIMENSIONS = 768; // text-embedding-004

/**
 * Configurações para indexação
 */
export const embeddingConfig = {
  dimensions: EMBEDDING_DIMENSIONS,
  distanceMeasure: "COSINE" as const,
  // Para Vector Search (Neon DB/pgvector)
  // distance: 'EUCLIDEAN' | 'DOT_PRODUCT' | 'COSINE'
};

/**
 * Textos de exemplo para testar embeddings
 */
export const embeddingExamples = {
  soap: {
    acuteLumbarPain:
      "Paciente relata dor lombar aguda após levantar peso. Dor intensa (8/10), limitação de movimentos de flexão e extensão. Sinal de Lasegue positivo à direita.",
    chronicShoulderPain:
      "Paciente com dor crônica no ombro direito há 6 meses. Dor ao elevar braço acima de 90 graus. Teste de Neer positivo.",
    postSurgeryKnee:
      "30 dias após cirurgia de LCA. Paciente apresenta edema leve, ROM de 0-90 graus. Força muscular grau 4+.",
  },
  exercise: {
    bridge:
      "Exercício de ponte para fortalecimento de glúteos e core. Paciente deita dorsal, flexiona joelhos e eleva quadril.",
    shoulderFlexion:
      "Elevação frontal de ombro com halter. Fortalece deltóide anterior. Paciente deve evitar compensação com tronco.",
    wallSlide:
      "Deslizamento de parede para quadríceps. Paciente encostado na parede flexiona joelhos até 90 graus.",
  },
};
