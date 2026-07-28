# Exercise Catalog Backfill — Technical Plan

## Architecture Overview
- **API**: Cloudflare Workers (Hono) — `apps/api/src/routes/exercises.ts`
- **DB**: Neon Postgres 17 + Drizzle ORM
- **AI**: Workers AI `@cf/meta/llama-3.1-8b-instruct` via `WORKERS_AI_MODELS.llama_3_1_8b`
- **Cache**: KV `FISIOFLOW_KV` key `exercises:v1:catalog`
- **Auth**: Neon Auth JWT, admin check via `requireAuth(c, env, ['admin'])`

## Implementation Phases

### Phase 1 — Core Endpoints (P0)
1. **GET /exercises/catalog** — already implemented (T031), verify and harden
2. **POST /exercises/content/backfill** — extend existing to cover new fields
3. **Slug normalization job** — migration + one-time script

### Phase 2 — AI Backfill Logic (P0)
4. Prompt templates for each field group
5. Batch processor with `waitUntil` and error handling
6. JSON parsing with validation/fallback

### Phase 3 — Tests & Quality (P1)
7. Vitest unit tests (mock pool, auth, KV, AI)
8. Integration test (staging branch)
9. Lint + typecheck

## Technical Details

### Files to Modify
| File | Purpose |
|---|---|
| `apps/api/src/routes/exercises.ts` | Add backfill endpoint, extend catalog |
| `apps/api/src/lib/ai-native.ts` | Helper for JSON-only AI responses |
| `apps/api/migrations/0144_slug_canonicalization.sql` | Normalize slugs |
| `apps/api/src/routes/__tests__/exercises-catalog-backfill.test.ts` | Tests |

### Database Migrations
```sql
-- 0144_slug_canonicalization.sql
-- Normalize existing slugs
UPDATE exercises
SET slug = lower(regexp_replace(unaccent(name), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug ~ '[^a-z0-9-]';

-- Resolve collisions
WITH numbered AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM exercises
)
UPDATE exercises e
SET slug = n.slug || '-' || n.rn
FROM numbered n
WHERE e.id = n.id AND n.rn > 1;
```

### AI Prompt Strategy
Single comprehensive prompt per exercise (reduces API calls):
```typescript
const BACKFILL_PROMPT = `
Você é um especialista em fisioterapia. Preencha JSON para o exercício.
Retorne SOMENTE JSON válido.

Exercício: {{name}}
Categoria: {{category?.name || 'nenhuma'}}
Dificuldade: {{difficulty}}
Descrição: {{description || 'vazia'}}
Equipamento: {{equipment?.join(', ') || 'nenhum'}}

Campos:
{
  "category_id": "uuid ou null",
  "subcategory": "string ou null",
  "muscles_primary": ["m1", "m2"],
  "muscles_secondary": ["m3"],
  "body_parts": ["bp1", "bp2"],
  "equipment": ["eq1", "eq2"],
  "name_en": "English name",
  "aliases_pt": ["apelido1"],
  "description": "2-3 frases clínicas",
  "tips": "1 frase prática",
  "precautions": "1 frase precaução",
  "benefits": "1 frase benefício"
}

Categorias válidas (uuid, slug, nome):
{{categories_json}}
`;
```

### Batch Processing
- Batch size: 20 (configurable)
- Concurrency: `Promise.all` within batch
- `executionCtx.waitUntil` for async KV purge
- Retry failed items once with lower temperature
- Log: updated count, failed count, sample diffs

### Validation
- `category_id` → must exist in `exercise_categories`
- Arrays → dedupe, lowercase, unaccent, singular
- `slug` → unique, ASCII, kebab-case
- Unknown fields ignored

## Constitution Compliance
- [ ] Spec exists before code ✅
- [ ] Tests first (Vitest)
- [ ] Workers AI registry used (`WORKERS_AI_MODELS.llama_3_1_8b`)
- [ ] Hono route ordering (before `/:id`)
- [ ] KV cache invalidation
- [ ] Admin-only endpoint
- [ ] PT-BR prompts/responses
- [ ] Migration sequential (0144)

## Rollback Plan
- Migration `.down.sql` restores original slugs
- Backfill: temporary `_backup_jsonb` column stores pre-update state
- KV: `delete('exercises:v1:catalog')` idempotent

## Dependencies
- `exercise_categories` table populated (20+ categories)
- `unaccent` extension enabled in Neon (default)
- Workers AI binding `AI` in `wrangler.toml`
