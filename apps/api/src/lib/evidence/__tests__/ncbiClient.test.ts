import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEutilsUrl, eutilsFetch } from "../ncbiClient";

const fakeEnv = { NCBI_API_KEY: "test-key", NCBI_EMAIL: "dev@example.com" } as any;

describe("buildEutilsUrl", () => {
  it("includes tool, email, api_key and params", () => {
    const url = buildEutilsUrl(fakeEnv, "esearch.fcgi", { db: "pubmed", term: "knee pain" });
    expect(url).toContain("/esearch.fcgi?");
    expect(url).toContain("db=pubmed");
    expect(url).toContain("term=knee+pain");
    expect(url).toContain("tool=fisioflow");
    expect(url).toContain("email=dev%40example.com");
    expect(url).toContain("api_key=test-key");
  });
});

describe("eutilsFetch", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
    const res = await eutilsFetch(fakeEnv, "esearch.fcgi", { db: "pubmed", term: "x", retmode: "json" });
    expect(res).toEqual({ ok: true });
  });
  it("retries on 429 then succeeds", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response("rate", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const res = await eutilsFetch(fakeEnv, "esearch.fcgi", { retmode: "json" }, { maxRetries: 2, baseDelayMs: 1 });
    expect(f).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ ok: 1 });
  });
});
