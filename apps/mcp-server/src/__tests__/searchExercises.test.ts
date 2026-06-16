import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchExercises, searchExercisesSchema } from "../tools/searchExercises";

describe("searchExercises", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("requires q in schema", () => {
    expect(() => searchExercisesSchema.parse({})).toThrow();
  });
  it("calls /api/exercises with q and limit", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    await searchExercises("https://api.test", "tok", { q: "agachamento", limit: 10 });
    expect(String(f.mock.calls[0][0])).toContain("/api/exercises?q=agachamento&limit=10");
  });
});
