import { describe, it, expect } from "vitest";
import { rankArticles } from "../rank";
import type { EvidenceArticle } from "../types";

const base = (over: Partial<EvidenceArticle>): EvidenceArticle => ({
  pmid: "1", doi: null, source: "pubmed", title: "t", abstract: null,
  authors: [], journal: null, pubDate: null, mesh: [], pmcId: null,
  oaStatus: "unknown", studyType: null, url: "", ...over,
});

describe("rankArticles", () => {
  it("ranks meta-analysis above case report", () => {
    const ranked = rankArticles([
      base({ pmid: "case", studyType: "Case Reports" }),
      base({ pmid: "meta", studyType: "Meta-Analysis" }),
    ], "knee");
    expect(ranked[0].pmid).toBe("meta");
  });
  it("boosts recent articles", () => {
    const ranked = rankArticles([
      base({ pmid: "old", pubDate: "2005 Jan" }),
      base({ pmid: "new", pubDate: "2024 Jan" }),
    ], "");
    expect(ranked[0].pmid).toBe("new");
  });
  it("boosts query term match in title", () => {
    const ranked = rankArticles([
      base({ pmid: "nomatch", title: "Unrelated topic" }),
      base({ pmid: "match", title: "Knee rehabilitation outcomes" }),
    ], "knee");
    expect(ranked[0].pmid).toBe("match");
  });
});
