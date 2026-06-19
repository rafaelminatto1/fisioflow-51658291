import { describe, it, expect } from "vitest";
import { coerceGoals } from "../suggestGoals";

describe("coerceGoals", () => {
  it("validates and normalizes LLM output (array)", () => {
    const out = coerceGoals([
      { title: "Reduzir dor lombar para EVA ≤ 2", category: "Dor", priority: "alta", targetValue: "EVA 2/10" },
      { title: "Recuperar flexão de joelho", priority: "media" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ title: "Reduzir dor lombar para EVA ≤ 2", category: "Dor", priority: "alta" });
    expect(out[1].priority).toBe("media");
  });

  it("accepts { goals: [...] } shape and maps EN priority", () => {
    const out = coerceGoals({ goals: [{ title: "Improve gait", priority: "high" }] });
    expect(out).toHaveLength(1);
    expect(out[0].priority).toBe("alta");
  });

  it("defaults priority to media and drops items without title", () => {
    const out = coerceGoals([{ title: "Ganhar força", priority: "???" }, { category: "x" }, "nope"]);
    expect(out).toHaveLength(1);
    expect(out[0].priority).toBe("media");
  });

  it("returns [] for non-array/non-goals input", () => {
    expect(coerceGoals("nope")).toEqual([]);
    expect(coerceGoals(null)).toEqual([]);
  });
});
