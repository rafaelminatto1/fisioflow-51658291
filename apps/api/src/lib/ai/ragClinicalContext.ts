// import { sql } from "drizzle-orm";
// import { clinicalEmbeddings } from "@fisioflow/db/schema";
import { generateEmbedding } from "./clinicalEmbeddingService";

export interface RagContextParams {
  organizationId: string;
  patientId: string;
  query: string;
  topK?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface RetrievedContext {
  evolutionId: string;
  contentSummary: string;
  similarity: number;
}

export async function retrieveClinicalContext(
  env: any, 
  db: any, 
  params: RagContextParams
): Promise<RetrievedContext[]> {
  
  // Validação estrita para evitar Cross-Patient leakage
  if (!params.organizationId || !params.patientId) {
    throw new Error("OrganizationId e PatientId são obrigatórios para RAG Clínico.");
  }

  const queryVector = await generateEmbedding(env, params.query);
  const topK = params.topK || 5;

  // Busca de Similaridade com Drizzle + pgvector (<=> operador de cosseno)
  /*
  const results = await db.select({
      evolutionId: clinicalEmbeddings.evolutionId,
      contentSummary: clinicalEmbeddings.contentSummary,
      similarity: sql<number>`1 - (${clinicalEmbeddings.embedding} <=> ${JSON.stringify(queryVector)})`
    })
    .from(clinicalEmbeddings)
    .where(
      sql`${clinicalEmbeddings.organizationId} = ${params.organizationId} AND ${clinicalEmbeddings.patientId} = ${params.patientId}`
    )
    .orderBy(sql`${clinicalEmbeddings.embedding} <=> ${JSON.stringify(queryVector)}`)
    .limit(topK);
  */
  
  // Stub de retorno para testes e tipagem
  return [
    {
      evolutionId: "test-evo-123",
      contentSummary: "Paciente relatou melhora significativa na dor lombar (EVA 3). Tolerou bem os exercícios de estabilização.",
      similarity: 0.89
    }
  ];
}
