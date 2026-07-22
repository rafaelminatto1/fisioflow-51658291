import { describe, it, expect } from "vitest";
import { chunkArray, buildReindexMessages } from "./kbReindex";

describe("kbReindex helpers", () => {
  it("chunkArray splits into batches of at most `size`", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([], 100)).toEqual([]);
    expect(chunkArray([1, 2], 100)).toEqual([[1, 2]]);
  });

  it("buildReindexMessages wraps each id in a REINDEX_KB_ITEM queue task", () => {
    const msgs = buildReindexMessages("protocols", ["a", "b"]);
    expect(msgs).toEqual([
      { body: { type: "REINDEX_KB_ITEM", payload: { source: "protocols", id: "a" } } },
      { body: { type: "REINDEX_KB_ITEM", payload: { source: "protocols", id: "b" } } },
    ]);
  });
});
