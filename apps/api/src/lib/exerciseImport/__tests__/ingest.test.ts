import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestFreeExerciseDb } from "../ingest";

const sample = [
  { id: "A", name: "Bench Press", level: "beginner", equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: [], instructions: ["x"], category: "strength", images: [] },
  { id: "A", name: "Bench Press", level: "beginner", equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: [], instructions: ["x"], category: "strength", images: [] },
  { id: "B", name: "Squat", level: "expert", equipment: "barbell", primaryMuscles: ["quadriceps"], secondaryMuscles: [], instructions: ["y"], category: "strength", images: [] },
];

describe("ingestFreeExerciseDb", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("fetches, dedupes by source id, and inserts each unique candidate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 })));
    const inserted: string[] = [];
    const sql = vi.fn(async (_q: string, params?: unknown[]) => {
      if (params) inserted.push(String(params[2])); // source_id is the 3rd param ($3)
      return { rows: [] };
    });
    const result = await ingestFreeExerciseDb(sql as any);
    expect(result.fetched).toBe(3);
    expect(result.inserted).toBe(2); // A deduped
    expect(inserted.sort()).toEqual(["A", "B"]);
  });
  it("throws when the source fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(ingestFreeExerciseDb((async () => ({ rows: [] })) as any)).rejects.toBeTruthy();
  });
});
