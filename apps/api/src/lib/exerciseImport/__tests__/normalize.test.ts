import { describe, it, expect } from "vitest";
import { normalizeName, dedupKey } from "../normalize";

describe("normalizeName", () => {
  it("lowercases, trims, strips accents, collapses spaces", () => {
    expect(normalizeName("  Agachamento   Búlgaro ")).toBe("agachamento bulgaro");
  });
});

describe("dedupKey", () => {
  it("is order-independent for muscles and equipment", () => {
    const a = dedupKey("Bench Press", ["chest", "triceps"], ["barbell"]);
    const b = dedupKey("bench  press", ["triceps", "chest"], ["barbell"]);
    expect(a).toBe(b);
  });
  it("differs when primary muscle differs", () => {
    const a = dedupKey("Row", ["back"], ["barbell"]);
    const b = dedupKey("Row", ["biceps"], ["barbell"]);
    expect(a).not.toBe(b);
  });
});
