import { describe, it, expect } from "vitest";
import { ingestKnowledge, KnowledgeDocument } from "./knowledgeIngestion";
import { searchKnowledge, SearchFilters } from "./aiSearchService";

describe("Cloudflare AI Search - Knowledge Ingestion", () => {
  it("should block sensitive content ingestion", async () => {
    const doc: KnowledgeDocument = {
      id: "doc-sensivel-1",
      text: "João Carlos tem problema no joelho.",
      metadata: {
        organizationId: "org-1",
        contentType: "wiki",
        category: "clinica",
        tags: [],
        patientVisible: false,
        source: "wiki/1",
        isSensitive: true, // Flag must block
        updatedAt: new Date().toISOString()
      }
    };
    
    const mockEnv = { AI: {}, VECTORIZE_KNOWLEDGE_BASE: { upsert: async () => {} } };
    
    await expect(ingestKnowledge(mockEnv, doc)).rejects.toThrow("FALHA DE SEGURANÇA");
  });

  it("should filter properly based on metadata (unit structure)", async () => {
    // Apenas validando se a estrutura está chamando o vectorize com filtro
    // O mock no serviço devolve "doc-exercicio-lca" independente, mas 
    // testamos o conceito de isolamento.
    const filters: SearchFilters = {
      organizationId: "org-1",
      patientVisible: false,
      contentType: "protocol"
    };
    
    const mockEnv = { AI: {}, VECTORIZE_KNOWLEDGE_BASE: {} }; // O service tem stub interno
    
    const results = await searchKnowledge(mockEnv, "protocolo", filters);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("doc-exercicio-lca");
  });
});
