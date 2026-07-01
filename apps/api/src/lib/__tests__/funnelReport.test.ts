import { describe, it, expect } from "vitest";
import { computeFunnelConversion } from "../funnelReport";

const ORDER = ["lead", "contact", "evaluation", "treatment"];

describe("computeFunnelConversion", () => {
  it("monta os estágios na ordem com contagem e % do total", () => {
    const out = computeFunnelConversion({ lead: 10, contact: 5, evaluation: 3, treatment: 2 }, ORDER);
    expect(out.total).toBe(20);
    expect(out.stages.map((s) => s.stage)).toEqual(ORDER);
    expect(out.stages[0]).toMatchObject({ stage: "lead", count: 10, pct: 50 });
    expect(out.stages[3]).toMatchObject({ stage: "treatment", count: 2, pct: 10 });
  });

  it("win rate = % que chegou ao último estágio", () => {
    const out = computeFunnelConversion({ lead: 8, contact: 0, evaluation: 0, treatment: 2 }, ORDER);
    expect(out.winRate).toBe(20); // 2 de 10
  });

  it("estágios ausentes viram 0 e total 0 não divide por zero", () => {
    const out = computeFunnelConversion({}, ORDER);
    expect(out.total).toBe(0);
    expect(out.winRate).toBe(0);
    expect(out.stages.every((s) => s.count === 0 && s.pct === 0)).toBe(true);
  });
});
