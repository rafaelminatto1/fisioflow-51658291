# Exercise Ingestion & Curation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the free, Unlicense `free-exercise-db` into a staging/curation flow so exercises arrive with provenance, get deduplicated, and require professional approval before publishing into the `exercises` library.

**Architecture:** A pure-function mapping/normalization/dedup layer (`lib/exerciseImport/`) + an ingestion service that fetches the public JSON and writes to a new `exercise_import_candidates` table + a curation route (`/api/exercise-import`) to list/approve/reject candidates (approve promotes a candidate into `exercises` with provenance columns). No imported exercise becomes a published/prescribable exercise without explicit approval.

**Tech Stack:** Cloudflare Workers (Hono), TypeScript strict, Neon Postgres + Drizzle, Vitest.

**Scope note:** This plan covers **Fase B (proveniência/curadoria) + Fase C (ingestão free-exercise-db)** + the **Fase A security quick-win** (remove hardcoded wger token). It produces working, testable software on its own. Dedup across wger/wrkout, MeSH↔CID-10 mapping, evidence-graph linking, UI surfaces, and the FisioFlow MCP are follow-on plans. Builds on the merged Evidence Gateway branch (PR #136).

**Source data:** `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json` (Unlicense). Record shape: `{ id, name, force, level, mechanic, equipment, primaryMuscles[], secondaryMuscles[], instructions[], category, images[] }`. Image path base: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<image>`.

---

## Cloudflare AI Architecture (decisão — aplicar nas tasks)

The repo already wires the full Cloudflare AI stack — use it, don't reinvent:
- **AI Gateway**: `runAi(env, model, input, opts?)` in `apps/api/src/lib/ai-native.ts` routes every
  Workers AI call through gateway `fisioflow-gateway` (caching, observability, multi-provider).
  **All AI calls in this plan (embeddings) MUST go through `runAi`, never `env.AI.run` directly.**
- **Embedding standardization**: model registry has `embeddings_bge_m3` (`@cf/baai/bge-m3`, **1024d**,
  current) and `embeddings_bge_base` (768d, legacy). `evidence_articles.embedding` is already
  `vector(1024)`. `exercises.embedding` is legacy `vector(768)`. **Standardize on bge-m3 1024d**
  (Task 7c migrates the column) so exercise↔article cross-entity semantic search shares one space.
- **Structured + filtered semantic search** (hard clinical filters: contraindication / equipment /
  CID-10 / level) → **pgvector in Neon** (already used in `ai-clinical-search.ts`). This is the safe
  clinical retrieval path; hard filters live in SQL alongside the vector distance.
- **Conversational RAG with citations** (wiki pages, article summaries, protocols as prose) →
  **Cloudflare AI Search (AutoRAG)** over an R2 corpus, via the existing `AI_SEARCH` binding
  (`env.AI.autorag("fisioflow-rag").aiSearch({ query, model })`). **Designed as a follow-on plan**
  (needs R2 corpus sync + dashboard config; not unit-testable here) — see "Deferred" below.
- **Vectorize**: managed internally by AI Search. Do NOT stand up a separate manual Vectorize index
  now (YAGNI) — pgvector covers structured search, AI Search covers RAG.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/api/migrations/0116_exercise_provenance_curation.sql` (+`.down.sql`) | Provenance columns on `exercises` + `exercise_import_candidates` table |
| `apps/api/src/lib/exerciseImport/types.ts` | Zod schema for source record + `ExerciseCandidate` type |
| `apps/api/src/lib/exerciseImport/normalize.ts` | `normalizeName`, `dedupKey` (pure) |
| `apps/api/src/lib/exerciseImport/mapFreeExerciseDb.ts` | Map source record → `ExerciseCandidate` (pure) |
| `apps/api/src/lib/exerciseImport/ingest.ts` | Fetch JSON + map + dedup + insert candidates |
| `apps/api/src/routes/exercise-import.ts` | `/api/exercise-import` endpoints (ingest/list/approve/reject) |
| `apps/api/src/lib/exerciseImport/__tests__/*.test.ts` | Unit/integration tests |
| `apps/api/src/routes/wger.ts` | Remove hardcoded WGER token (security) |

---

## Task 1: Security quick-win — remove hardcoded wger token

**Files:**
- Modify: `apps/api/src/routes/wger.ts`

- [ ] **Step 1: Inspect current usages**

Run: `grep -n "66adb1c51d3e09cddea5b40b107d55093e852a98\|WGER_TOKEN\|WGER_API_TOKEN" apps/api/src/routes/wger.ts`
Expected: two `const WGER_TOKEN = env.WGER_API_TOKEN || "66adb..."` lines.

- [ ] **Step 2: Replace both with secret-only access**

Change each occurrence:
```ts
const WGER_TOKEN = env.WGER_API_TOKEN;
if (!WGER_TOKEN) return c.json({ error: "Integração wger não configurada" }, 503);
```
(Remove the hardcoded fallback string entirely, in BOTH the `/search` and `/enrich` handlers.)

- [ ] **Step 3: Ensure `WGER_API_TOKEN` is typed on Env**

In `apps/api/src/types/env.ts`, confirm `WGER_API_TOKEN?: string;` exists in the `Env` interface; add it if missing.

- [ ] **Step 4: Typecheck**

Run: `cd apps/api && npx tsc --noEmit 2>&1 | grep -E "wger|env.ts" || echo "no new errors in touched files"`
Expected: no new errors in `wger.ts` / `env.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/wger.ts apps/api/src/types/env.ts
git commit -m "fix(security): remove hardcoded wger token, require WGER_API_TOKEN secret"
```

---

## Task 2: Migration 0116 — provenance + candidates

**Files:**
- Create: `apps/api/migrations/0116_exercise_provenance_curation.sql`
- Create: `apps/api/migrations/0116_exercise_provenance_curation.down.sql`

- [ ] **Step 1: Write the up migration**

```sql
-- 0116_exercise_provenance_curation.sql
-- Proveniência em exercises + tabela de candidatos de importação (staging/curadoria).

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source_license TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS exercise_import_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key       TEXT NOT NULL,
  source          TEXT NOT NULL,
  source_id       TEXT,
  source_url      TEXT,
  source_license  TEXT,
  name            TEXT NOT NULL,
  name_en         TEXT,
  difficulty      TEXT,
  muscles_primary TEXT[] NOT NULL DEFAULT '{}',
  muscles_secondary TEXT[] NOT NULL DEFAULT '{}',
  equipment       TEXT[] NOT NULL DEFAULT '{}',
  body_parts      TEXT[] NOT NULL DEFAULT '{}',
  instructions    TEXT,
  category        TEXT,
  image_urls      TEXT[] NOT NULL DEFAULT '{}',
  raw             JSONB,
  status          TEXT NOT NULL DEFAULT 'pending',
  promoted_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  CONSTRAINT exercise_import_candidates_status_chk
    CHECK (status IN ('pending','approved','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_import_candidates_source
  ON exercise_import_candidates(source, source_id);
CREATE INDEX IF NOT EXISTS idx_import_candidates_status
  ON exercise_import_candidates(status);
CREATE INDEX IF NOT EXISTS idx_import_candidates_dedup
  ON exercise_import_candidates(dedup_key);
```

- [ ] **Step 2: Write the down migration**

```sql
-- 0116_exercise_provenance_curation.down.sql
DROP TABLE IF EXISTS exercise_import_candidates;
ALTER TABLE exercises DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE exercises DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE exercises DROP COLUMN IF EXISTS review_status;
ALTER TABLE exercises DROP COLUMN IF EXISTS source_license;
ALTER TABLE exercises DROP COLUMN IF EXISTS source_url;
ALTER TABLE exercises DROP COLUMN IF EXISTS source_id;
ALTER TABLE exercises DROP COLUMN IF EXISTS source;
```

- [ ] **Step 3: Apply via Neon MCP (preview first)**

Use Neon MCP `prepare_database_migration` with the up SQL on a dev branch, verify the table/columns exist, then `complete_database_migration`. Note: existing rows get `review_status='approved'` (back-compat — current library stays published).

- [ ] **Step 4: Commit**

```bash
git add apps/api/migrations/0116_exercise_provenance_curation.sql apps/api/migrations/0116_exercise_provenance_curation.down.sql
git commit -m "feat(exercise-import): migration 0116 provenance columns + candidates table"
```

---

## Task 3: Source record schema + candidate type

**Files:**
- Create: `apps/api/src/lib/exerciseImport/types.ts`
- Test: `apps/api/src/lib/exerciseImport/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { FreeExerciseDbRecordSchema } from "../types";

describe("FreeExerciseDbRecordSchema", () => {
  it("parses a complete record", () => {
    const rec = FreeExerciseDbRecordSchema.parse({
      id: "Bench_Press", name: "Bench Press", level: "intermediate",
      equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"],
      instructions: ["Lie down", "Press up"], category: "strength",
      images: ["Bench_Press/0.jpg"], force: "push", mechanic: "compound",
    });
    expect(rec.name).toBe("Bench Press");
    expect(rec.primaryMuscles).toEqual(["chest"]);
  });
  it("defaults missing arrays to empty", () => {
    const rec = FreeExerciseDbRecordSchema.parse({ id: "x", name: "X", level: "beginner" });
    expect(rec.primaryMuscles).toEqual([]);
    expect(rec.images).toEqual([]);
    expect(rec.instructions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/types.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { z } from "zod";

export const FreeExerciseDbRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  force: z.string().nullable().optional(),
  level: z.string().optional(),
  mechanic: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  primaryMuscles: z.array(z.string()).default([]),
  secondaryMuscles: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  category: z.string().optional(),
  images: z.array(z.string()).default([]),
});

export type FreeExerciseDbRecord = z.infer<typeof FreeExerciseDbRecordSchema>;

export interface ExerciseCandidate {
  dedupKey: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  sourceLicense: string;
  name: string;
  nameEn: string;
  difficulty: "iniciante" | "intermediario" | "avancado" | null;
  musclesPrimary: string[];
  musclesSecondary: string[];
  equipment: string[];
  bodyParts: string[];
  instructions: string;
  category: string | null;
  imageUrls: string[];
  raw: unknown;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/exerciseImport/types.ts apps/api/src/lib/exerciseImport/__tests__/types.test.ts
git commit -m "feat(exercise-import): source record schema + candidate type"
```

---

## Task 4: Normalization + dedup key

**Files:**
- Create: `apps/api/src/lib/exerciseImport/normalize.ts`
- Test: `apps/api/src/lib/exerciseImport/__tests__/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeName, dedupKey } from "../normalize";

describe("normalizeName", () => {
  it("lowercases, trims, strips accents, collapses spaces", () => {
    expect(normalizeName("  Agachamento   Búlgaro ")).toBe("agachamento bulgaro");
  });
});

describe("dedupKey", () => {
  it("is order-independent for muscles and equipment", () => {
    const a = dedupKey("Bench Press", ["chest", "triceps"], ["barbell"]);
    const b = dedupKey("bench  press", ["triceps", "chest"], ["barbell"]);
    expect(a).toBe(b);
  });
  it("differs when primary muscle differs", () => {
    const a = dedupKey("Row", ["back"], ["barbell"]);
    const b = dedupKey("Row", ["biceps"], ["barbell"]);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/normalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function dedupKey(name: string, primaryMuscles: string[], equipment: string[]): string {
  const muscles = [...primaryMuscles].map((m) => m.toLowerCase().trim()).sort().join(",");
  const equip = [...equipment].map((e) => e.toLowerCase().trim()).sort().join(",");
  return `${normalizeName(name)}|${muscles}|${equip}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/normalize.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/exerciseImport/normalize.ts apps/api/src/lib/exerciseImport/__tests__/normalize.test.ts
git commit -m "feat(exercise-import): name normalization + dedup key"
```

---

## Task 5: Map source record → candidate

**Files:**
- Create: `apps/api/src/lib/exerciseImport/mapFreeExerciseDb.ts`
- Test: `apps/api/src/lib/exerciseImport/__tests__/mapFreeExerciseDb.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { mapFreeExerciseDb } from "../mapFreeExerciseDb";

describe("mapFreeExerciseDb", () => {
  it("maps a record to a candidate with provenance and difficulty", () => {
    const c = mapFreeExerciseDb({
      id: "Bench_Press", name: "Bench Press", level: "expert",
      equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"],
      instructions: ["Lie down", "Press up"], category: "strength",
      images: ["Bench_Press/0.jpg"],
    });
    expect(c.source).toBe("free-exercise-db");
    expect(c.sourceId).toBe("Bench_Press");
    expect(c.sourceLicense).toBe("Unlicense");
    expect(c.difficulty).toBe("avancado");
    expect(c.nameEn).toBe("Bench Press");
    expect(c.equipment).toEqual(["barbell"]);
    expect(c.instructions).toContain("Lie down");
    expect(c.imageUrls[0]).toContain("free-exercise-db/main/exercises/Bench_Press/0.jpg");
    expect(c.dedupKey).toBe("bench press|chest|barbell");
  });
  it("maps beginner/intermediate and null equipment", () => {
    const c = mapFreeExerciseDb({ id: "x", name: "X", level: "beginner", primaryMuscles: [], secondaryMuscles: [], instructions: [], images: [] });
    expect(c.difficulty).toBe("iniciante");
    expect(c.equipment).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/mapFreeExerciseDb.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { FreeExerciseDbRecordSchema, type ExerciseCandidate } from "./types";
import { dedupKey } from "./normalize";

const RAW_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const REPO_URL = "https://github.com/yuhonas/free-exercise-db";

const LEVEL_MAP: Record<string, ExerciseCandidate["difficulty"]> = {
  beginner: "iniciante",
  intermediate: "intermediario",
  expert: "avancado",
};

export function mapFreeExerciseDb(input: unknown): ExerciseCandidate {
  const rec = FreeExerciseDbRecordSchema.parse(input);
  const equipment = rec.equipment ? [rec.equipment] : [];
  return {
    dedupKey: dedupKey(rec.name, rec.primaryMuscles, equipment),
    source: "free-exercise-db",
    sourceId: rec.id,
    sourceUrl: `${REPO_URL}/blob/main/exercises/${rec.id}/exercise.json`,
    sourceLicense: "Unlicense",
    name: rec.name,
    nameEn: rec.name,
    difficulty: rec.level ? LEVEL_MAP[rec.level] ?? null : null,
    musclesPrimary: rec.primaryMuscles,
    musclesSecondary: rec.secondaryMuscles,
    equipment,
    bodyParts: rec.primaryMuscles,
    instructions: rec.instructions.join("\n"),
    category: rec.category ?? null,
    imageUrls: rec.images.map((img) => `${RAW_BASE}/${img}`),
    raw: rec,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/mapFreeExerciseDb.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/exerciseImport/mapFreeExerciseDb.ts apps/api/src/lib/exerciseImport/__tests__/mapFreeExerciseDb.test.ts
git commit -m "feat(exercise-import): map free-exercise-db record to candidate"
```

---

## Task 6: Ingestion service (fetch + map + dedup + insert)

**Files:**
- Create: `apps/api/src/lib/exerciseImport/ingest.ts`
- Test: `apps/api/src/lib/exerciseImport/__tests__/ingest.test.ts`

The service: fetches the JSON array, maps each record, drops in-batch duplicates by `dedupKey`, and upserts candidates (idempotent via `(source, source_id)` unique index). DB access via an injected `sql` runner so it is unit-testable.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ingestFreeExerciseDb } from "../ingest";

const sample = [
  { id: "A", name: "Bench Press", level: "beginner", equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: [], instructions: ["x"], category: "strength", images: [] },
  { id: "A", name: "Bench Press", level: "beginner", equipment: "barbell", primaryMuscles: ["chest"], secondaryMuscles: [], instructions: ["x"], category: "strength", images: [] },
  { id: "B", name: "Squat", level: "expert", equipment: "barbell", primaryMuscles: ["quadriceps"], secondaryMuscles: [], instructions: ["y"], category: "strength", images: [] },
];

describe("ingestFreeExerciseDb", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("fetches, dedupes by source id, and inserts each unique candidate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 })));
    const inserted: string[] = [];
    const sql = vi.fn(async (_q: string, params?: unknown[]) => {
      if (params) inserted.push(String(params[1])); // source_id position
      return { rows: [] };
    });
    const result = await ingestFreeExerciseDb(sql as any);
    expect(result.fetched).toBe(3);
    expect(result.inserted).toBe(2); // A deduped
    expect(inserted.sort()).toEqual(["A", "B"]);
  });
  it("throws when the source fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(ingestFreeExerciseDb((async () => ({ rows: [] })) as any)).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/ingest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { mapFreeExerciseDb } from "./mapFreeExerciseDb";
import type { ExerciseCandidate } from "./types";

const SOURCE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

type Sql = (q: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;

export async function ingestFreeExerciseDb(sql: Sql): Promise<{ fetched: number; inserted: number }> {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`free-exercise-db fetch failed: ${res.status}`);
  const data = (await res.json()) as unknown[];

  const seen = new Set<string>();
  const candidates: ExerciseCandidate[] = [];
  for (const rec of data) {
    const c = mapFreeExerciseDb(rec);
    if (seen.has(c.sourceId)) continue;
    seen.add(c.sourceId);
    candidates.push(c);
  }

  for (const c of candidates) {
    await sql(
      `INSERT INTO exercise_import_candidates
         (dedup_key, source, source_id, source_url, source_license, name, name_en, difficulty,
          muscles_primary, muscles_secondary, equipment, body_parts, instructions, category, image_urls, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (source, source_id) DO NOTHING`,
      [
        c.dedupKey, c.source, c.sourceId, c.sourceUrl, c.sourceLicense, c.name, c.nameEn, c.difficulty,
        c.musclesPrimary, c.musclesSecondary, c.equipment, c.bodyParts, c.instructions, c.category,
        c.imageUrls, JSON.stringify(c.raw),
      ],
    );
  }
  return { fetched: data.length, inserted: candidates.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/ingest.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/exerciseImport/ingest.ts apps/api/src/lib/exerciseImport/__tests__/ingest.test.ts
git commit -m "feat(exercise-import): ingestion service (fetch+map+dedup+insert)"
```

---

## Task 7: Curation route (ingest / list / approve / reject)

**Files:**
- Create: `apps/api/src/routes/exercise-import.ts`
- Modify: `apps/api/src/index.ts` (register route)
- Test: `apps/api/src/lib/exerciseImport/__tests__/promote.test.ts`

The route exposes admin-only ingestion plus curation. Approval promotes a candidate into `exercises` with `review_status='approved'` + provenance, then marks the candidate `approved`. The promotion SQL builder is extracted as a pure function for testing.

> **DB/auth conventions (verified):** `const sql = getRawSql(c.env, "read"|"write")` (import `{ getRawSql } from "../lib/db"`); positional params are passed as a single array — `sql(text, [p1, p2])`; results return `{ rows }`. Auth: `import { requireAuth } from "../lib/auth"; import type { AuthVariables } from "../lib/auth";`. User shape: `{ uid, organizationId, role }`. Restrict ingest/approve to admins by checking `c.get("user").role === "admin"` (return 403 otherwise).

- [ ] **Step 1: Write the failing test (pure promotion builder)**

```ts
import { describe, it, expect } from "vitest";
import { buildPromoteInsert } from "../../../routes/exercise-import";

describe("buildPromoteInsert", () => {
  it("builds insert params from a candidate row with provenance + approved status", () => {
    const candidate = {
      name: "Supino", name_en: "Bench Press", difficulty: "avancado",
      muscles_primary: ["chest"], muscles_secondary: ["triceps"], equipment: ["barbell"],
      body_parts: ["chest"], instructions: "Deite e empurre", category: "strength",
      image_urls: ["http://img/0.jpg"], source: "free-exercise-db",
      source_id: "Bench_Press", source_url: "http://repo", source_license: "Unlicense",
    };
    const { params } = buildPromoteInsert(candidate as any, "user-123");
    expect(params).toContain("Supino");
    expect(params).toContain("free-exercise-db");
    expect(params).toContain("approved");
    expect(params).toContain("user-123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/promote.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

```ts
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { requireAuth } from "../lib/auth";
import { getRawSql } from "../lib/db";
import { ingestFreeExerciseDb } from "../lib/exerciseImport/ingest";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

interface CandidateRow {
  name: string; name_en: string | null; difficulty: string | null;
  muscles_primary: string[]; muscles_secondary: string[]; equipment: string[];
  body_parts: string[]; instructions: string | null; category: string | null;
  image_urls: string[]; source: string; source_id: string | null;
  source_url: string | null; source_license: string | null;
}

export function buildPromoteInsert(c: CandidateRow, reviewerUid: string): { text: string; params: unknown[] } {
  return {
    text: `INSERT INTO exercises
      (name, name_en, difficulty, muscles_primary, muscles_secondary, equipment, body_parts,
       instructions, image_url, is_public, review_status, source, source_id, source_url, source_license,
       reviewed_by, reviewed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,'approved',$10,$11,$12,$13,$14, now())
      RETURNING id`,
    params: [
      c.name, c.name_en, c.difficulty, c.muscles_primary, c.muscles_secondary, c.equipment,
      c.body_parts, c.instructions, c.image_urls?.[0] ?? null, c.source, c.source_id,
      c.source_url, c.source_license, reviewerUid, "approved",
    ].filter((_, i) => i !== 14), // keep params positional; 'approved' is inline in text
  };
}

function requireAdmin(role?: string): boolean {
  return role === "admin";
}

app.post("/ingest", requireAuth, async (c) => {
  if (!requireAdmin(c.get("user").role)) return c.json({ error: "Apenas admin" }, 403);
  const sql = getRawSql(c.env, "write");
  const result = await ingestFreeExerciseDb((q, p) => sql(q, p));
  return c.json(result);
});

app.get("/candidates", requireAuth, async (c) => {
  const status = z.enum(["pending", "approved", "rejected"]).catch("pending").parse(c.req.query("status"));
  const sql = getRawSql(c.env, "read");
  const res = await sql(
    `SELECT * FROM exercise_import_candidates WHERE status = $1 ORDER BY created_at DESC LIMIT 200`,
    [status],
  );
  return c.json({ data: res.rows ?? [] });
});

app.post("/candidates/:id/approve", requireAuth, async (c) => {
  const user = c.get("user");
  if (!requireAdmin(user.role)) return c.json({ error: "Apenas admin" }, 403);
  const id = c.req.param("id");
  const sql = getRawSql(c.env, "write");
  const found = await sql(`SELECT * FROM exercise_import_candidates WHERE id = $1`, [id]);
  const row = found.rows?.[0] as CandidateRow | undefined;
  if (!row) return c.json({ error: "Candidato não encontrado" }, 404);
  const ins = buildPromoteInsert(row, user.uid);
  const created = await sql(ins.text, ins.params);
  const newId = (created.rows?.[0] as { id: string })?.id;
  await sql(
    `UPDATE exercise_import_candidates
       SET status='approved', reviewed_by=$1, reviewed_at=now(), promoted_exercise_id=$2 WHERE id=$3`,
    [user.uid, newId, id],
  );
  return c.json({ ok: true, exerciseId: newId });
});

app.post("/candidates/:id/reject", requireAuth, async (c) => {
  const user = c.get("user");
  if (!requireAdmin(user.role)) return c.json({ error: "Apenas admin" }, 403);
  const id = c.req.param("id");
  const sql = getRawSql(c.env, "write");
  await sql(
    `UPDATE exercise_import_candidates SET status='rejected', reviewed_by=$1, reviewed_at=now() WHERE id=$2`,
    [user.uid, id],
  );
  return c.json({ ok: true });
});

export default app;
```

> **NOTE on `buildPromoteInsert`:** the `.filter(... i !== 14)` trick above is fragile. Implement it cleanly instead: put exactly the 14 positional params in the array (no inline 15th), and keep `'approved'` inline in the SQL text as shown (`review_status` is the literal `'approved'`). The test only asserts the array CONTAINS `"approved"`, `"user-123"`, etc. — so include `'approved'` as an explicit element ONLY if you also add a `$15` placeholder. Pick ONE: (a) inline `'approved'` in text + 14 params (then the test's `expect(params).toContain("approved")` fails) OR (b) `$15` placeholder + `'approved'` in params. **Choose (b)**: add `review_status` as `$15` placeholder and include `"approved"` in params; drop the `.filter`. Make the test and code consistent.

- [ ] **Step 4: Register route in `index.ts`**

Add import near other route imports: `import exerciseImportRoutes from "./routes/exercise-import";`
Add to the `apiRoutes` array: `["/api/exercise-import", exerciseImportRoutes],`

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/promote.test.ts`
Expected: PASS (1 test). Adjust per the note above so code + test agree.

- [ ] **Step 6: Typecheck + commit**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep -E "exercise-import|exerciseImport" || echo "no new errors in touched files"
git add apps/api/src/routes/exercise-import.ts apps/api/src/index.ts apps/api/src/lib/exerciseImport/__tests__/promote.test.ts
git commit -m "feat(exercise-import): curation route (ingest/list/approve/reject)"
```

---

## Task 7c: Migration 0117 — standardize exercises.embedding to 1024d

**Files:**
- Create: `apps/api/migrations/0117_exercises_embedding_1024.sql`
- Create: `apps/api/migrations/0117_exercises_embedding_1024.down.sql`
- Modify: `packages/db/src/schema/exercises.ts` (vector dim 768 → 1024)

> **Destructive note:** existing `exercises.embedding` values are 768d (legacy bge-base) and
> incompatible with 1024d. They are dropped and must be re-generated (new approvals embed via
> Task 7b; a backfill of the existing ~248 exercises is a deferred follow-on). Confirm with the
> team before applying in prod.

- [ ] **Step 1: Write the up migration**

```sql
-- 0117_exercises_embedding_1024.sql
-- Padroniza exercises.embedding em 1024d (bge-m3), alinhando com evidence_articles.
ALTER TABLE exercises DROP COLUMN IF EXISTS embedding;
ALTER TABLE exercises ADD COLUMN embedding vector(1024);
```

- [ ] **Step 2: Write the down migration**

```sql
-- 0117_exercises_embedding_1024.down.sql
ALTER TABLE exercises DROP COLUMN IF EXISTS embedding;
ALTER TABLE exercises ADD COLUMN embedding vector(768);
```

- [ ] **Step 3: Update Drizzle schema**

In `packages/db/src/schema/exercises.ts`, change the `vector` customType `dataType()` return
from `"vector(768)"` to `"vector(1024)"`.

- [ ] **Step 4: Apply via Neon MCP (preview first)**

`prepare_database_migration` on a dev branch → verify `\d exercises` shows `embedding vector(1024)`
→ `complete_database_migration`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/migrations/0117_exercises_embedding_1024.sql apps/api/migrations/0117_exercises_embedding_1024.down.sql packages/db/src/schema/exercises.ts
git commit -m "feat(exercise-import): standardize exercises.embedding to 1024d (bge-m3)"
```

---

## Task 7b: Generate embedding via AI Gateway on approval

**Files:**
- Create: `apps/api/src/lib/exerciseImport/embed.ts`
- Modify: `apps/api/src/routes/exercise-import.ts` (embed after promote)
- Test: `apps/api/src/lib/exerciseImport/__tests__/embed.test.ts`

The embedding text combines name + instructions + muscles so semantic search captures clinical
intent. Generation goes through `runAi` (AI Gateway) with bge-m3 (1024d).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { buildEmbeddingText, embedExercise } from "../embed";

describe("buildEmbeddingText", () => {
  it("combines name, muscles and instructions", () => {
    const t = buildEmbeddingText({
      name: "Supino", musclesPrimary: ["peitoral"], instructions: "Deite e empurre",
    });
    expect(t).toContain("Supino");
    expect(t).toContain("peitoral");
    expect(t).toContain("Deite e empurre");
  });
});

describe("embedExercise", () => {
  it("calls runAi with bge-m3 and returns the vector", async () => {
    const runAi = vi.fn(async () => ({ data: [[0.1, 0.2, 0.3]] }));
    const vec = await embedExercise({ name: "X", musclesPrimary: [], instructions: "" }, runAi as any);
    expect(vec).toEqual([0.1, 0.2, 0.3]);
    expect(runAi).toHaveBeenCalled();
    const modelArg = (runAi as any).mock.calls[0][0];
    expect(String(modelArg)).toContain("bge-m3");
  });
  it("returns null when the model yields no data", async () => {
    const runAi = vi.fn(async () => ({ data: [] }));
    const vec = await embedExercise({ name: "X", musclesPrimary: [], instructions: "" }, runAi as any);
    expect(vec).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/embed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { WORKERS_AI_MODELS } from "../workersAi";

type EmbedInput = { name: string; musclesPrimary: string[]; instructions: string };
type RunAi = (model: string, input: unknown) => Promise<{ data?: number[][] }>;

export function buildEmbeddingText(e: EmbedInput): string {
  return [e.name, e.musclesPrimary.join(", "), e.instructions].filter(Boolean).join("\n");
}

export async function embedExercise(e: EmbedInput, runAi: RunAi): Promise<number[] | null> {
  const res = await runAi(WORKERS_AI_MODELS.embeddings_bge_m3, { text: [buildEmbeddingText(e)] });
  return res?.data?.[0] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport/__tests__/embed.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire into approval (best-effort, non-blocking)**

In `apps/api/src/routes/exercise-import.ts`, add the import
`import { runAi } from "../lib/ai-native"; import { embedExercise } from "../lib/exerciseImport/embed";`
and, in the approve handler AFTER the exercise row is created (`newId`), add:
```ts
try {
  const vec = await embedExercise(
    { name: row.name, musclesPrimary: row.muscles_primary ?? [], instructions: row.instructions ?? "" },
    (model, input) => runAi(c.env, model, input),
  );
  if (vec) {
    await sql(`UPDATE exercises SET embedding = $1 WHERE id = $2`, [JSON.stringify(vec), newId]);
  }
} catch (e) {
  console.error("[exercise-import] embedding failed", e);
}
```
(Embedding failure must NOT fail the approval — keep it inside try/catch.)

- [ ] **Step 6: Run the route test from Task 7 still passes**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/exerciseImport/embed.ts apps/api/src/routes/exercise-import.ts apps/api/src/lib/exerciseImport/__tests__/embed.test.ts
git commit -m "feat(exercise-import): embed approved exercises via AI Gateway (bge-m3 1024d)"
```

---

## Task 8: Full-suite run + smoke

**Files:** none (verification)

- [ ] **Step 1: Run the whole exerciseImport suite**

Run: `cd apps/api && npx vitest run src/lib/exerciseImport`
Expected: PASS — all files green.

- [ ] **Step 2: Run full API suite (no regressions)**

Run: `cd apps/api && npx vitest run`
Expected: all pass (note: some pre-existing tests are flaky under heavy load — re-run once if a non-exerciseImport test fails).

- [ ] **Step 3: Lint**

Run: `cd apps/api && npx oxlint src/lib/exerciseImport src/routes/exercise-import.ts`
Expected: 0 errors.

- [ ] **Step 4: Smoke (after migration applied + admin JWT)**

```bash
curl -s -X POST "http://localhost:8787/api/exercise-import/ingest" -H "Authorization: Bearer <admin-jwt>" | jq
curl -s "http://localhost:8787/api/exercise-import/candidates?status=pending" -H "Authorization: Bearer <admin-jwt>" | jq '.data | length'
```
Expected: `{ fetched: ~800, inserted: ~800 }` then a pending count > 0.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "test(exercise-import): full suite green + smoke verified"
```

---

## Self-Review Notes (addressed)
- **Spec coverage (Fase A/B/C):** wger token removed (A) ✓; provenance columns + candidates table (B) ✓; free-exercise-db fetch+map+dedup+insert (C) ✓; curation gate via `review_status` + candidate `status`, approval promotes with `is_public=false` so nothing auto-publishes ✓.
- **Cloudflare AI stack:** all AI via `runAi` (AI Gateway) ✓; embeddings standardized to bge-m3 1024d
  (Task 7c) + generated on approval (Task 7b) into pgvector ✓; AI Search (AutoRAG) RAG corpus is a
  designed follow-on (see below).
- **Deferred (separate plans):** AI Search/AutoRAG RAG corpus over R2 (`fisioflow-rag`) for
  conversational citations; re-embed backfill of existing ~248 exercises; Evidence Gateway
  `summarize.ts`→`runAi` refactor; wrkout/wger cross-dedup; PT-BR AI translation step; MeSH↔CID-10;
  evidence-graph linking (`exercises.references`→`evidence_links`); UI surfaces; FisioFlow MCP.
- **Placeholder scan:** Task 7 `buildPromoteInsert` had a fragile `.filter` — replaced with explicit instruction to use option (b) (`$15` + `"approved"` in params) so code and test agree.
- **Type consistency:** `ExerciseCandidate`, `mapFreeExerciseDb`, `dedupKey`, `ingestFreeExerciseDb`, `buildPromoteInsert`, `CandidateRow` consistent across tasks. `sql(text, [params])` array convention matches the Evidence Gateway plan and verified `db.ts`.
- **Verify-against-codebase flags:** confirm `WGER_API_TOKEN` on Env; confirm `exercises` insert column names match schema (`muscles_primary`, `image_url`, `is_public`, `review_status`, `source*`); confirm admin role string is `"admin"` in this codebase.
```
