import { describe, expect, it } from "vitest";
import { calculateAsymmetry, evaluateRisk, analyzeGait } from "../scoring";

describe("Biomechanical Scoring", () => {
  it("calculates correct asymmetry percentage", () => {
    expect(calculateAsymmetry(100, 100)).toBe(0);
    expect(calculateAsymmetry(100, 80)).toBe(20);
    expect(calculateAsymmetry(50, 100)).toBe(50);
  });

  it("evaluates clinical risk correctly", () => {
    expect(evaluateRisk(5)).toBe("low");
    expect(evaluateRisk(12)).toBe("moderate");
    expect(evaluateRisk(25)).toBe("high");
  });

  it("analyzes gait (marcha) correctly", () => {
    const metrics = {
      stepLengthLeft: 60,
      stepLengthRight: 45, // 25% asymmetry
      cadence: 100,
    };
    const analysis = analyzeGait(metrics);
    expect(analysis.asymmetry).toBe(25);
    expect(analysis.risk).toBe("high");
    expect(analysis.isNormal).toBe(false);
  });
});
