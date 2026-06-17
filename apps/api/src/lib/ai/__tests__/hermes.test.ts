import { describe, it, expect } from "vitest";
import { parseJsonLoose } from "../hermes";

describe("parseJsonLoose", () => {
  it("parses plain JSON", () => {
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLoose("[1,2,3]")).toEqual([1, 2, 3]);
  });
  it("strips markdown fences", () => {
    expect(parseJsonLoose('```json\n{"x": "y"}\n```')).toEqual({ x: "y" });
    expect(parseJsonLoose("```\n[{\"k\":1}]\n```")).toEqual([{ k: 1 }]);
  });
  it("extracts the first balanced object amid surrounding text", () => {
    expect(parseJsonLoose('Claro! Aqui está: {"type":"vas","value":3} — pronto.')).toEqual({
      type: "vas",
      value: 3,
    });
  });
  it("handles nested braces", () => {
    expect(parseJsonLoose('prefixo {"a":{"b":2},"c":[1,2]} sufixo')).toEqual({ a: { b: 2 }, c: [1, 2] });
  });
  it("returns null for non-JSON", () => {
    expect(parseJsonLoose("sem json aqui")).toBeNull();
    expect(parseJsonLoose("")).toBeNull();
  });
});
