import { describe, it, expect } from "vitest";
import { SearchParamsSchema, SummarizeBodySchema, type EvidenceArticle } from "../types";

describe("SummarizeBodySchema", () => {
  it("defaults model to llama-3.3-70b and includeFullText to false", () => {
    const parsed = SummarizeBodySchema.parse({ pmids: ["123"] });
    expect(parsed.model).toBe("llama-3.3-70b");
    expect(parsed.includeFullText).toBe(false);
  });
  it("accepts glm-5.2 with includeFullText", () => {
    const parsed = SummarizeBodySchema.parse({ pmids: ["123"], model: "glm-5.2", includeFullText: true });
    expect(parsed.model).toBe("glm-5.2");
    expect(parsed.includeFullText).toBe(true);
  });
  it("rejects unknown models", () => {
    expect(() => SummarizeBodySchema.parse({ pmids: ["123"], model: "gpt-4" })).toThrow();
  });
});

describe("SearchParamsSchema", () => {
  it("accepts a minimal query", () => {
    const parsed = SearchParamsSchema.parse({ q: "acl rehabilitation" });
    expect(parsed.q).toBe("acl rehabilitation");
    expect(parsed.limit).toBe(10);
  });
  it("rejects too-short queries with no PICO", () => {
    expect(() => SearchParamsSchema.parse({ q: "a" })).toThrow();
  });
  it("clamps limit to max 50", () => {
    const parsed = SearchParamsSchema.parse({ q: "knee pain", limit: 999 });
    expect(parsed.limit).toBe(50);
  });
});
