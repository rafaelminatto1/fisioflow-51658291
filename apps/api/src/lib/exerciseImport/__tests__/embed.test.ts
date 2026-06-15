import { describe, it, expect, vi } from "vitest";
import { buildEmbeddingText, embedExercise } from "../embed";

describe("buildEmbeddingText", () => {
  it("combines name, muscles and instructions", () => {
    const t = buildEmbeddingText({
      name: "Supino", musclesPrimary: ["peitoral"], instructions: "Deite e empurre",
    });
    expect(t).toContain("Supino");
    expect(t).toContain("peitoral");
    expect(t).toContain("Deite e empurre");
  });
});

describe("embedExercise", () => {
  it("calls runAi with bge-m3 and returns the vector", async () => {
    const runAi = vi.fn(async () => ({ data: [[0.1, 0.2, 0.3]] }));
    const vec = await embedExercise({ name: "X", musclesPrimary: [], instructions: "" }, runAi as any);
    expect(vec).toEqual([0.1, 0.2, 0.3]);
    expect(runAi).toHaveBeenCalled();
    const modelArg = (runAi as any).mock.calls[0][0];
    expect(String(modelArg)).toContain("bge-m3");
  });
  it("returns null when the model yields no data", async () => {
    const runAi = vi.fn(async () => ({ data: [] }));
    const vec = await embedExercise({ name: "X", musclesPrimary: [], instructions: "" }, runAi as any);
    expect(vec).toBeNull();
  });
});
