import { describe, it, expect } from "vitest";
import { parseBlocks } from "../blocks";

describe("parseBlocks", () => {
  it("keeps valid blocks (id + known type) with extra fields", () => {
    const out = parseBlocks([
      { id: "b1", type: "vas", value: 3 },
      { id: "b2", type: "text", html: "<p>oi</p>" },
      { id: "b3", type: "goniometry", joint: "joelho", degrees: 90 },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ id: "b1", type: "vas", value: 3 });
  });

  it("drops invalid blocks (missing id/type or unknown type)", () => {
    const out = parseBlocks([
      { id: "ok", type: "photo", url: "u" },
      { type: "vas" }, // sem id
      { id: "x", type: "bogus" }, // tipo desconhecido
      "nope",
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "ok", type: "photo" });
  });

  it("returns [] for non-arrays", () => {
    expect(parseBlocks(null)).toEqual([]);
    expect(parseBlocks({ id: "x", type: "text" })).toEqual([]);
  });

  it("caps at 200 blocks", () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ id: `b${i}`, type: "text" }));
    expect(parseBlocks(many)).toHaveLength(200);
  });
});
