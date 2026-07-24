# Exercise Difficulty Catalog Tasks (T011‑T082)

## T011 – Difficulty Audit Query
- **Command**: `neon_run_sql` (read‑only)
- **SQL**: 
  ```sql
  SELECT
    difficulty,
    count(*) AS total,
    count(*) FILTER (WHERE description IS NULL OR btrim(description) = '') AS missing_desc,
    count(*) FILTER (WHERE tips IS NULL OR btrim(tips) = '') AS missing_tips,
    count(*) FILTER (WHERE precautions IS NULL OR btrim(precautions) = '') AS missing_precautions
  FROM exercises
  WHERE is_active AND is_public
  GROUP BY difficulty
  ORDER BY difficulty;
  ```
- **Output**: CSV with rows for each difficulty level and missing‑field counts.

## T012 – Slug Comparison & Gap Report
- **Step 1**: Extract slugs from seed file: `grep -oE "^\(\'[a-z0-9-]+\'" scripts/archive/sync-exercises.sql | sed "s/^('//" | sort > /tmp/seed_slugs.txt`.
- **Step 2**: Extract slugs from production: `neon_run_sql -q "SELECT slug FROM exercises WHERE is_active AND is_public ORDER BY slug;" > /tmp/prod_slugs.txt`.
- **Step 3**: Compute set differences:
  - ` comm -23 /tmp/prod_slugs.txt /tmp/seed_slugs.txt ` → slugs **present in production but missing from seed**.
  - ` comm -13 /tmp/prod_slugs.txt /tmp/seed_slugs.txt ` → slugs **present in seed but missing from production** (legacy items to retire).
- **Step 4**: Generate report file `reports/production‑vs‑seed‑gap.md` summarizing counts and providing sample slugs.

## T021 – Migration Preparation (SQL)
- **SQL (down)**: 
  ```sql
  ALTER TABLE exercises 
    ALTER COLUMN difficulty TYPE TEXT;  -- ensure we can set default
  UPDATE exercises 
    SET difficulty = 'iniciante' 
    WHERE difficulty IS NULL;
  ALTER TABLE exercises 
    ALTER COLUMN difficulty SET NOT NULL;
  ```
- **Idempotence**: Check `NULL` count before each step; if 0, skip.

## T022 – Migration Execution on Temp Branch
1. `Neon_create_branch --name exercise-difficulty-migration --parent br-dawn-block-acf1bzzv`.
2. Apply migration SQL via `Neon_prepare_database_migration` (pass `migrationSql` and `projectId`).
3. Verify: `SELECT count(*) FROM exercises WHERE difficulty IS NULL;` returns `0`.
4. **Optional**: Run `neon_run_sql` to sanity‑check difficulty distribution still matches target counts.
5. Complete migration with `Neon_complete_database_migration --applyChanges true --migrationId <id> ...`.

## T031 – Catalog Endpoint Implementation
- **File**: `apps/api/src/routes/exercises.ts`.
- **Add route**: `app.get('/catalog', requireAuth, async (c) => { ... })`.
- **Logic**:
  1. Query: 
     ```sql
     SELECT difficulty,
            json_agg(
              json_build_object(
                'id', id,
                'name', name,
                'count', total
              )
            ) AS exercises
     FROM (
       SELECT difficulty,
              count(*) AS total
       FROM exercises
       WHERE is_active AND is_public
       GROUP BY difficulty
     ) sub
     ORDER BY difficulty;
     ```
  2. Cache result in KV (`exercises:v2:catalog`) with TTL 1 h.
  3. Return `{ data: { iniciante: [...], intermediario: [...], avancado: [...] }, meta: { counts: { iniciante: X, intermediario: Y, avancado: Z } } }`.
- **Unit Test**: Add `apps/api/src/__tests__/exercises.catalog.test.ts` using Vitest mocks for auth and KV.

## T032 – UI Badge Component (frontend)
- **Component**: `<DifficultyBadge level="iniciante|intermediario|avancado" />`.
- **Colors**: 
  - `iniciante` → `bg-green-100 text-green-800`
  - `intermediario` → `bg-amber-100 text-amber-800`
  - `avancado` → `bg-red-100 text-red-800`
- **Counter**: after fetching `/exercises/catalog`, display `Iniciante (X) | Intermediário (Y) | Avançado (Z)`.
- **Interaction**: clicking a badge triggers the existing `?difficulty=` filter.

## T041 – AI Background Job (Workers AI)
- **Model selection**: browse registry `context7` or `workersAi.ts` to pin an active text‑generation model (e.g., `@cf/meta/llama-3.1-8b-instruct` – not in `DEPRECATED_MODELS_2026_05_30`).
- **Prompt template** (system): 
  ```
  You are a patient‑centered physiotherapy assistant. 
  Fill in a concise (max 150 words) description, 3 bullet‑point tips, and 2 bullet‑point precautions 
  for the following exercise summary. Use Brazilian Portuguese. 
  If any field already has content, leave it unchanged.
  ```
- **Worker script**: `src/workers/exercise‑enrichment.ts` – called via Queue trigger on DB change events.
- **Throttle**: 10 s between jobs; dead‑letter queue on error.

## T042 – Enrichment Execution
- **Trigger**: after each `INSERT`/`UPDATE` on `exercises`, enqueue job if any of `description`, `tips`, `precautions` is empty.
- **Job payload**: `{ exerciseId, slug }`.
- **Worker logic**: fetch exercise, call AI endpoint with prompt, write back fields via `Neon_run_sql` transaction (single `UPDATE exercises SET ... WHERE id = $1`).

## T051 – Endpoint Test
- **File**: `apps/api/src/__tests__/exercises.catalog.test.ts`.
- **Mock**: `c.get('user')` returns a dummy auth token; KV mocked to return cached payload.
- **Assertions**: 
  - Status 200, JSON shape matches expected, counts equal database aggregates.
  - Cache hit logic returns same payload on second call.

## T052 – Lint & Type‑Check
- Run `pnpm lint` (Biome config from `biome.json`).  
- Run `pnpm typecheck` (tsc `--noEmit`).  

## T061 – CI Gate
- Ensure all new files are imported correctly, no console warnings, and `npm run test` passes.

--- 

All tasks are independent and can be executed in parallel after the spec approval.