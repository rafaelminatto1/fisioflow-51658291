import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/evidence/sources/pubmed", () => ({
  searchPubmed: vi.fn(async () => [
    {
      pmid: "1",
      title: "Knee meta",
      studyType: "Meta-Analysis",
      source: "pubmed",
      doi: null,
      abstract: null,
      authors: [],
      journal: null,
      pubDate: "2024 Jan",
      mesh: [],
      pmcId: null,
      oaStatus: "unknown",
      url: "u",
    },
  ]),
}));

vi.mock("../../lib/db", () => ({ getRawSql: () => async () => ({ rows: [] }) }));

import { runSearch } from "../evidence";

const env = { NCBI_API_KEY: "k", NCBI_EMAIL: "e@x.com" } as any;

describe("runSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws on too-short query", async () => {
    await expect(runSearch(env, { q: "a" })).rejects.toBeTruthy();
  });

  it("returns ranked results for a valid query", async () => {
    const out = await runSearch(env, { q: "knee pain" });
    expect(out.count).toBe(1);
    expect(out.data[0].pmid).toBe("1");
    expect(out.cached).toBe(false);
  });
});
