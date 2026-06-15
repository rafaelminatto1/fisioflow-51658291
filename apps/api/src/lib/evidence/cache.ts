import type { EvidenceArticle, SearchParams } from "./types";

const TTL_SECONDS = 60 * 60 * 12;

export function queryCacheKey(p: SearchParams): string {
  const norm = JSON.stringify(Object.entries(p).sort(([a], [b]) => a.localeCompare(b)));
  return `evidence:search:${norm}`;
}

export async function getCachedSearch(
  kv: KVNamespace | undefined,
  key: string,
): Promise<EvidenceArticle[] | null> {
  if (!kv) return null;
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as EvidenceArticle[]) : null;
}

export async function setCachedSearch(
  kv: KVNamespace | undefined,
  key: string,
  articles: EvidenceArticle[],
): Promise<void> {
  if (!kv) return;
  await kv.put(key, JSON.stringify(articles), { expirationTtl: TTL_SECONDS });
}

export async function upsertArticles(
  sql: (q: string, params?: unknown[]) => Promise<unknown>,
  articles: EvidenceArticle[],
): Promise<void> {
  for (const a of articles) {
    await sql(
      `INSERT INTO evidence_articles (pmid, doi, source, title, abstract, authors, journal, pub_date, mesh, pmc_id, oa_status, study_type, raw, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       ON CONFLICT (pmid) DO UPDATE SET
         doi=EXCLUDED.doi, title=EXCLUDED.title, abstract=COALESCE(EXCLUDED.abstract, evidence_articles.abstract),
         journal=EXCLUDED.journal, pub_date=EXCLUDED.pub_date, mesh=EXCLUDED.mesh,
         pmc_id=EXCLUDED.pmc_id, oa_status=EXCLUDED.oa_status, study_type=EXCLUDED.study_type,
         raw=EXCLUDED.raw, updated_at=now()`,
      [
        a.pmid, a.doi, a.source, a.title, a.abstract, JSON.stringify(a.authors),
        a.journal, a.pubDate, JSON.stringify(a.mesh), a.pmcId, a.oaStatus, a.studyType,
        JSON.stringify(a.raw ?? null),
      ],
    );
  }
}
