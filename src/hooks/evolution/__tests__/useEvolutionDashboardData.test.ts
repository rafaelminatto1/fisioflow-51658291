import { describe, it, expect } from "vitest";
import { computeImprovementPct, isLowerBetterMetric } from "../useEvolutionDashboardData";

describe("computeImprovementPct", () => {
  it("pain dropping (lower-is-better) counts as improvement", () => {
    expect(computeImprovementPct([8, 3], true)).toBeCloseTo(62.5, 1);
  });

  it("pain dropping treated as higher-is-better yields 0 (capped)", () => {
    expect(computeImprovementPct([8, 3], false)).toBe(0);
  });

  it("ADM increasing (higher-is-better) counts as improvement", () => {
    expect(computeImprovementPct([30, 50], false)).toBeCloseTo(66.67, 1);
  });

  it("single value returns 0", () => {
    expect(computeImprovementPct([5], true)).toBe(0);
  });

  it("initial zero guard returns 0", () => {
    expect(computeImprovementPct([0, 5], false)).toBe(0);
  });
});

describe("isLowerBetterMetric", () => {
  it("EVA is lower-is-better", () => {
    expect(isLowerBetterMetric("EVA")).toBe(true);
  });

  it("Escala de Dor is lower-is-better", () => {
    expect(isLowerBetterMetric("Escala de Dor")).toBe(true);
  });

  it("ADM is higher-is-better", () => {
    expect(isLowerBetterMetric("ADM")).toBe(false);
  });

  it("Força is higher-is-better", () => {
    expect(isLowerBetterMetric("Força")).toBe(false);
  });

  it("Dorsiflexão is NOT flagged as lower-is-better (substring false-positive)", () => {
    expect(isLowerBetterMetric("Dorsiflexão")).toBe(false);
  });

  it("Elevação is NOT flagged as lower-is-better (substring false-positive)", () => {
    expect(isLowerBetterMetric("Elevação")).toBe(false);
  });

  it("Índice funcional is NOT flagged as lower-is-better (substring false-positive)", () => {
    expect(isLowerBetterMetric("Índice funcional")).toBe(false);
  });
});
