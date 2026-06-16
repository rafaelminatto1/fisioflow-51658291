import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchApi } from "../apiClient";

describe("fetchApi", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("GETs with bearer token and returns json", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const out = await fetchApi("https://api.test", "tok", "/api/x?q=1");
    expect(out).toEqual({ ok: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.test/api/x?q=1");
    expect((init as any).headers.Authorization).toBe("Bearer tok");
  });
  it("throws a clean error on non-ok without leaking the token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    await expect(fetchApi("https://api.test", "secret-tok", "/api/x")).rejects.toThrow(/401/);
    await expect(fetchApi("https://api.test", "secret-tok", "/api/x")).rejects.not.toThrow(/secret-tok/);
  });
  it("rejects when no token provided", async () => {
    await expect(fetchApi("https://api.test", "", "/api/x")).rejects.toThrow(/autentic/i);
  });
});
