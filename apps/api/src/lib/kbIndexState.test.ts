import { describe, it, expect } from "vitest";
import { chunksToDelete } from "./kbIndexState";

describe("chunksToDelete", () => {
  it("lista os chunks órfãos quando o doc encolheu", () => {
    expect(chunksToDelete("protocol-abc.md", 5, 2)).toEqual([
      "protocol-abc--2.md",
      "protocol-abc--3.md",
      "protocol-abc--4.md",
    ]);
  });
  it("retorna vazio quando não encolheu", () => {
    expect(chunksToDelete("protocol-abc.md", 3, 3)).toEqual([]);
    expect(chunksToDelete("protocol-abc.md", 2, 5)).toEqual([]);
  });
  it("respeita o padrão de nome (base sem .md + --n.md)", () => {
    expect(chunksToDelete("wiki/xyz.md", 2, 0)).toEqual(["wiki/xyz--0.md", "wiki/xyz--1.md"]);
  });
});
