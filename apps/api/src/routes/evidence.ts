import { Hono } from "hono";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { requireAuth } from "../lib/auth";
import { getRawSql } from "../lib/db";
import { SearchParamsSchema, SummarizeBodySchema, SaveBodySchema } from "../lib/evidence/types";
import { searchPubmed } from "../lib/evidence/sources/pubmed";
import { fetchOpenAccessFullText } from "../lib/evidence/sources/europepmc";
import { rankArticles } from "../lib/evidence/rank";
import { queryCacheKey, getCachedSearch, setCachedSearch, upsertArticles } from "../lib/evidence/cache";
import { summarizeArticles } from "../lib/evidence/summarize";
import { lookupCid10 } from "../lib/evidence/cid10Physio";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

export async function runSearch(env: Env, raw: Record<string, unknown>) {
  const params = SearchParamsSchema.parse(raw);
  const key = queryCacheKey(params);
  const cached = await getCachedSearch(env.FISIOFLOW_CONFIG, key);
  if (cached) return { count: cached.length, data: cached, cached: true };
  const articles = await searchPubmed(env, params);
  const ranked = rankArticles(articles, params.q);
  await setCachedSearch(env.FISIOFLOW_CONFIG, key, ranked);
  try {
    const sql = getRawSql(env, "write");
    await upsertArticles((q, p) => sql(q, p), ranked);
  } catch (e) {
    console.error("[evidence] upsert failed", e);
  }
  return { count: ranked.length, data: ranked, cached: false };
}

app.get("/search", requireAuth, async (c) => {
  try {
    const result = await runSearch(c.env, c.req.query());
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "search failed" }, 400);
  }
});

app.get("/article/:pmid/fulltext", requireAuth, async (c) => {
  const pmid = c.req.param("pmid");
  const sql = getRawSql(c.env, "read");
  const res = await sql(`SELECT pmc_id FROM evidence_articles WHERE pmid = $1`, [pmid]);
  const pmcId = res.rows?.[0]?.pmc_id ?? null;
  const text = await fetchOpenAccessFullText(pmcId);
  if (!text) return c.json({ available: false, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
  return c.json({ available: true, source: "europepmc", text });
});

app.post("/summarize", requireAuth, async (c) => {
  const body = SummarizeBodySchema.parse(await c.req.json());
  const sql = getRawSql(c.env, "read");
  const res = await sql(`SELECT pmid, title, abstract FROM evidence_articles WHERE pmid = ANY($1)`, [body.pmids]);
  const summary = await summarizeArticles(c.env, res.rows ?? []);
  return c.json({ summary });
});

app.post("/save", requireAuth, async (c) => {
  const body = SaveBodySchema.parse(await c.req.json());
  const user = c.get("user");
  const sql = getRawSql(c.env, "write");
  await sql(
    `INSERT INTO evidence_links (org_id, article_pmid, target_type, target_id, evidence_level, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [user.organizationId, body.pmid, body.targetType, body.targetId, body.evidenceLevel ?? null, body.note ?? null, user.uid],
  );
  return c.json({ ok: true });
});

app.get("/library", requireAuth, async (c) => {
  const user = c.get("user");
  const sql = getRawSql(c.env, "read");
  const res = await sql(
    `SELECT l.*, a.title, a.journal, a.pub_date FROM evidence_links l
     JOIN evidence_articles a ON a.pmid = l.article_pmid
     WHERE l.org_id = $1 ORDER BY l.created_at DESC LIMIT 200`,
    [user.organizationId],
  );
  return c.json({ data: res.rows ?? [] });
});

// GET /api/evidence/cid10/:code — resolve um CID-10 de fisioterapia para rótulo + query PubMed
app.get("/cid10/:code", requireAuth, async (c) => {
  const entry = lookupCid10(c.req.param("code"));
  if (!entry) return c.json({ error: "CID-10 sem mapeamento de fisioterapia" }, 404);
  return c.json({ data: entry });
});

export const EVIDENCE_TARGET_TYPES = ["exercise", "protocol", "wiki", "patient", "assessment"] as const;
export function isEvidenceTargetType(v: unknown): v is (typeof EVIDENCE_TARGET_TYPES)[number] {
  return typeof v === "string" && (EVIDENCE_TARGET_TYPES as readonly string[]).includes(v);
}

// GET /api/evidence/links?targetType=exercise&targetId=:id — artigos vinculados a um alvo
app.get("/links", requireAuth, async (c) => {
  const user = c.get("user");
  const targetType = c.req.query("targetType");
  const targetId = c.req.query("targetId");
  if (!isEvidenceTargetType(targetType) || !targetId) {
    return c.json({ error: "targetType/targetId inválidos" }, 400);
  }
  const sql = getRawSql(c.env, "read");
  const res = await sql(
    `SELECT l.id, l.article_pmid, l.evidence_level, l.note, l.created_at,
            a.title, a.journal, a.pub_date, a.doi
       FROM evidence_links l
       JOIN evidence_articles a ON a.pmid = l.article_pmid
      WHERE l.org_id = $1 AND l.target_type = $2 AND l.target_id = $3
      ORDER BY l.created_at DESC`,
    [user.organizationId, targetType, targetId],
  );
  return c.json({ data: res.rows ?? [] });
});

// DELETE /api/evidence/link/:id — remove um vínculo (org-scoped via RLS)
app.delete("/link/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const sql = getRawSql(c.env, "write");
  await sql(`DELETE FROM evidence_links WHERE id = $1 AND org_id = $2`, [id, user.organizationId]);
  return c.json({ ok: true });
});

export default app;
