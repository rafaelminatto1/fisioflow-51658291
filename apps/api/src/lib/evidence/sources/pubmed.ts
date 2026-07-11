import type { Env } from "../../../types/env";
import type { EvidenceArticle, SearchParams } from "../types";
import { eutilsFetch } from "../ncbiClient";

export function buildTerm(p: SearchParams): string {
  const parts: string[] = [];
  if (p.q && p.q.length >= 3) {
    parts.push(p.q);
  } else {
    for (const t of [p.p, p.i, p.c, p.o]) {
      if (t && t.length >= 3) parts.push(t);
    }
  }
  let term = parts.join(" AND ");
  if (p.type) term += ` AND ${p.type}[Publication Type]`;
  if (p.from || p.to) {
    const from = p.from ?? "1900";
    const to = p.to ?? "3000";
    term += ` AND ${from}:${to}[dp]`;
  }
  return term;
}

export function normalizeSummary(entry: any): EvidenceArticle {
  const ids: any[] = entry.articleids ?? [];
  const doi = ids.find((i) => i.idtype === "doi")?.value ?? null;
  const pmc = ids.find((i) => i.idtype === "pmc")?.value ?? null;
  return {
    pmid: String(entry.uid),
    doi,
    source: "pubmed",
    title: entry.title ?? "",
    abstract: null,
    authors: (entry.authors ?? []).map((a: any) => a.name).filter(Boolean),
    journal: entry.fulljournalname ?? entry.source ?? null,
    pubDate: entry.pubdate ?? null,
    mesh: [],
    pmcId: pmc,
    oaStatus: pmc ? "open" : "unknown",
    studyType: null,
    url: `https://pubmed.ncbi.nlm.nih.gov/${entry.uid}/`,
    raw: entry,
  };
}

const XML_ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" };

function decodeXmlEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (m) => XML_ENTITIES[m] ?? m);
}

/**
 * Extrai abstracts do XML do efetch (rettype=abstract). Sem DOMParser no workerd,
 * o parse é por regex sobre a estrutura estável PubmedArticle > PMID + AbstractText.
 */
export function parseEfetchAbstracts(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const articles = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) ?? [];
  for (const block of articles) {
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    if (!pmid) continue;
    const sections: string[] = [];
    for (const m of block.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)) {
      const label = m[1].match(/Label="([^"]+)"/)?.[1];
      const text = decodeXmlEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      if (!text) continue;
      sections.push(label ? `${label}: ${text}` : text);
    }
    if (sections.length > 0) out[pmid] = sections.join("\n");
  }
  return out;
}

export async function searchPubmed(env: Env, p: SearchParams): Promise<EvidenceArticle[]> {
  const sort = p.sort === "date" ? "pub_date" : "relevance";
  const esearch = await eutilsFetch<any>(env, "esearch.fcgi", {
    db: "pubmed", term: buildTerm(p), retmax: p.limit, retmode: "json", sort,
  });
  const ids: string[] = esearch?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];
  const esummary = await eutilsFetch<any>(env, "esummary.fcgi", {
    db: "pubmed", id: ids.join(","), retmode: "json",
  });
  // esummary não traz abstract — buscamos via efetch; falha aqui não derruba a busca
  let abstracts: Record<string, string> = {};
  try {
    const xml = await eutilsFetch<string>(
      env, "efetch.fcgi",
      { db: "pubmed", id: ids.join(","), rettype: "abstract", retmode: "xml" },
      { raw: true },
    );
    abstracts = parseEfetchAbstracts(xml);
  } catch (e) {
    console.error("[evidence] efetch abstracts failed", e);
  }
  const result = esummary?.result ?? {};
  return ids
    .map((id) => {
      const art = normalizeSummary(result[id]);
      return { ...art, abstract: abstracts[id] ?? null };
    })
    .filter((a) => a.title);
}
