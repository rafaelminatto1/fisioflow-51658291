import { describe, it, expect, vi } from "vitest";
import { queryCacheKey, getCachedSearch, setCachedSearch } from "../cache";

describe("queryCacheKey", () => {
  it("is stable regardless of param order", () => {
    const a = queryCacheKey({ q: "knee", limit: 10, sort: "relevance" } as any);
    const b = queryCacheKey({ sort: "relevance", limit: 10, q: "knee" } as any);
    expect(a).toBe(b);
  });
});

describe("KV search cache", () => {
  it("round-trips through KV", async () => {
    const store = new Map<string, string>();
    const kv = {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      put: vi.fn(async (k: string, v: string) => void store.set(k, v)),
    } as any;
    await setCachedSearch(kv, "k1", [{ pmid: "1" } as any]);
    const got = await getCachedSearch(kv, "k1");
    expect(got?.[0].pmid).toBe("1");
  });
  it("returns null without KV binding", async () => {
    expect(await getCachedSearch(undefined, "k")).toBeNull();
  });
});
