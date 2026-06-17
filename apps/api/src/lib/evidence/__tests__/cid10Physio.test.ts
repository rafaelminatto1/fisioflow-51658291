import { describe, it, expect } from "vitest";
import { normalizeCid10, lookupCid10 } from "../cid10Physio";

describe("normalizeCid10", () => {
  it("strips dots/spaces and uppercases", () => {
    expect(normalizeCid10("m54.5")).toBe("M545");
    expect(normalizeCid10(" M75.1 ")).toBe("M751");
  });
});

describe("lookupCid10", () => {
  it("matches exact codes", () => {
    expect(lookupCid10("M54.5")?.query).toContain("low back pain");
    expect(lookupCid10("M75.1")?.label).toContain("manguito");
  });
  it("falls back to the most specific available prefix", () => {
    // M75.9 não existe explicitamente → cai em M75 (lesões do ombro)
    const r = lookupCid10("M75.9");
    expect(r?.code).toBe("M75");
    expect(r?.query).toContain("shoulder");
  });
  it("returns null for unmapped codes", () => {
    expect(lookupCid10("Z00")).toBeNull();
  });
});
