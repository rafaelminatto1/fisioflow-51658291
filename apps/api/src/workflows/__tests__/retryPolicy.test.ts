import { describe, it, expect } from "vitest";
import { computeRetryDelay, apiRetries, throwIfMetaError } from "../retryPolicy";

describe("computeRetryDelay", () => {
  it("honors Retry-After from the error message on rate limits", () => {
    expect(computeRetryDelay(1, new Error("Meta 429 Too Many Requests (retry-after: 120)")))
      .toBe("120 seconds");
  });
  it("scales with attempt on rate limits without Retry-After", () => {
    expect(computeRetryDelay(2, new Error("rate limit exceeded"))).toBe("120 seconds");
  });
  it("uses capped exponential backoff for other errors", () => {
    expect(computeRetryDelay(1, new Error("network glitch"))).toBe("10 seconds");
    expect(computeRetryDelay(3, new Error("network glitch"))).toBe("40 seconds");
    expect(computeRetryDelay(10, new Error("network glitch"))).toBe("600 seconds");
  });
});

describe("apiRetries", () => {
  it("builds a step retry config with a dynamic delay function", () => {
    const cfg = apiRetries(4);
    expect(cfg.limit).toBe(4);
    const delay = cfg.delay as unknown as (a: { ctx: { attempt: number }; error: Error }) => string;
    expect(delay({ ctx: { attempt: 1 }, error: new Error("429") })).toBe("60 seconds");
  });
});

describe("throwIfMetaError", () => {
  it("returns silently on ok responses", async () => {
    await expect(throwIfMetaError(new Response("{}", { status: 200 }), "send-msg")).resolves.toBeUndefined();
  });
  it("throws with status and retry-after on 429", async () => {
    const res = new Response("limit", { status: 429, headers: { "Retry-After": "90" } });
    await expect(throwIfMetaError(res, "send-msg")).rejects.toThrow(/429.*retry-after: 90/i);
  });
  it("throws with status on 500", async () => {
    await expect(throwIfMetaError(new Response("boom", { status: 500 }), "send-msg"))
      .rejects.toThrow(/send-msg.*500/);
  });
});
