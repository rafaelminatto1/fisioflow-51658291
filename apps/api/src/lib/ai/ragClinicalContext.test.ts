import { describe, it, expect } from "vitest";
import { buildClinicalContextPrompt } from "./clinicalContextBuilder";

describe("RAG Clinical Context Builder", () => {
  it("should return insufficient context message if no context provided", () => {
    const prompt = buildClinicalContextPrompt("Como está a dor?", []);
    expect(prompt).toContain("Insuficiente");
    expect(prompt).toContain("não há contexto clínico salvo suficiente");
  });

  it("should build prompt with context", () => {
    const prompt = buildClinicalContextPrompt("Como está a dor?", [
      { evolutionId: "123", contentSummary: "Dor lombar melhorou bastante", similarity: 0.9 }
    ]);
    expect(prompt).toContain("Dor lombar melhorou");
    expect(prompt).toContain("NUNCA invente exames");
  });

  it("should respect max tokens limit (approximate text length)", () => {
    // Generate 50 contexts of 100 characters each
    const contexts = Array(50).fill(null).map((_, i) => ({
      evolutionId: `${i}`,
      contentSummary: "A".repeat(100),
      similarity: 0.8
    }));
    
    // maxTokens = 50. Approx 3 chars per token => max 150 chars of context
    const prompt = buildClinicalContextPrompt("Query", contexts, 50);
    
    // It shouldn't include all 50 evolutions. The total length of the context block should be small.
    // Full 50 evos = 50 * 100 = 5000 chars. 
    expect(prompt.length).toBeLessThan(1000); 
  });
});
