import { describe, it, expect, vi } from "vitest";
import { acquireNcbiSlot } from "../ncbiClient";

function makeD1(count: number) {
  return {
    prepare: () => ({
      bind: () => ({
        first: vi.fn(async () => ({ count })),
        run: vi.fn(async () => ({})),
      }),
    }),
  } as any;
}

describe("acquireNcbiSlot", () => {
  it("allows when under the per-second cap", async () => {
    expect(await acquireNcbiSlot(makeD1(3), 10)).toBe(true);
  });
  it("blocks when at/over the cap", async () => {
    expect(await acquireNcbiSlot(makeD1(10), 10)).toBe(false);
  });
  it("returns true (fail-open) when no D1 binding", async () => {
    expect(await acquireNcbiSlot(undefined, 10)).toBe(true);
  });
});
