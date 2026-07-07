import { describe, it, expect, vi } from "vitest";
import { isTransientAIError, withAIRetry } from "../retry";

describe("isTransientAIError", () => {
  it("é true para erros transitórios (5xx/429/rede/rate limit)", () => {
    for (const m of ["503 Service Unavailable", "fetch failed", "rate limit exceeded", "429 Too Many Requests", "model overloaded", "ETIMEDOUT"]) {
      expect(isTransientAIError(new Error(m))).toBe(true);
    }
  });
  it("é false para erros determinísticos", () => {
    for (const m of ["400 Bad Request", "invalid schema", "unauthorized 401", "prompt too long"]) {
      expect(isTransientAIError(new Error(m))).toBe(false);
    }
  });
});

describe("withAIRetry", () => {
  it("re-tenta erro transitório e depois tem sucesso", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 3) throw new Error("503 unavailable");
      return "ok";
    });
    const r = await withAIRetry(fn, { retries: 3, baseMs: 1 });
    expect(r).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("lança IMEDIATAMENTE em erro não-transitório (sem re-tentar)", async () => {
    const fn = vi.fn(async () => {
      throw new Error("400 bad request");
    });
    await expect(withAIRetry(fn, { retries: 3, baseMs: 1 })).rejects.toThrow("400");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("esgota as tentativas e lança o último erro transitório", async () => {
    const fn = vi.fn(async () => {
      throw new Error("502 bad gateway");
    });
    await expect(withAIRetry(fn, { retries: 2, baseMs: 1 })).rejects.toThrow("502");
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});
