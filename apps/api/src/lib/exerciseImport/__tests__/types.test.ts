import { describe, it, expect } from "vitest";
import { FreeExerciseDbRecordSchema } from "../types";

describe("FreeExerciseDbRecordSchema", () => {
  it("parses a complete record", () => {
    const rec = FreeExerciseDbRecordSchema.parse({
      id: "Bench_Press", name: "Bench Press", level: "intermediate",
      equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"],
      instructions: ["Lie down", "Press up"], category: "strength",
      images: ["Bench_Press/0.jpg"], force: "push", mechanic: "compound",
    });
    expect(rec.name).toBe("Bench Press");
    expect(rec.primaryMuscles).toEqual(["chest"]);
  });
  it("defaults missing arrays to empty", () => {
    const rec = FreeExerciseDbRecordSchema.parse({ id: "x", name: "X", level: "beginner" });
    expect(rec.primaryMuscles).toEqual([]);
    expect(rec.images).toEqual([]);
    expect(rec.instructions).toEqual([]);
  });
});
