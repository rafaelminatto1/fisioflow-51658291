export interface VectorizeMetadata {
  sourceId: string;
  sourceType: "wiki" | "protocol" | "exercise" | "article" | "faq" | "generic";
  organizationId: string;
  category: string;
  tags: string[];
  visibility: "internal" | "public";
  patientVisible: boolean;
  isSensitive: boolean; // Must always be false for Vectorize
}

export interface VectorizeQueryOptions {
  organizationId: string;
  topK?: number;
  patientVisible?: boolean;
  sourceType?: string;
  category?: string;
}

/**
 * Service dedicated to Cloudflare Vectorize.
 * Used exclusively for non-sensitive data (Wikis, Protocols, Exercises).
 */
export async function upsertToVectorize(env: any, text: string, metadata: VectorizeMetadata): Promise<boolean> {
  // 1. Hard Block for Sensitive Data
  if (metadata.isSensitive) {
    throw new Error("SECURITY_ERROR: O Cloudflare Vectorize não pode armazenar dados clínicos sensíveis ou identificáveis. Use Neon pgvector.");
  }

  try {
    const vector = await generateEmbedding(env, text);

    await env.VECTORIZE_KNOWLEDGE_BASE.upsert([
      {
        id: metadata.sourceId,
        values: vector,
        metadata: metadata as any
      }
    ]);
    
    return true;
  } catch (error) {
    // Implement fallback strategy: queue for retry or log failure
    console.error("Vectorize UPSERT failed:", error);
    return false;
  }
}

export async function queryVectorize(env: any, query: string, options: VectorizeQueryOptions) {
  try {
    const queryVector = await generateEmbedding(env, query);
    
    const filterObj: Record<string, any> = {
      organizationId: options.organizationId
    };

    if (options.patientVisible !== undefined) {
      filterObj.patientVisible = options.patientVisible;
    }
    
    if (options.sourceType) {
      filterObj.sourceType = options.sourceType;
    }
    
    if (options.category) {
      filterObj.category = options.category;
    }

    /*
    const results = await env.VECTORIZE_KNOWLEDGE_BASE.query(queryVector, {
      topK: options.topK || 5,
      returnValues: false,
      returnMetadata: true,
      filter: filterObj
    });
    return results.matches;
    */
    
    // Stub
    return [
      { id: "mock-1", score: 0.95, metadata: { sourceId: "mock-1", sourceType: "wiki", patientVisible: true } }
    ];
  } catch (error) {
    console.error("Vectorize QUERY failed. Falling back to SQL/empty:", error);
    // Fallback if Vectorize is unavailable: Return empty to allow AI to respond gracefully without context
    return [];
  }
}

async function generateEmbedding(env: any, text: string): Promise<number[]> {
  try {
    // const ai = new Ai(env.AI);
    // const res = await ai.run('@cf/baai/bge-large-en-v1.5', { text: [text] });
    // return res.data[0];
    return new Array(1536).fill(0.5); // Stub
  } catch (err) {
    throw new Error("Failed to generate embeddings in Workers AI.");
  }
}
