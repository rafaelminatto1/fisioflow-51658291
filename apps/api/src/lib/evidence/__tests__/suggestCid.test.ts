import { describe, it, expect } from "vitest";
import { coerceCidSuggestions } from "../suggestCid";

describe("coerceCidSuggestions", () => {
  it("validates CID-10 codes and normalizes (array)", () => {
    const out = coerceCidSuggestions([
      { code: "m75.1", label: "Síndrome do manguito rotador", confidence: 0.9 },
      { code: "M54.5", label: "Dor lombar baixa" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ code: "M75.1", confidence: 0.9 });
    expect(out[1].code).toBe("M54.5");
  });

  it("accepts { suggestions: [...] } and drops invalid/duplicate codes", () => {
    const out = coerceCidSuggestions({
      suggestions: [
        { code: "M54.5", label: "Lombalgia" },
        { code: "M54.5", label: "Dup" },
        { code: "NOPE", label: "Inválido" },
        { code: "U07.1", label: "Código U bloqueado" },
        { label: "sem code" },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe("M54.5");
  });

  it("clamps confidence and caps at 5", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ code: `M0${i}.1`, label: `x${i}`, confidence: 2 }));
    const out = coerceCidSuggestions(many);
    expect(out).toHaveLength(5);
    expect(out[0].confidence).toBe(1);
  });

  it("returns [] for non-array/non-object", () => {
    expect(coerceCidSuggestions("nope")).toEqual([]);
    expect(coerceCidSuggestions(null)).toEqual([]);
  });
});
