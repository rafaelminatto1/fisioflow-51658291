# FisioFlow Evidence Gateway (PubMed) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a backend "Evidence Gateway" on Cloudflare Workers that lets FisioFlow search, rank, summarize, cache and link PubMed/Europe PMC scientific articles — all server-side, never from the frontend.

**Architecture:** New Hono route module `apps/api/src/routes/evidence.ts` (mounted at `/api/evidence`) backed by a `apps/api/src/lib/evidence/` layer (NCBI client with global rate limiting, source adapters, ranking, cache, AI summary, embeddings). Persistence in Neon (migration 0115) + KV query-cache + R2 for artifacts. AI via the existing `workersAi.ts` registry through AI Gateway.

**Tech Stack:** Cloudflare Workers (Hono), TypeScript strict, Neon Postgres + Hyperdrive (`pg`), pgvector, Workers AI, KV (`FISIOFLOW_CONFIG`), D1 (`EDGE_CACHE`), Analytics Engine, Vitest.

**Scope note:** This plan delivers **Fase 0 (segurança) + Fase 1 (API)** — a complete, testable backend. UI surfaces (Fase 2) and MCP servers (Fase 3) are follow-on plans written after this API is merged.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/api/src/lib/evidence/types.ts` | Canonical `EvidenceArticle` type + Zod DTOs for search/summarize/save |
| `apps/api/src/lib/evidence/ncbiClient.ts` | NCBI E-utilities fetch wrapper + global token-bucket (10 req/s) |
| `apps/api/src/lib/evidence/sources/pubmed.ts` | PubMed adapter: esearch→esummary→normalize |
| `apps/api/src/lib/evidence/sources/europepmc.ts` | Europe PMC adapter: search + OA full-text |
| `apps/api/src/lib/evidence/rank.ts` | Pure ranking function (study type, recency, MeSH/PICO match) |
| `apps/api/src/lib/evidence/cache.ts` | KV query-cache + Neon `evidence_articles` upsert/read |
| `apps/api/src/lib/evidence/summarize.ts` | PT-BR AI summary (PICO/takeaways/level) via registry |
| `apps/api/src/lib/evidence/embed.ts` | Embeddings → pgvector helper |
| `apps/api/src/routes/evidence.ts` | Hono endpoints; mounted in `index.ts` |
| `apps/api/migrations/0115_evidence_gateway.sql` + `.down.sql` | DB schema |
| `apps/api/src/lib/evidence/__tests__/*.test.ts` | Unit/integration tests |

---

## Task 0: Security hardening (no code, do first)

**Files:**
- Modify: `mcp.json` (Codex)
- Create: `.mcp.json` (Claude Code, project scope)
- Modify: `.gitignore` (ensure both ignored if they hold anything sensitive)

- [ ] **Step 1: Rotate the exposed PubMed key**

The PubMed API key was pasted in chat → treat as compromised. Go to
https://www.ncbi.nlm.nih.gov/account/ → Settings → API Key Management → create a new key,
delete the old one. Keep the new key only in your shell env, never in git.

- [ ] **Step 2: Export secrets in your shell profile (not committed)**

Add to `~/.bashrc` (or `~/.zshrc`):
```bash
export NCBI_API_KEY="<new-rotated-key>"
export NCBI_EMAIL="rafael.minatto@usp.br"
```
Then `source ~/.bashrc`.

- [ ] **Step 3: Fix plaintext secrets already in `mcp.json`**

In `mcp.json`, replace the hardcoded Neon password and Exa key with env refs:
- `postgres.env.POSTGRES_CONNECTION_STRING` → `"${POSTGRES_CONNECTION_STRING}"`
- `exa.url` → move the key to `"${EXA_API_KEY}"` form or an `env` block.
Export those in your shell too. (The Neon password in git history should also be rotated in Neon console.)

- [ ] **Step 4: Add the PubMed MCP to Codex `mcp.json`**

Add under `mcpServers`:
```json
"pubmed-search": {
  "command": "uvx",
  "args": ["pubmed-search-mcp"],
  "env": { "NCBI_EMAIL": "${NCBI_EMAIL}", "NCBI_API_KEY": "${NCBI_API_KEY}" },
  "disabled": false,
  "autoApprove": ["search_pubmed", "get_article_details", "find_related_articles"]
}
```

- [ ] **Step 5: Add the same MCP for Claude Code in `.mcp.json` (project root)**

```json
{
  "mcpServers": {
    "pubmed-search": {
      "command": "uvx",
      "args": ["pubmed-search-mcp"],
      "env": { "NCBI_EMAIL": "${NCBI_EMAIL}", "NCBI_API_KEY": "${NCBI_API_KEY}" }
    }
  }
}
```
Verify with `claude mcp list` after restarting Claude Code.

- [ ] **Step 6: Set Worker secrets**

Run from `apps/api/`:
```bash
echo "$NCBI_API_KEY" | npx wrangler secret put NCBI_API_KEY
echo "$NCBI_EMAIL"   | npx wrangler secret put NCBI_EMAIL
```
Expected: "Success! Uploaded secret NCBI_API_KEY".

- [ ] **Step 7: Commit (config only, no secrets)**

```bash
git add mcp.json .mcp.json .gitignore
git commit -m "chore(mcp): add PubMed MCP for Codex + Claude Code via env vars; remove plaintext secrets"
```

---

## Task 1: Canonical types + Zod DTOs

**Files:**
- Create: `apps/api/src/lib/evidence/types.ts`
- Test: `apps/api/src/lib/evidence/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { SearchParamsSchema, type EvidenceArticle } from "../types";

describe("SearchParamsSchema", () => {
  it("accepts a minimal query", () => {
    const parsed = SearchParamsSchema.parse({ q: "acl rehabilitation" });
    expect(parsed.q).toBe("acl rehabilitation");
    expect(parsed.limit).toBe(10); // default
  });

  it("rejects too-short queries with no PICO", () => {
    expect(() => SearchParamsSchema.parse({ q: "a" })).toThrow();
  });

  it("clamps limit to max 50", () => {
    const parsed = SearchParamsSchema.parse({ q: "knee pain", limit: 999 });
    expect(parsed.limit).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/types.test.ts`
Expected: FAIL — cannot find module `../types`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { z } from "zod";

export interface EvidenceArticle {
  pmid: string;
  doi: string | null;
  source: "pubmed" | "europepmc" | "openalex";
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  pubDate: string | null; // ISO date string when known
  mesh: string[];
  pmcId: string | null;
  oaStatus: "open" | "closed" | "unknown";
  studyType: string | null;
  url: string;
  raw?: unknown;
}

export const SearchParamsSchema = z
  .object({
    q: z.string().trim().default(""),
    p: z.string().trim().optional(), // PICO: population
    i: z.string().trim().optional(), // intervention
    c: z.string().trim().optional(), // comparison
    o: z.string().trim().optional(), // outcome
    from: z.string().regex(/^\d{4}(\/\d{2}(\/\d{2})?)?$/).optional(),
    to: z.string().regex(/^\d{4}(\/\d{2}(\/\d{2})?)?$/).optional(),
    type: z.string().trim().optional(), // e.g. "Randomized Controlled Trial"
    sort: z.enum(["relevance", "date"]).default("relevance"),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine(
    (v) => v.q.length >= 3 || [v.p, v.i, v.c, v.o].some((x) => (x?.length ?? 0) >= 3),
    { message: "Forneça uma query (>=3 chars) ou termos PICO" },
  );

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export const SummarizeBodySchema = z.object({
  pmids: z.array(z.string().regex(/^\d+$/)).min(1).max(20),
});

export const SaveBodySchema = z.object({
  pmid: z.string().regex(/^\d+$/),
  targetType: z.enum(["exercise", "protocol", "wiki", "patient", "assessment"]),
  targetId: z.string().min(1),
  evidenceLevel: z.string().max(40).optional(),
  note: z.string().max(2000).optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/types.ts apps/api/src/lib/evidence/__tests__/types.test.ts
git commit -m "feat(evidence): canonical EvidenceArticle type + Zod DTOs"
```

---

## Task 2: NCBI client with global rate limiting

**Files:**
- Create: `apps/api/src/lib/evidence/ncbiClient.ts`
- Test: `apps/api/src/lib/evidence/__tests__/ncbiClient.test.ts`

The client builds E-utils URLs with `tool`/`email`/`api_key`, throttles to ≤10 req/s using the D1 `EDGE_CACHE.rate_limits` table (same upsert pattern as the rest of the app), and backs off on HTTP 429.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEutilsUrl, eutilsFetch } from "../ncbiClient";

const fakeEnv = {
  NCBI_API_KEY: "test-key",
  NCBI_EMAIL: "dev@example.com",
} as any;

describe("buildEutilsUrl", () => {
  it("includes tool, email, api_key and params", () => {
    const url = buildEutilsUrl(fakeEnv, "esearch.fcgi", { db: "pubmed", term: "knee pain" });
    expect(url).toContain("/esearch.fcgi?");
    expect(url).toContain("db=pubmed");
    expect(url).toContain("term=knee+pain");
    expect(url).toContain("tool=fisioflow");
    expect(url).toContain("email=dev%40example.com");
    expect(url).toContain("api_key=test-key");
  });
});

describe("eutilsFetch", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ));
    const res = await eutilsFetch(fakeEnv, "esearch.fcgi", { db: "pubmed", term: "x", retmode: "json" });
    expect(res).toEqual({ ok: true });
  });

  it("retries on 429 then succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const res = await eutilsFetch(fakeEnv, "esearch.fcgi", { retmode: "json" }, { maxRetries: 2, baseDelayMs: 1 });
    expect(f).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ ok: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/ncbiClient.test.ts`
Expected: FAIL — cannot find module `../ncbiClient`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Env } from "../../types/env";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export function buildEutilsUrl(
  env: Pick<Env, "NCBI_API_KEY" | "NCBI_EMAIL">,
  endpoint: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${EUTILS_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  url.searchParams.set("tool", "fisioflow");
  if (env.NCBI_EMAIL) url.searchParams.set("email", env.NCBI_EMAIL);
  if (env.NCBI_API_KEY) url.searchParams.set("api_key", env.NCBI_API_KEY);
  return url.toString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function eutilsFetch<T = unknown>(
  env: Pick<Env, "NCBI_API_KEY" | "NCBI_EMAIL">,
  endpoint: string,
  params: Record<string, string | number | undefined>,
  opts: { maxRetries?: number; baseDelayMs?: number; raw?: boolean } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 300, raw = false } = opts;
  const url = buildEutilsUrl(env, endpoint, params);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= maxRetries) throw new Error(`NCBI ${endpoint} failed: ${res.status}`);
      await sleep(baseDelayMs * 2 ** attempt);
      attempt++;
      continue;
    }
    if (!res.ok) throw new Error(`NCBI ${endpoint} failed: ${res.status}`);
    return raw ? ((await res.text()) as unknown as T) : ((await res.json()) as T);
  }
}
```

> Note: a process-global 10 req/s limiter is added in Task 2b once the route wires `EDGE_CACHE`. For unit tests we exercise URL building + retry only.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/ncbiClient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/ncbiClient.ts apps/api/src/lib/evidence/__tests__/ncbiClient.test.ts
git commit -m "feat(evidence): NCBI E-utils client with retry/backoff"
```

---

## Task 2b: Global rate limiter via D1 EDGE_CACHE

**Files:**
- Modify: `apps/api/src/lib/evidence/ncbiClient.ts`
- Test: `apps/api/src/lib/evidence/__tests__/rateLimit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { acquireNcbiSlot } from "../ncbiClient";

function makeD1(count: number) {
  return {
    prepare: () => ({
      bind: () => ({
        first: vi.fn(async () => ({ count })),
        run: vi.fn(async () => ({})),
      }),
    }),
  } as any;
}

describe("acquireNcbiSlot", () => {
  it("allows when under the per-second cap", async () => {
    const ok = await acquireNcbiSlot(makeD1(3), 10);
    expect(ok).toBe(true);
  });
  it("blocks when at/over the cap", async () => {
    const ok = await acquireNcbiSlot(makeD1(10), 10);
    expect(ok).toBe(false);
  });
  it("returns true (fail-open) when no D1 binding", async () => {
    const ok = await acquireNcbiSlot(undefined, 10);
    expect(ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/rateLimit.test.ts`
Expected: FAIL — `acquireNcbiSlot` not exported.

- [ ] **Step 3: Add implementation to `ncbiClient.ts`**

```ts
import type { D1Database } from "@cloudflare/workers-types";

/**
 * Token-bucket por janela de 1s na tabela D1 EDGE_CACHE.rate_limits.
 * key fixa "ncbi:global" para respeitar o limite NCBI (10 req/s com api_key).
 * Fail-open se não houver binding D1 (dev local).
 */
export async function acquireNcbiSlot(
  db: D1Database | undefined,
  perSecond = 10,
): Promise<boolean> {
  if (!db) return true;
  const windowStart = Math.floor(Date.now() / 1000);
  const key = "ncbi:global";
  await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
    )
    .bind(key, windowStart)
    .run();
  const row = (await db
    .prepare(`SELECT count FROM rate_limits WHERE key = ? AND window_start = ?`)
    .bind(key, windowStart)
    .first()) as { count: number } | null;
  return (row?.count ?? 0) <= perSecond;
}
```

> If `eutilsFetch` is given an `EDGE_CACHE` binding, call `acquireNcbiSlot` before fetch and `await sleep(120)` + retry when it returns false. Wire this in the route (Task 8).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/rateLimit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/ncbiClient.ts apps/api/src/lib/evidence/__tests__/rateLimit.test.ts
git commit -m "feat(evidence): global NCBI rate limiter via D1 EDGE_CACHE"
```

---

## Task 3: PubMed adapter

**Files:**
- Create: `apps/api/src/lib/evidence/sources/pubmed.ts`
- Test: `apps/api/src/lib/evidence/__tests__/pubmed.test.ts`

Adapter does esearch (term → pmids) then esummary (pmids → metadata), normalizing to `EvidenceArticle[]`. `buildTerm()` is pure and composes PICO + filters into PubMed query syntax.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
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
    const term = buildTerm({
      q: "knee", type: "Randomized Controlled Trial", from: "2020", to: "2024",
      sort: "relevance", limit: 10,
    } as any);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/pubmed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
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

export async function searchPubmed(env: Env, p: SearchParams): Promise<EvidenceArticle[]> {
  const sort = p.sort === "date" ? "pub_date" : "relevance";
  const esearch = await eutilsFetch<any>(env, "esearch.fcgi", {
    db: "pubmed",
    term: buildTerm(p),
    retmax: p.limit,
    retmode: "json",
    sort,
  });
  const ids: string[] = esearch?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];
  const esummary = await eutilsFetch<any>(env, "esummary.fcgi", {
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
  });
  const result = esummary?.result ?? {};
  return ids.map((id) => normalizeSummary(result[id])).filter((a) => a.title);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/pubmed.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/sources/pubmed.ts apps/api/src/lib/evidence/__tests__/pubmed.test.ts
git commit -m "feat(evidence): PubMed adapter (esearch+esummary, PICO term builder)"
```

---

## Task 4: Europe PMC adapter (OA full-text)

**Files:**
- Create: `apps/api/src/lib/evidence/sources/europepmc.ts`
- Test: `apps/api/src/lib/evidence/__tests__/europepmc.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { fetchOpenAccessFullText } from "../sources/europepmc";

describe("fetchOpenAccessFullText", () => {
  it("returns text when OA full text exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("<article>full text body</article>", { status: 200 }),
    ));
    const txt = await fetchOpenAccessFullText("PMC123");
    expect(txt).toContain("full text body");
  });
  it("returns null on 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const txt = await fetchOpenAccessFullText("PMC404");
    expect(txt).toBeNull();
  });
  it("returns null when no pmcId", async () => {
    expect(await fetchOpenAccessFullText(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/europepmc.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
const EPMC_FULLTEXT = "https://www.ebi.ac.uk/europepmc/webservices/rest";

/**
 * Busca full-text XML open-access do Europe PMC por PMC id.
 * Retorna null quando não há OA disponível.
 */
export async function fetchOpenAccessFullText(pmcId: string | null): Promise<string | null> {
  if (!pmcId) return null;
  const id = pmcId.startsWith("PMC") ? pmcId : `PMC${pmcId}`;
  const res = await fetch(`${EPMC_FULLTEXT}/${id}/fullTextXML`);
  if (!res.ok) return null;
  return await res.text();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/europepmc.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/sources/europepmc.ts apps/api/src/lib/evidence/__tests__/europepmc.test.ts
git commit -m "feat(evidence): Europe PMC OA full-text adapter"
```

---

## Task 5: Ranking function

**Files:**
- Create: `apps/api/src/lib/evidence/rank.ts`
- Test: `apps/api/src/lib/evidence/__tests__/rank.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
    const arts = [
      base({ pmid: "case", studyType: "Case Reports" }),
      base({ pmid: "meta", studyType: "Meta-Analysis" }),
    ];
    const ranked = rankArticles(arts, "knee");
    expect(ranked[0].pmid).toBe("meta");
  });
  it("boosts recent articles", () => {
    const arts = [
      base({ pmid: "old", pubDate: "2005 Jan" }),
      base({ pmid: "new", pubDate: "2024 Jan" }),
    ];
    const ranked = rankArticles(arts, "");
    expect(ranked[0].pmid).toBe("new");
  });
  it("boosts query term match in title", () => {
    const arts = [
      base({ pmid: "nomatch", title: "Unrelated topic" }),
      base({ pmid: "match", title: "Knee rehabilitation outcomes" }),
    ];
    const ranked = rankArticles(arts, "knee");
    expect(ranked[0].pmid).toBe("match");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/rank.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { EvidenceArticle } from "./types";

const STUDY_WEIGHT: Record<string, number> = {
  "meta-analysis": 50,
  "systematic review": 45,
  "randomized controlled trial": 40,
  "clinical trial": 25,
  "cohort": 15,
  "case-control": 10,
  "case reports": 2,
};

function studyScore(t: string | null): number {
  if (!t) return 5;
  const key = t.toLowerCase();
  for (const [k, w] of Object.entries(STUDY_WEIGHT)) if (key.includes(k)) return w;
  return 5;
}

function yearScore(pubDate: string | null): number {
  if (!pubDate) return 0;
  const m = pubDate.match(/\d{4}/);
  if (!m) return 0;
  const year = Number(m[0]);
  const age = new Date().getFullYear() - year;
  return Math.max(0, 30 - age); // newer = higher, floor 0
}

function matchScore(title: string, query: string): number {
  if (!query) return 0;
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const lc = title.toLowerCase();
  return terms.reduce((s, t) => (lc.includes(t) ? s + 10 : s), 0);
}

export function rankArticles(arts: EvidenceArticle[], query: string): EvidenceArticle[] {
  return [...arts].sort(
    (a, b) =>
      studyScore(b.studyType) + yearScore(b.pubDate) + matchScore(b.title, query) -
      (studyScore(a.studyType) + yearScore(a.pubDate) + matchScore(a.title, query)),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/rank.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/rank.ts apps/api/src/lib/evidence/__tests__/rank.test.ts
git commit -m "feat(evidence): study-type + recency + match ranking"
```

---

## Task 6: Database migration 0115

**Files:**
- Create: `apps/api/migrations/0115_evidence_gateway.sql`
- Create: `apps/api/migrations/0115_evidence_gateway.down.sql`

- [ ] **Step 1: Write the up migration**

```sql
-- 0115_evidence_gateway.sql
-- Cache global de artigos + vínculos por organização (RLS).

CREATE TABLE IF NOT EXISTS evidence_articles (
  pmid        TEXT PRIMARY KEY,
  doi         TEXT,
  source      TEXT NOT NULL DEFAULT 'pubmed',
  title       TEXT NOT NULL,
  abstract    TEXT,
  authors     JSONB NOT NULL DEFAULT '[]'::jsonb,
  journal     TEXT,
  pub_date    TEXT,
  mesh        JSONB NOT NULL DEFAULT '[]'::jsonb,
  pmc_id      TEXT,
  oa_status   TEXT NOT NULL DEFAULT 'unknown',
  study_type  TEXT,
  raw         JSONB,
  embedding   vector(768),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL,
  article_pmid   TEXT NOT NULL REFERENCES evidence_articles(pmid) ON DELETE CASCADE,
  target_type    TEXT NOT NULL CHECK (target_type IN ('exercise','protocol','wiki','patient','assessment')),
  target_id      TEXT NOT NULL,
  evidence_level TEXT,
  note           TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_links_org ON evidence_links(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_target ON evidence_links(org_id, target_type, target_id);

ALTER TABLE evidence_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_links_org_isolation ON evidence_links
  USING (org_id::text = current_setting('app.org_id', true));
```

- [ ] **Step 2: Write the down migration**

```sql
-- 0115_evidence_gateway.down.sql
DROP POLICY IF EXISTS evidence_links_org_isolation ON evidence_links;
DROP TABLE IF EXISTS evidence_links;
DROP TABLE IF EXISTS evidence_articles;
```

- [ ] **Step 3: Apply via Neon MCP (preview first)**

Use the Neon MCP `prepare_database_migration` with the up SQL against the dev branch,
verify the tables, then `complete_database_migration`. (Embedding dim 768 matches the
Workers AI embedding model used in `ai-clinical-search.ts` — confirm and adjust if different.)

- [ ] **Step 4: Commit**

```bash
git add apps/api/migrations/0115_evidence_gateway.sql apps/api/migrations/0115_evidence_gateway.down.sql
git commit -m "feat(evidence): migration 0115 evidence_articles + evidence_links (RLS)"
```

---

## Task 7: Cache layer (KV + Neon upsert)

**Files:**
- Create: `apps/api/src/lib/evidence/cache.ts`
- Test: `apps/api/src/lib/evidence/__tests__/cache.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { queryCacheKey, getCachedSearch, setCachedSearch } from "../cache";

describe("queryCacheKey", () => {
  it("is stable regardless of param order", () => {
    const a = queryCacheKey({ q: "knee", limit: 10, sort: "relevance" } as any);
    const b = queryCacheKey({ sort: "relevance", limit: 10, q: "knee" } as any);
    expect(a).toBe(b);
  });
});

describe("KV search cache", () => {
  it("round-trips through KV", async () => {
    const store = new Map<string, string>();
    const kv = {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      put: vi.fn(async (k: string, v: string) => void store.set(k, v)),
    } as any;
    await setCachedSearch(kv, "k1", [{ pmid: "1" } as any]);
    const got = await getCachedSearch(kv, "k1");
    expect(got?.[0].pmid).toBe("1");
  });

  it("returns null without KV binding", async () => {
    expect(await getCachedSearch(undefined, "k")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { KVNamespace } from "@cloudflare/workers-types";
import type { EvidenceArticle, SearchParams } from "./types";

const TTL_SECONDS = 60 * 60 * 12; // 12h

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

/** Upsert artigos no store persistente Neon (pg via getRawSql). */
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
```

> Match the actual `getRawSql` call signature in `apps/api/src/lib/db.ts` when wiring Task 8 — adapt the `sql()` wrapper param style (`$1` vs `?`) accordingly.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/cache.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/cache.ts apps/api/src/lib/evidence/__tests__/cache.test.ts
git commit -m "feat(evidence): KV search cache + Neon article upsert"
```

---

## Task 8: Endpoints + route wiring

**Files:**
- Create: `apps/api/src/routes/evidence.ts`
- Modify: `apps/api/src/types/env.ts` (add `NCBI_API_KEY`, `NCBI_EMAIL`)
- Modify: `apps/api/src/index.ts` (import + register route)
- Test: `apps/api/src/lib/evidence/__tests__/route.test.ts`

- [ ] **Step 1: Add env bindings**

In `apps/api/src/types/env.ts`, inside the `Env` interface add:
```ts
  NCBI_API_KEY?: string;
  NCBI_EMAIL?: string;
```

- [ ] **Step 2: Write the failing route test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../../../routes/evidence";

vi.mock("../sources/pubmed", () => ({
  searchPubmed: vi.fn(async () => [
    { pmid: "1", title: "Knee meta", studyType: "Meta-Analysis", source: "pubmed",
      doi: null, abstract: null, authors: [], journal: null, pubDate: "2024 Jan",
      mesh: [], pmcId: null, oaStatus: "unknown", url: "u" },
  ]),
  buildTerm: () => "knee",
  normalizeSummary: (x: any) => x,
}));

const env = { NCBI_API_KEY: "k", NCBI_EMAIL: "e@x.com" } as any;

describe("GET /evidence/search", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("requires a query", async () => {
    const res = await app.request("/search", {}, env);
    expect(res.status).toBe(400);
  });
  it("returns ranked results for a valid query", async () => {
    const res = await app.request("/search?q=knee+pain", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.data[0].pmid).toBe("1");
  });
});
```

> Note: this test bypasses auth by exercising the handler logic; if `requireAuth` blocks unauthenticated requests in tests, wrap the search handler logic in an exported pure function `runSearch(env, params)` and unit-test that instead, keeping `requireAuth` on the route.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/route.test.ts`
Expected: FAIL — module `routes/evidence` not found.

- [ ] **Step 4: Write the route**

```ts
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

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

export async function runSearch(env: Env, raw: Record<string, string>) {
  const params = SearchParamsSchema.parse(raw);
  const key = queryCacheKey(params);
  const cached = await getCachedSearch(env.FISIOFLOW_CONFIG, key);
  if (cached) return { count: cached.length, data: cached, cached: true };
  const articles = await searchPubmed(env, params);
  const ranked = rankArticles(articles, params.q);
  await setCachedSearch(env.FISIOFLOW_CONFIG, key, ranked);
  try {
    const sql = getRawSql(env);
    await upsertArticles((q, p) => sql(q, p as any[]), ranked);
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
  const sql = getRawSql(c.env);
  const rows = (await sql(`SELECT pmc_id FROM evidence_articles WHERE pmid = $1`, [pmid])) as any[];
  const pmcId = rows?.[0]?.pmc_id ?? null;
  const text = await fetchOpenAccessFullText(pmcId);
  if (!text) return c.json({ available: false, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
  return c.json({ available: true, source: "europepmc", text });
});

app.post("/summarize", requireAuth, async (c) => {
  const body = SummarizeBodySchema.parse(await c.req.json());
  const sql = getRawSql(c.env);
  const rows = (await sql(
    `SELECT pmid, title, abstract FROM evidence_articles WHERE pmid = ANY($1)`,
    [body.pmids],
  )) as any[];
  const summary = await summarizeArticles(c.env, rows);
  return c.json({ summary });
});

app.post("/save", requireAuth, async (c) => {
  const body = SaveBodySchema.parse(await c.req.json());
  const user = c.get("user");
  const sql = getRawSql(c.env);
  await sql(
    `INSERT INTO evidence_links (org_id, article_pmid, target_type, target_id, evidence_level, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [user.orgId, body.pmid, body.targetType, body.targetId, body.evidenceLevel ?? null, body.note ?? null, user.id],
  );
  return c.json({ ok: true });
});

app.get("/library", requireAuth, async (c) => {
  const user = c.get("user");
  const sql = getRawSql(c.env);
  const rows = await sql(
    `SELECT l.*, a.title, a.journal, a.pub_date FROM evidence_links l
     JOIN evidence_articles a ON a.pmid = l.article_pmid
     WHERE l.org_id = $1 ORDER BY l.created_at DESC LIMIT 200`,
    [user.orgId],
  );
  return c.json({ data: rows });
});

export default app;
```

> Confirm `user.orgId` / `user.id` property names against `AuthVariables` in `lib/auth.ts` and adjust. Confirm `getRawSql` signature in `lib/db.ts`.

- [ ] **Step 5: Register the route in `index.ts`**

Add the import near the other route imports and add to the `apiRoutes` array:
```ts
import evidenceRoutes from "./routes/evidence";
// ...
  ["/api/evidence", evidenceRoutes],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Typecheck + commit**

```bash
cd apps/api && npx tsc --noEmit
git add apps/api/src/routes/evidence.ts apps/api/src/types/env.ts apps/api/src/index.ts apps/api/src/lib/evidence/__tests__/route.test.ts
git commit -m "feat(evidence): /api/evidence endpoints (search, fulltext, summarize, save, library)"
```

---

## Task 9: AI summary via registry (PT-BR)

**Files:**
- Create: `apps/api/src/lib/evidence/summarize.ts`
- Test: `apps/api/src/lib/evidence/__tests__/summarize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { buildSummaryPrompt, summarizeArticles } from "../summarize";

describe("buildSummaryPrompt", () => {
  it("includes titles and asks for PT-BR + evidence level", () => {
    const prompt = buildSummaryPrompt([{ pmid: "1", title: "Knee OA exercise", abstract: "abc" }]);
    expect(prompt).toContain("Knee OA exercise");
    expect(prompt.toLowerCase()).toContain("português");
    expect(prompt.toLowerCase()).toContain("nível de evidência");
  });
});

describe("summarizeArticles", () => {
  it("calls Workers AI and returns the response text", async () => {
    const env = { AI: { run: vi.fn(async () => ({ response: "Resumo PT-BR" })) } } as any;
    const out = await summarizeArticles(env, [{ pmid: "1", title: "t", abstract: "a" }]);
    expect(out).toBe("Resumo PT-BR");
    expect(env.AI.run).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/summarize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Env } from "../../types/env";
import { WORKERS_AI_MODELS } from "../workersAi";

type ArticleLite = { pmid: string; title: string; abstract: string | null };

export function buildSummaryPrompt(articles: ArticleLite[]): string {
  const list = articles
    .map((a, i) => `${i + 1}. [PMID ${a.pmid}] ${a.title}\n${a.abstract ?? "(sem abstract)"}`)
    .join("\n\n");
  return [
    "Você é um assistente de evidência clínica para fisioterapeutas.",
    "Resuma os artigos abaixo em português (PT-BR), de forma objetiva.",
    "Para cada artigo dê: achado principal, aplicação clínica e o nível de evidência (ex.: meta-análise, RCT, coorte).",
    "Não invente dados que não estejam no texto.",
    "",
    list,
  ].join("\n");
}

export async function summarizeArticles(env: Env, articles: ArticleLite[]): Promise<string> {
  const prompt = buildSummaryPrompt(articles);
  const model = WORKERS_AI_MODELS.TEXT_GENERATION_FAST ?? WORKERS_AI_MODELS.TEXT_GENERATION;
  const res: any = await env.AI.run(model, {
    messages: [{ role: "user", content: prompt }],
  });
  return res?.response ?? res?.result?.response ?? "";
}
```

> Confirm the exact key names in `WORKERS_AI_MODELS` (registry) and adjust `model` lookup. Route summaries through AI Gateway if a gateway id is configured in env.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/evidence/__tests__/summarize.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/evidence/summarize.ts apps/api/src/lib/evidence/__tests__/summarize.test.ts
git commit -m "feat(evidence): PT-BR AI summary via Workers AI registry"
```

---

## Task 10: Full-suite run + manual smoke

**Files:** none (verification)

- [ ] **Step 1: Run the whole evidence test suite**

Run: `cd apps/api && npx vitest run src/lib/evidence`
Expected: PASS — all files green.

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/api && npx tsc --noEmit && npx oxlint src/lib/evidence src/routes/evidence.ts`
Expected: 0 errors.

- [ ] **Step 3: Local smoke against real NCBI (optional, needs secrets)**

Run `pnpm workers:dev`, then:
```bash
curl -s "http://localhost:8787/api/evidence/search?q=anterior+cruciate+ligament+rehabilitation&limit=5" \
  -H "Authorization: Bearer <dev-jwt>" | jq '.count, .data[0].title'
```
Expected: a count > 0 and a real article title. Re-run to confirm `cached: true`.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "test(evidence): full suite green + smoke verified"
```

---

## Self-Review Notes (addressed)
- **Spec coverage:** search/article/fulltext/summarize/save/library endpoints ✓; PubMed + Europe PMC adapters ✓; ranking ✓; KV+Neon cache ✓; rate limiting ✓; AI summary PT-BR via registry ✓; migration 0115 + down + RLS ✓; security/secrets ✓ (Task 0). Embeddings/pgvector (`embed.ts`) and Analytics logging are **deferred to the follow-on plan** (not needed for a working searchable gateway) — noted here to avoid scope creep; `embedding` column exists in 0115 so no migration rework later.
- **Follow-on plans (separate):** Fase 2 UI surfaces (assistant panel → exercise tab → wiki import → patient suggestions); Fase 3 MCP remote server on Workers; embeddings + Browser Rendering Tier-3 full-text.
- **Type consistency:** `EvidenceArticle`, `SearchParams`, `runSearch`, `searchPubmed`, `rankArticles`, `queryCacheKey`, `summarizeArticles` used consistently across tasks.
- **Verify-against-codebase flags:** `getRawSql` signature, `AuthVariables` user property names (`orgId`/`id`), `WORKERS_AI_MODELS` key names, embedding vector dim (768) — each task notes the check.
