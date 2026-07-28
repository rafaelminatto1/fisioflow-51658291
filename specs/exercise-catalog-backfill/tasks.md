# Exercise Catalog Backfill — Tasks

## Phase 1: Migration & Schema (T001-T003)

### T001 — Create migration 0144_slug_canonicalization.sql
- [ ] File: `apps/api/migrations/0144_slug_canonicalization.sql`
- [ ] Normalize slugs: lowercase, unaccent, kebab-case
- [ ] Resolve collisions with numeric suffix
- [ ] File: `apps/api/migrations/0144_slug_canonicalization.down.sql`
- [ ] Restore original slugs from backup
- [ ] Test on temp branch, apply to production

### T002 — Verify exercise_categories table populated
- [ ] Query: `SELECT id, slug, name FROM exercise_categories ORDER BY name`
- [ ] Ensure ≥ 20 categories for AI classification
- [ ] Document valid category list for prompt

### T003 — Add unaccent extension check
- [ ] Verify `CREATE EXTENSION IF NOT EXISTS unaccent` in Neon
- [ ] If not, add to migration 0144

## Phase 2: GET /exercises/catalog Hardening (T010-T012)

### T010 — Verify existing catalog endpoint
- [ ] Confirm `GET /exercises/catalog` at line ~318 in exercises.ts
- [ ] Verify response shape matches spec
- [ ] Verify KV cache key `exercises:v1:catalog`

### T011 — Add contentGaps to catalog response
- [ ] Include exercises missing `category_id` OR `muscles_primary` OR `body_parts`
- [ ] Return `{ missing: string[] }` per gap
- [ ] Update Vitest test

### T012 — Ensure route ordering
- [ ] Confirm `/catalog` defined BEFORE `/:id` catch-all
- [ ] Add integration test for ordering

## Phase 3: POST /exercises/content/backfill (T020-T029)

### T020 — Create endpoint scaffold
- [ ] Route: `POST /exercises/content/backfill`
- [ ] Auth: `requireAuth(c, env, ['admin'])`
- [ ] Body: `{ batchSize?: number, fields?: string[] }`
- [ ] Position: after `/embeddings/backfill`, before `/:id`

### T021 — Implement batch processor
- [ ] Fetch target exercises (active+public)
- [ ] Chunk into batches of `batchSize` (default 20)
- [ ] Process each batch with `Promise.all`
- [ ] Use `executionCtx.waitUntil` for KV purge

### T022 — Build AI prompt helper
- [ ] File: `apps/api/src/lib/exercise-backfill-prompts.ts`
- [ ] Function `buildBackfillPrompt(exercise, fields, categories)`
- [ ] Single comprehensive prompt for all fields
- [ ] Inject valid categories JSON

### T023 — Implement AI call with retry
- [ ] Use `runAi(env.AI, WORKERS_AI_MODELS.llama_3_1_8b, { prompt, max_tokens: 1024, temperature: 0.2 })`
- [ ] Parse JSON response with `readAiText` + `JSON.parse`
- [ ] Retry once with `temperature: 0.1` on parse failure

### T024 — Implement response validation
- [ ] `category_id`: verify exists in `exercise_categories`
- [ ] Arrays: dedupe, lowercase, unaccent, filter known vocab
- [ ] Strings: trim, non-empty
- [ ] Unknown fields: ignore silently

### T025 — Implement Drizzle updates
- [ ] `db.update(exercises).set(parsed).where(eq(exercises.id, ex.id))`
- [ ] Transaction per batch for atomicity
- [ ] Track updated/failed counts

### T026 — Implement logging & response
- [ ] Log: batch progress, errors, sample diffs (max 3)
- [ ] Return `{ data: { updated, failed, samples: [...] } }`
- [ ] Purge KV cache: `env.FISIOFLOW_KV.delete('exercises:v1:catalog')`

### T027 — Slug backfill integration
- [ ] Add `slug` to fields processed
- [ ] Generate slug: `slugify(name)` + collision check
- [ ] Update in same transaction

### T028 — Dry-run mode
- [ ] Query param `?dryRun=true` returns diffs without persisting
- [ ] Useful for admin preview

### T029 — Rate limiting & error handling
- [ ] Catch Workers AI errors (timeout, rate limit)
- [ ] Exponential backoff on retry
- [ ] Continue processing other batches on partial failure

## Phase 4: Tests (T040-T049)

### T040 — Test file scaffold
- [ ] File: `apps/api/src/routes/__tests__/exercises-catalog-backfill.test.ts`
- [ ] Imports: vitest, mocks for pool, auth, KV, AI

### T041 — Test GET /exercises/catalog structure
- [ ] Mock DB return 5 exercises across difficulties
- [ ] Verify response shape: `total`, `byDifficulty`, `contentGaps`
- [ ] Verify category counts per difficulty

### T042 — Test GET /exercises/catalog KV cache
- [ ] Second call returns cached, no DB hit
- [ ] Verify `KV.get` called with correct key

### T043 — Test POST /content/backfill admin only
- [ ] Non-admin → 403
- [ ] Admin → 200

### T044 — Test backfill processes batch
- [ ] Mock `runAi` returns valid JSON
- [ ] Verify Drizzle `update` called with parsed fields
- [ ] Verify updated count = batch size

### T045 — Test backfill handles AI parse failure
- [ ] Mock `runAi` returns invalid JSON
- [ ] Retry once with lower temperature
- [ ] Count as failed if both fail

### T046 — Test backfill validates category_id
- [ ] Mock AI returns invalid category_id
- [ ] Field ignored, not persisted
- [ ] Other fields still updated

### T047 — Test slug generation
- [ ] `slugify('Agachamento Sumô') === 'agachamento-sumo'`
- [ ] Collision: second 'Agachamento Sumô' → 'agachamento-sumo-2'

### T048 — Test dry-run mode
- [ ] `?dryRun=true` returns diffs
- [ ] No DB writes, no KV purge

### T049 — Test contentGaps detection
- [ ] Mock exercises with missing category/muscles/body_parts
- [ ] Verify `contentGaps` array includes correct missing fields

## Phase 5: Quality Gates (T060-T062)

### T060 — Run lint
- [ ] `pnpm lint` passes (no new errors)

### T061 — Run typecheck
- [ ] `pnpm type-check` passes

### T062 — Run Vitest suite
- [ ] `pnpm test` all tests pass

## Phase 6: Deploy & Verify (T070-T072)

### T070 — Deploy to staging
- [ ] `wrangler deploy --env staging`
- [ ] Run backfill on staging branch

### T071 — Verify production data
- [ ] Query: `SELECT COUNT(*) FROM exercises WHERE category_id IS NULL`
- [ ] Query: `SELECT COUNT(*) FROM exercises WHERE slug IS NULL OR slug ~ '[^a-z0-9-]'`
- [ ] Confirm gaps reduced to ~0

### T072 — Monitor Workers AI usage
- [ ] Check dashboard for errors/latency
- [ ] Adjust batch size if needed
