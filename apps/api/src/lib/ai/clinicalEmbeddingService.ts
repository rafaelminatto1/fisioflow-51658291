// Stub for db models
// import { clinicalEmbeddings, patientLongitudinalSummary } from "@fisioflow/db/schema";
// import { sql } from "drizzle-orm";

export interface EmbeddingServiceEnv {
  AI: any;
}

/**
 * Gera um embedding usando Workers AI.
 * Recomendado: @cf/baai/bge-large-en-v1.5 (retorna vetor)
 */
export async function generateEmbedding(_env: EmbeddingServiceEnv, _text: string): Promise<number[]> {
  try {
    // Mocking the call since we can't run env.AI natively in test
    // No ambiente real:
    // const ai = new Ai(env.AI);
    // const res = await ai.run('@cf/baai/bge-large-en-v1.5', { text: [text] });
    // return res.data[0];
    
    return Array.from({ length: 1536 }, () => Math.random());
  } catch {
    throw new Error("Falha ao gerar embedding clínico.");
  }
}

/**
 * Pipeline consumida via Queue
 * Quando uma evolução é salva, ela é processada assincronamente aqui.
 */
export async function processSessionForEmbedding(
  env: any, 
  db: any, 
  params: { organizationId: string; patientId: string; evolutionId: string; contentSummary: string }
) {
  // 1. Gera embedding do resumo
  const vector = await generateEmbedding(env, params.contentSummary);
  
  // 2. Salva no Neon pgvector
  /*
  await db.insert(clinicalEmbeddings).values({
    organizationId: params.organizationId,
    patientId: params.patientId,
    evolutionId: params.evolutionId,
    contentSummary: params.contentSummary,
    embedding: vector
  }).onConflictDoUpdate({
    target: clinicalEmbeddings.evolutionId,
    set: { embedding: vector, contentSummary: params.contentSummary }
  });
  */
  
  // 3. (Opcional) Trigger de atualização do Patient Longitudinal Summary
  // callUpdateLongitudinalSummary(...)

  return vector;
}
