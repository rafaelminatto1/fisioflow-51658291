import { Ai } from "@cloudflare/ai";

export interface KnowledgeMetadata {
  organizationId: string;
  contentType: "wiki" | "protocol" | "exercise" | "article";
  category: string;
  tags: string[];
  patientVisible: boolean;
  source: string;
  isSensitive: boolean; // Flag de segurança mandatória (LGPD)
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  text: string; // Texto a ser vetorizado
  metadata: KnowledgeMetadata;
}

/**
 * Ingestão de documentos não sensíveis para o Cloudflare Vectorize.
 * Usado para Base de Conhecimento (RAG Aberto da Clínica).
 */
export async function ingestKnowledge(env: any, doc: KnowledgeDocument) {
  // 1. Guardrail Absoluto contra PII
  if (doc.metadata.isSensitive) {
    throw new Error(`FALHA DE SEGURANÇA: Documento ${doc.id} marcado como sensível não pode ser indexado no Vectorize Público.`);
  }

  // 2. Geração do Embedding via Workers AI
  const vector = await generateEmbedding(env, doc.text);

  // 3. Upsert no Vectorize
  await env.VECTORIZE_KNOWLEDGE_BASE.upsert([
    {
      id: doc.id,
      values: vector,
      metadata: doc.metadata as any
    }
  ]);

  return true;
}

/**
 * Remove/Desindexa um documento do Vectorize.
 */
export async function removeKnowledge(env: any, docId: string) {
  await env.VECTORIZE_KNOWLEDGE_BASE.deleteByIds([docId]);
  return true;
}

async function generateEmbedding(env: any, text: string): Promise<number[]> {
  try {
    // const ai = new Ai(env.AI);
    // const { data } = await ai.run('@cf/baai/bge-large-en-v1.5', { text: [text] });
    // return data[0];
    
    // Stub para testes se não tiver o env.AI real:
    return new Array(1536).fill(0).map(() => Math.random());
  } catch (error) {
    throw new Error("Falha ao gerar embedding no Workers AI.");
  }
}
