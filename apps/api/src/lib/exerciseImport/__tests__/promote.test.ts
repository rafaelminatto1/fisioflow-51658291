import { describe, it, expect } from "vitest";
import { buildPromoteInsert } from "../../../routes/exercise-import";

describe("buildPromoteInsert", () => {
  it("builds insert params from a candidate row with provenance + approved status", () => {
    const candidate = {
      name: "Supino", name_en: "Bench Press", difficulty: "avancado",
      muscles_primary: ["chest"], muscles_secondary: ["triceps"], equipment: ["barbell"],
      body_parts: ["chest"], instructions: "Deite e empurre", category: "strength",
      image_urls: ["http://img/0.jpg"], source: "free-exercise-db",
      source_id: "Bench_Press", source_url: "http://repo", source_license: "Unlicense",
    };
    const { params } = buildPromoteInsert(candidate as any, "user-123");
    expect(params).toContain("Supino");
    expect(params).toContain("free-exercise-db");
    expect(params).toContain("approved");
    expect(params).toContain("user-123");
  });
});
