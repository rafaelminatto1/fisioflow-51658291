import { describe, it, expect } from "vitest";
import { coerceMeasures } from "../extractMeasures";

describe("coerceMeasures", () => {
  it("validates and normalizes scale measures (array)", () => {
    const out = coerceMeasures([
      { scale: "EVA", score: 7, maxScore: 10 },
      { scale: "Oswestry", score: "42", interpretation: "Incapacidade moderada" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ scale: "EVA", score: 7, maxScore: 10 });
    expect(out[1]).toMatchObject({ scale: "Oswestry", score: 42, interpretation: "Incapacidade moderada" });
  });

  it("accepts { measures: [...] } and coerces value/scale_name aliases", () => {
    const out = coerceMeasures({ measures: [{ scale_name: "DASH", value: 55 }] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ scale: "DASH", score: 55 });
  });

  it("drops items without scale or numeric score, caps at 10", () => {
    const bad = coerceMeasures([{ scale: "X" }, { score: 5 }, "nope"]);
    expect(bad).toHaveLength(0);
    const many = Array.from({ length: 12 }, (_, i) => ({ scale: `S${i}`, score: i }));
    expect(coerceMeasures(many)).toHaveLength(10);
  });

  it("returns [] for non-array/non-object", () => {
    expect(coerceMeasures("nope")).toEqual([]);
    expect(coerceMeasures(null)).toEqual([]);
  });
});
