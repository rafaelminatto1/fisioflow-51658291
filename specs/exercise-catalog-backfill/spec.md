# Exercise Catalog Backfill — Spec

## Objective
Catalogar todos os exercícios do FisioFlow com completude de dados (não apenas difficulty), usando Workers AI para backfill automático de campos vazios, e endpoint de catálogo agrupado `/exercises/catalog` para o frontend.

## Context & Audit Summary (Produção: `purple-union-72678311` / `minatto`)

| Campo | Vazios (399 total) | % | Prioridade |
|---|---|---|---|
| `slug` | 23 | 5.8% | **P0** — quebra links permanentes |
| `category_id` | 158 | 39.6% | **P0** — não aparece em filtros de categoria |
| `subcategory` | 273 | 68.4% | **P1** |
| `muscles_primary` | 151 | 37.8% | **P1** — busca/filtro muscular |
| `body_parts` | 216 | 54.1% | **P1** — busca/filtro anatômico |
| `equipment` | 209 | 52.4% | **P1** — filtro equipamento |
| `name_en` | 322 | 80.7% | **P2** |
| `aliases_pt` | 359 | 90.0% | **P2** — busca fuzzy |
| `icd10_codes` | 399 | 100% | **P2** — nenhum tem CID-10 |
| `source` | 398 | 99.7% | **P2** — proveniência |

**Difficulty**: já 100% preenchido (migration 0143 aplicada: `iniciante`=281, `intermediario`=83, `avancado`=35).

**Slugs não canônicos** (4 com acentos): `exd-agachamento-sumô`, `ativação-vmo`, `retração-cervical-isometrica`, `retracão-escapular`.

## User Stories

| ID | Story | Priority |
|---|---|---|
| US-01 | Como **dev**, quero endpoint `GET /exercises/catalog` retornando `{ total, byDifficulty: { difficulty: { count, categories[] } }, contentGaps[] }` para o frontend renderizar badges e gaps. | P0 |
| US-02 | Como **admin**, quero `POST /exercises/content/backfill` (admin-only) que usa Workers AI (`llama_3_1_8b`) para preencher `description`, `tips`, `precautions`, `benefits`, `muscles_primary`, `body_parts`, `equipment`, `category_id`, `subcategory`, `name_en`, `aliases_pt` em lote, invalidando cache KV. | P0 |
| US-03 | Como **sistema**, quero slugs canônicos (lowercase, ascii-only, kebab-case) para todos os exercícios; exercícios sem slug ganham slug gerado a partir do `name`. | P0 |
| US-04 | Como **fisioterapeuta**, quero filtros de categoria/músculo/equipamento funcionando no catálogo web (requer `category_id`, `muscles_primary`, `body_parts`, `equipment` preenchidos). | P1 |

## Acceptance Scenarios

### US-01 — GET /exercises/catalog
- **Dado** 394 exercícios active+public
- **Quando** `GET /exercises/catalog`
- **Então** resposta 200 com `{ data: { total: 394, byDifficulty: { iniciante: { count: 278, categories: [...] }, ... }, contentGaps: [...], contentGapsCount: N } }`
- **E** header `Cache-Control: public, max-age=3600` (KV cache key `exercises:v1:catalog`)

### US-02 — POST /exercises/content/backfill
- **Dado** admin autenticado
- **Quando** `POST /exercises/content/backfill { batchSize: 20, fields: ["category_id", "muscles_primary", ...] }`
- **Então** processa em lotes de 20, `waitUntil` para não travar request, cada exercício recebe prompt estruturado JSON, resposta parseada e `UPDATE` via Drizzle
- **E** ao final, `FISIOFLOW_KV.delete('exercises:v1:catalog')`
- **E** log de quantos atualizados, quantos falharam, amostra de diffs

### US-03 — Slug Canonicalization
- **Dado** exercício com `slug` nulo ou com acentos
- **Quando** job de normalização roda (ou no backfill)
- **Então** `slug = slugify(name)` (lowercase, remove acentos, kebab-case, unique suffix se colidir)
- **E** `UNIQUE(slug)` respeitado

## Technical Design

### Endpoint: GET /exercises/catalog
```typescript
// apps/api/src/routes/exercises.ts (antes de /:id)
router.get('/catalog', requireAuth, async (c) => {
  const cached = await c.env.FISIOFLOW_KV.get('exercises:v1:catalog', 'json');
  if (cached) return c.json(cached);
  
  const exercises = await db.select().from(exercises)
    .where(and(eq(exercises.isActive, true), eq(exercises.isPublic, true)));
  
  // agrupar por difficulty + category
  const byDifficulty = exercises.reduce((acc, ex) => {
    const d = ex.difficulty;
    if (!acc[d]) acc[d] = { count: 0, categories: new Set() };
    acc[d].count++;
    if (ex.categoryId) acc[d].categories.add(ex.categoryId);
    return acc;
  }, {});
  
  // content gaps: exercícios sem category_id OU sem muscles_primary OU sem body_parts
  const contentGaps = exercises
    .filter(e => !e.categoryId || !e.musclesPrimary?.length || !e.bodyParts?.length)
    .map(e => ({ id: e.id, name: e.name, missing: [...!e.categoryId ? ['category'] : [], ...!e.musclesPrimary?.length ? ['muscles_primary'] : [], ...!e.bodyParts?.length ? ['body_parts'] : []] }));
  
  const payload = { data: { total: exercises.length, byDifficulty, contentGaps, contentGapsCount: contentGaps.length } };
  await c.env.FISIOFLOW_KV.put('exercises:v1:catalog', JSON.stringify(payload), { expirationTtl: 3600 });
  return c.json(payload);
});
```

### Endpoint: POST /exercises/content/backfill
```typescript
// apps/api/src/routes/exercises.ts (após /embeddings/backfill)
router.post('/content/backfill', requireAuth(['admin']), async (c) => {
  const { batchSize = 20, fields = [...] } = await c.req.json();
  const targetExercises = await db.select().from(exercises)
    .where(and(eq(exercises.isActive, true), eq(exercises.isPublic, true)));
  
  const results = { updated: 0, failed: 0, samples: [] };
  
  for (let i = 0; i < targetExercises.length; i += batchSize) {
    const batch = targetExercises.slice(i, i + batchSize);
    await Promise.all(batch.map(async (ex) => {
      const prompt = buildPrompt(ex, fields);
      const aiResponse = await runAi(c.env.AI, WORKERS_AI_MODELS.llama_3_1_8b, { prompt, max_tokens: 1024, temperature: 0.2 });
      const parsed = parseAiJson(aiResponse);
      if (parsed) {
        await db.update(exercises).set(parsed).where(eq(exercises.id, ex.id));
        results.updated++;
        if (results.samples.length < 3) results.samples.push({ before: pick(ex, fields), after: parsed });
      } else { results.failed++; }
    }));
  }
  
  await c.env.FISIOFLOW_KV.delete('exercises:v1:catalog');
  return c.json({ data: results });
});
```

### Prompt Template (PT-BR, JSON-only)
```text
Você é um especialista em fisioterapia. Preencha APENAS os campos JSON abaixo para o exercício.
Retorne SOMENTE JSON válido, sem markdown, sem explicação.

Exercício: {{name}}
Categoria atual: {{category?.name || 'nenhuma'}}
Dificuldade: {{difficulty}}
Descrição atual: {{description || 'vazia'}}
Equipamento atual: {{equipment?.join(', ') || 'nenhum'}}

Campos a preencher:
{
  "category_id": "uuid da categoria mais adequada (use lista anexa) ou null",
  "subcategory": "string curta em português ou null",
  "muscles_primary": ["músculo1", "músculo2"],
  "muscles_secondary": ["músculo3"],
  "body_parts": ["região1", "região2"],
  "equipment": ["equipamento1", "equipamento2"],
  "name_en": "nome em inglês",
  "aliases_pt": ["apelido1", "apelido2"],
  "description": "descrição clínica 2-3 frases",
  "tips": "dica prática 1 frase",
  "precautions": "precaução 1 frase",
  "benefits": "benefício 1 frase"
}

Lista de categorias válidas (uuid, nome):
{{categories_json}}
```

### Slug Normalization Job
```sql
-- migration: slug canonicalization
UPDATE exercises
SET slug = lower(regexp_replace(unaccent(name), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug ~ '[^a-z0-9-]';

-- resolve collisions
WITH numbered AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM exercises
)
UPDATE exercises e
SET slug = n.slug || '-' || n.rn
FROM numbered n
WHERE e.id = n.id AND n.rn > 1;
```

## Test Plan (Vitest)

| Test | Description |
|---|---|
| `GET /exercises/catalog returns structured data` | Mock pool, auth, KV; verifica shape + counts |
| `GET /exercises/catalog uses KV cache` | Segunda chamada não atinge DB |
| `POST /exercises/content/backfill admin only` | 403 para non-admin; 200 para admin |
| `POST /exercises/content/backfill processes batch` | Mock `runAi`, verifica UPDATE calls |
| `slug normalization` | Testa `slugify('Agachamento Sumô') === 'agachamento-sumo'` |

## Migration Checklist
- [ ] Migration para slug canonicalization (sequencial: 0144)
- [ ] Índice composto `(is_active, is_public, difficulty, category_id)` se necessário

## Rollback
- KV cache: `FISIOFLOW_KV.delete('exercises:v1:catalog')` (idempotente)
- Backfill: `.down.sql` reverte `UPDATE` para valores originais (armazenar em coluna `_backup_jsonb` temporária)

## References
- `apps/api/src/routes/exercises.ts` — rotas atuais (~993 linhas)
- `apps/api/src/lib/workersAi.ts` — `WORKERS_AI_MODELS.llama_3_1_8b`
- `apps/api/src/lib/ai-native.ts` — `runAi`, `readAiText`
- `src/lib/constants/exerciseConstants.ts` — `DIFFICULTY_UI`
- `specs/exercise-difficulty-catalog/` — spec anterior (T031/T041/T051/T071 concluídos)
