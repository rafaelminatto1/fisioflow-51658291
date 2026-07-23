import { describe, it, expect, vi } from "vitest";
import { chunkArray, buildReindexMessages } from "./kbReindex";

vi.mock("./contentIndexing", () => ({
  indexProtocol: vi.fn(async () => {
    throw new Error("upload 503");
  }),
  indexExercise: vi.fn(async () => {}),
  indexWiki: vi.fn(async () => {}),
}));

describe("reindexKbItem", () => {
  it("propaga o erro do core (para a fila re-tentar)", async () => {
    const { reindexKbItem } = await import("./kbReindex");
    await expect(
      reindexKbItem({ source: "protocols", id: "abc" }, {} as any),
    ).rejects.toThrow("upload 503");
  });
});

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
