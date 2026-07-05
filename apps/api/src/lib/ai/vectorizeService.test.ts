import { describe, it, expect } from "vitest";
import { upsertToVectorize, VectorizeMetadata, queryVectorize } from "./vectorizeService";

describe("Vectorize Service - Custom Search", () => {
  const baseMetadata: VectorizeMetadata = {
    sourceId: "123",
    sourceType: "exercise",
    organizationId: "org-1",
    category: "fisioterapia",
    tags: ["joelho", "fortalecimento"],
    visibility: "public",
    patientVisible: true,
    isSensitive: false
  };

  it("should throw error if content is marked as sensitive", async () => {
    const sensitiveMetadata = { ...baseMetadata, isSensitive: true };
    const env = { VECTORIZE_KNOWLEDGE_BASE: {} };

    await expect(upsertToVectorize(env, "texto", sensitiveMetadata)).rejects.toThrow("SECURITY_ERROR");
  });

  it("should fallback gracefully if Vectorize is unavailable during query", async () => {
    // Force env to be empty so query fails
    const emptyEnv = {};
    const results = await queryVectorize(emptyEnv, "busca", { organizationId: "org-1" });
    
    // Fallback returns empty array instead of crashing
    expect(results).toEqual([]);
  });
});
