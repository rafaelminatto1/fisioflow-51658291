# Exercise Difficulty Catalog Plan

## Technical Context
- Production DB: Neon project `purple-union-72678311`, branch `br-dawn-block-acf1bzzv` (protected).  
- Schema: `exercises` table includes `difficulty` (enum‑like text) and content fields (`description`, `tips`, `precautions`).  
- Current distribution: 281 *iniciante*, 83 *intermediario*, 35 *avancado*.  
- All exercises have embeddings; only minor missing content fields identified.

## Phase‑Level Tasks (T011‑T082)

| Task ID | Description | Tool(s) |
|--------|-------------|---------|
| **T011** | Seed audit query: counts, missing content, nullability check. | `neon_run_sql` (read‑only) |
| **T012** | Slug comparison: production vs. seed (`scripts/archive/sync-exercises.sql`). Produce gap report. | `neon_run_sql` + Bash `glob`/`grep` |
| **T021** | Migration prep: generate `.down.sql` to set `difficulty = 'iniciante'` where NULL and ensure NOT NULL constraint (idempotent). | Bash (no tool) |
| **T022** | Run migration on **temporary branch** created via `Neon_create_branch`. Verify `SELECT difficulty FROM exercises WHERE difficulty IS NULL` returns 0 rows. | `Neon_prepare_database_migration`, `Neon_run_sql`, `Neon_complete_database_migration` |
| **T031** | Implement `GET /exercises/catalog` route in `apps/api/src/routes/exercises.ts`. Return grouped JSON with counts, cache KV entry. | Hono route, Cloudflare KV |
| **T032** | Add UI badge component (React/TS) and counters; wire to new endpoint. | Front‑end tooling (not in scope for now) |
| **T041** | Create Cloudflare Workers AI worker to classify missing content fields (description, tips, precautions). | `workersAi.ts` config |
| **T042** | Deploy worker, schedule background job (triggered on DB change) to fill missing fields. | `Neon_worker_queues` / custom script |
| **T051** | Write Vitest test for new endpoint (mock auth, RLS, cache hit/miss). | `vitest` |
| **T061** | Lint & type‑check (`pnpm lint`, `pnpm typecheck`). | `pnpm` |
| **T062** | Ensure CI passes; no console warnings. | CI pipeline |

### Migration & Safety Plan
1. **Create temporary branch** (`neon_create_branch`) for migration testing.  
2. **Apply migration** (`Neon_complete_database_migration`) **only after** manual approval of generated SQL.  
3. **Validate** via `SELECT difficulty FROM exercises WHERE difficulty IS NULL` → 0 rows.  
4. **Cleanup** temporary branch (delete) regardless of approval outcome.

### Spec‑Kit Setup
- Create `.specify/memory/constitution.md` with required gates (schema‑diff gates, review‑required).  
- Document all tasks in `.specify/tasks.md` for traceability.

## Dependencies
- **Cloudflare Workers AI** – for AI‑based content enrichment.  
- **Neon SDK** – for branch/migration operations.  
- **pnpm** – for lint/type‑check.  
- **Vitest** – for unit tests.

## Risks & Mitigations
- **Risk:** Migration could fail on NOT NULL constraint.  
  **Mitigation:** Backfill NULLs with `'iniciante'` first; migration is idempotent.  
- **Risk:** AI worker may hit rate limits.  
  **Mitigation:** Queue jobs with 10 s throttle; dead‑letter for failures.  

--- 

*Prepared for the exercise‑catalog feature – ready for spec approval before implementation.*