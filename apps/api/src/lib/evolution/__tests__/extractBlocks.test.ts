import { describe, it, expect } from "vitest";
import { coerceBlocks } from "../extractBlocks";

describe("coerceBlocks", () => {
  it("adds ids and validates LLM output (array)", () => {
    const out = coerceBlocks([
      { type: "vas", value: 4 },
      { type: "text", text: "Paciente melhorou" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ type: "vas", value: 4 });
    expect(typeof out[0].id).toBe("string");
  });
  it("accepts { blocks: [...] } shape", () => {
    const out = coerceBlocks({ blocks: [{ type: "goniometry", joint: "joelho", degrees: 90 }] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: "goniometry", joint: "joelho" });
  });
  it("drops invalid blocks (unknown type) and non-arrays", () => {
    expect(coerceBlocks([{ type: "bogus" }])).toHaveLength(0);
    expect(coerceBlocks("nope")).toEqual([]);
  });
});
