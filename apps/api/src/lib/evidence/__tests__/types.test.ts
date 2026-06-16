import { describe, it, expect } from "vitest";
import { SearchParamsSchema, type EvidenceArticle } from "../types";

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
