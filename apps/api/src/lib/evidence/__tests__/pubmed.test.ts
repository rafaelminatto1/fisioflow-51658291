import { describe, it, expect, vi, afterEach } from "vitest";
import { buildTerm, normalizeSummary, parseEfetchAbstracts, searchPubmed } from "../sources/pubmed";

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

const EFETCH_XML = `<?xml version="1.0" ?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation><PMID Version="1">111</PMID>
      <Article>
        <Abstract>
          <AbstractText Label="BACKGROUND">Knee OA is common.</AbstractText>
          <AbstractText Label="RESULTS">Exercise reduced pain &amp; stiffness.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation><PMID Version="1">222</PMID>
      <Article>
        <Abstract>
          <AbstractText>Single paragraph abstract.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation><PMID Version="1">333</PMID>
      <Article></Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

describe("parseEfetchAbstracts", () => {
  it("maps PMID to abstract text, joining labeled sections and decoding entities", () => {
    const map = parseEfetchAbstracts(EFETCH_XML);
    expect(map["111"]).toContain("BACKGROUND: Knee OA is common.");
    expect(map["111"]).toContain("RESULTS: Exercise reduced pain & stiffness.");
    expect(map["222"]).toBe("Single paragraph abstract.");
    expect(map["333"]).toBeUndefined();
  });
  it("returns empty map for malformed xml", () => {
    expect(parseEfetchAbstracts("not xml")).toEqual({});
  });
});

describe("searchPubmed", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fills abstracts from efetch after esummary", async () => {
    const esearch = { esearchresult: { idlist: ["111", "222"] } };
    const esummary = {
      result: {
        "111": { uid: "111", title: "Article one", articleids: [] },
        "222": { uid: "222", title: "Article two", articleids: [] },
      },
    };
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("esearch.fcgi")) return new Response(JSON.stringify(esearch), { status: 200 });
      if (u.includes("esummary.fcgi")) return new Response(JSON.stringify(esummary), { status: 200 });
      if (u.includes("efetch.fcgi")) return new Response(EFETCH_XML, { status: 200 });
      throw new Error(`unexpected url ${u}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const articles = await searchPubmed({} as any, { q: "knee oa", sort: "relevance", limit: 10 } as any);
    expect(articles).toHaveLength(2);
    expect(articles[0].abstract).toContain("Knee OA is common");
    expect(articles[1].abstract).toBe("Single paragraph abstract.");
  });

  it("degrades to null abstracts when efetch fails", async () => {
    const esearch = { esearchresult: { idlist: ["111"] } };
    const esummary = { result: { "111": { uid: "111", title: "Article one", articleids: [] } } };
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("esearch.fcgi")) return new Response(JSON.stringify(esearch), { status: 200 });
      if (u.includes("esummary.fcgi")) return new Response(JSON.stringify(esummary), { status: 200 });
      return new Response("err", { status: 400 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const articles = await searchPubmed({} as any, { q: "knee oa", sort: "relevance", limit: 10 } as any);
    expect(articles).toHaveLength(1);
    expect(articles[0].abstract).toBeNull();
  });
});
