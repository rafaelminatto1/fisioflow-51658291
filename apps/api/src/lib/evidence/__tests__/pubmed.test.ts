import { describe, it, expect } from "vitest";
import { buildTerm, normalizeSummary } from "../sources/pubmed";

describe("buildTerm", () => {
  it("uses q when present", () => {
    expect(buildTerm({ q: "acl rehabilitation", sort: "relevance", limit: 10 } as any))
      .toContain("acl rehabilitation");
  });
  it("composes PICO with AND when q absent", () => {
    const term = buildTerm({ q: "", i: "exercise", o: "pain", sort: "relevance", limit: 10 } as any);
    expect(term).toContain("exercise");
    expect(term).toContain("pain");
    expect(term).toContain("AND");
  });
  it("appends study type and date filters", () => {
    const term = buildTerm({ q: "knee", type: "Randomized Controlled Trial", from: "2020", to: "2024", sort: "relevance", limit: 10 } as any);
    expect(term).toContain("Randomized Controlled Trial[Publication Type]");
    expect(term).toContain("2020:2024[dp]");
  });
});

describe("normalizeSummary", () => {
  it("maps an esummary result entry to EvidenceArticle", () => {
    const entry = {
      uid: "12345",
      title: "Effect of exercise on knee OA",
      fulljournalname: "J Physiother",
      pubdate: "2023 Jun",
      authors: [{ name: "Silva A" }, { name: "Souza B" }],
      articleids: [{ idtype: "doi", value: "10.1/x" }, { idtype: "pmc", value: "PMC999" }],
    };
    const art = normalizeSummary(entry);
    expect(art.pmid).toBe("12345");
    expect(art.doi).toBe("10.1/x");
    expect(art.pmcId).toBe("PMC999");
    expect(art.authors).toEqual(["Silva A", "Souza B"]);
    expect(art.url).toContain("pubmed.ncbi.nlm.nih.gov/12345");
  });
});
