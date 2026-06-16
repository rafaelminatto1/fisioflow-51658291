import { describe, it, expect } from "vitest";
import { mapFreeExerciseDb } from "../mapFreeExerciseDb";

describe("mapFreeExerciseDb", () => {
  it("maps a record to a candidate with provenance and difficulty", () => {
    const c = mapFreeExerciseDb({
      id: "Bench_Press", name: "Bench Press", level: "expert",
      equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"],
      instructions: ["Lie down", "Press up"], category: "strength",
      images: ["Bench_Press/0.jpg"],
    });
    expect(c.source).toBe("free-exercise-db");
    expect(c.sourceId).toBe("Bench_Press");
    expect(c.sourceLicense).toBe("Unlicense");
    expect(c.difficulty).toBe("avancado");
    expect(c.nameEn).toBe("Bench Press");
    expect(c.equipment).toEqual(["barbell"]);
    expect(c.instructions).toContain("Lie down");
    expect(c.imageUrls[0]).toContain("free-exercise-db/main/exercises/Bench_Press/0.jpg");
    expect(c.dedupKey).toBe("bench press|chest|barbell");
  });
  it("maps beginner/intermediate and null equipment", () => {
    const c = mapFreeExerciseDb({ id: "x", name: "X", level: "beginner", primaryMuscles: [], secondaryMuscles: [], instructions: [], images: [] });
    expect(c.difficulty).toBe("iniciante");
    expect(c.equipment).toEqual([]);
  });
});
