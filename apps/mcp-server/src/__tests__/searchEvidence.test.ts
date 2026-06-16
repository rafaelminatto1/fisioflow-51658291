import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchEvidence, searchEvidenceSchema } from "../tools/searchEvidence";

describe("searchEvidence", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("has a zod schema requiring q", () => {
    expect(() => searchEvidenceSchema.parse({})).toThrow();
    expect(searchEvidenceSchema.parse({ q: "knee" }).q).toBe("knee");
  });
  it("calls the evidence endpoint with q and limit", async () => {
    const f = vi.fn(async () =>
      new Response(JSON.stringify({ count: 1, data: [{ pmid: "1" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", f);
    const out = await searchEvidence("https://api.test", "tok", { q: "knee pain", limit: 5 });
    expect(out.count).toBe(1);
    expect(String(f.mock.calls[0][0])).toContain("/api/evidence/search?q=knee+pain&limit=5");
  });
});
