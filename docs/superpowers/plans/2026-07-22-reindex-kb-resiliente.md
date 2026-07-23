# Reindex Resiliente da Base de Conhecimento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o reindex assíncrono da base de conhecimento auto-curável (retry+DLQ+backoff) e verificável (status nativo do AI Search), com limpeza determinística de chunks.

**Architecture:** Mantém Cloudflare Queues (`BACKGROUND_QUEUE` → task `REINDEX_KB_ITEM`). O core de indexação passa a **lançar** exceções → o `handleQueue` re-tenta com backoff exponencial → DLQ após 3 tentativas. Limpeza de chunks antigos vira determinística por chave exata, apoiada numa tabela `kb_index_chunks(doc_key, chunk_count)`. Verificação usa `items.list({status})` do próprio AutoRAG.

**Tech Stack:** TypeScript strict, Cloudflare Workers (Hono), Cloudflare Queues + AI Search (built-in storage), Neon Postgres via `pg` pool, Vitest.

## Global Constraints

- TypeScript strict; sem comentários supérfluos; PT-BR na UI. (CLAUDE.md)
- DB de produção: Neon `purple-union-72678311` (`minatto`). Migração 0141 aplicada via CI/deploy — **nunca** rodar migração destrutiva autonomamente.
- Testes: Vitest. Rodar da pasta `apps/api`: `npx vitest run <path>`.
- Nunca commitar `apps/api/wrangler.toml` nem `src/components/evolution/__tests__/MeasurementDiagramYBalance.test.tsx` (modificações pré-existentes alheias).
- Nomes de chunk seguem `buildIndexChunks`: base `protocol-{id}.md` → arquivos `protocol-{id}--{n}.md` (base sem `.md` + `--{n}.md`).
- `items.list` do AI Search: `per_page` máximo **50**; `search` é busca por **conteúdo** (não usar para achar por nome); usar `status` / `key` / `source`.

---

## File Structure

- Create `apps/api/migrations/0141_kb_index_chunks.sql` + `.down.sql` — tabela de contagem de chunks por doc.
- Create `apps/api/src/lib/kbIndexState.ts` (+ `.test.ts`) — `chunksToDelete` (puro) + acesso à tabela.
- Create `apps/api/src/lib/queueBackoff.ts` (+ `.test.ts`) — `backoffDelay` (puro).
- Modify `apps/api/src/lib/contentIndexing.ts` — core que lança (`indexProtocol/indexExercise/indexWiki`) + limpeza determinística; wrappers públicos `syncXToIndex` engolem.
- Modify `apps/api/src/lib/kbReindex.ts` — `reindexKbItem` chama o core que lança.
- Modify `apps/api/src/lib/kbReindex.test.ts` — teste de rethrow.
- Modify `apps/api/src/queue.ts` — backoff no `retry()`.
- Create `apps/api/src/queue.reindex.test.ts` — backoff na falha do REINDEX_KB_ITEM.
- Modify `apps/api/src/routes/aiSearch.ts` — `GET /reindex/status` + fix `per_page` ≤50.
- Create `apps/api/src/routes/__tests__/reindexStatus.test.ts`.
- Modify `apps/api/src/lib/reindexStatus.ts` (novo, puro) — agregação de contagens por status.
- Modify `src/api/v2/aiSearch.ts` — método `reindexStatus()`.
- Modify `src/pages/knowledge/KnowledgeAsk.tsx` — exibir status após enfileirar.

---

## Task 1: Migração `kb_index_chunks`

**Files:**
- Create: `apps/api/migrations/0141_kb_index_chunks.sql`
- Create: `apps/api/migrations/0141_kb_index_chunks.down.sql`

**Interfaces:**
- Produces: tabela `kb_index_chunks(doc_key text pk, source text, chunk_count int, updated_at timestamptz)`.

- [ ] **Step 1: Criar a migração**

`apps/api/migrations/0141_kb_index_chunks.sql`:
```sql
-- 0141_kb_index_chunks.sql
-- Contagem de chunks indexados por documento, para limpeza determinística
-- (apaga o delta por chave exata quando um doc encolhe, sem items.list).
CREATE TABLE IF NOT EXISTS kb_index_chunks (
  doc_key     TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Criar o rollback**

`apps/api/migrations/0141_kb_index_chunks.down.sql`:
```sql
DROP TABLE IF EXISTS kb_index_chunks;
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/migrations/0141_kb_index_chunks.sql apps/api/migrations/0141_kb_index_chunks.down.sql
git commit -m "feat(rag): migração kb_index_chunks (contagem p/ limpeza determinística)"
```

---

## Task 2: `queueBackoff` (função pura)

**Files:**
- Create: `apps/api/src/lib/queueBackoff.ts`
- Test: `apps/api/src/lib/queueBackoff.test.ts`

**Interfaces:**
- Produces: `backoffDelay(attempts: number): number`

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/src/lib/queueBackoff.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { backoffDelay } from "./queueBackoff";

describe("backoffDelay", () => {
  it("cresce exponencialmente a partir de attempts", () => {
    expect(backoffDelay(1)).toBe(10);
    expect(backoffDelay(2)).toBe(20);
    expect(backoffDelay(3)).toBe(40);
  });
  it("limita em 300s", () => {
    expect(backoffDelay(10)).toBe(300);
  });
  it("nunca é negativo para attempts inesperado", () => {
    expect(backoffDelay(0)).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/lib/queueBackoff.test.ts`
Expected: FAIL — "Cannot find module './queueBackoff'".

- [ ] **Step 3: Implementar**

`apps/api/src/lib/queueBackoff.ts`:
```typescript
/** Backoff exponencial (segundos) para retry de mensagens da fila, por tentativa. */
export function backoffDelay(attempts: number): number {
  const n = Math.max(1, attempts);
  return Math.min(2 ** n * 5, 300);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && npx vitest run src/lib/queueBackoff.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/queueBackoff.ts apps/api/src/lib/queueBackoff.test.ts
git commit -m "feat(queue): backoffDelay exponencial p/ retries"
```

---

## Task 3: `kbIndexState` — `chunksToDelete` (puro) + acesso à tabela

**Files:**
- Create: `apps/api/src/lib/kbIndexState.ts`
- Test: `apps/api/src/lib/kbIndexState.test.ts`

**Interfaces:**
- Produces:
  - `chunksToDelete(baseFilename: string, oldN: number, newN: number): string[]`
  - `getChunkCount(env: Env, docKey: string): Promise<number>`
  - `setChunkCount(env: Env, docKey: string, source: string, count: number): Promise<void>`
  - `deleteChunkState(env: Env, docKey: string): Promise<void>`

- [ ] **Step 1: Escrever o teste que falha (função pura)**

`apps/api/src/lib/kbIndexState.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { chunksToDelete } from "./kbIndexState";

describe("chunksToDelete", () => {
  it("lista os chunks órfãos quando o doc encolheu", () => {
    expect(chunksToDelete("protocol-abc.md", 5, 2)).toEqual([
      "protocol-abc--2.md",
      "protocol-abc--3.md",
      "protocol-abc--4.md",
    ]);
  });
  it("retorna vazio quando não encolheu", () => {
    expect(chunksToDelete("protocol-abc.md", 3, 3)).toEqual([]);
    expect(chunksToDelete("protocol-abc.md", 2, 5)).toEqual([]);
  });
  it("respeita o padrão de nome (base sem .md + --n.md)", () => {
    expect(chunksToDelete("wiki/xyz.md", 2, 0)).toEqual(["wiki/xyz--0.md", "wiki/xyz--1.md"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/lib/kbIndexState.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

`apps/api/src/lib/kbIndexState.ts`:
```typescript
import type { Env } from "../types/env";
import { createPool } from "./db";

/** Chaves dos chunks órfãos a apagar quando um doc passa de oldN para newN chunks. */
export function chunksToDelete(baseFilename: string, oldN: number, newN: number): string[] {
  const base = baseFilename.replace(/\.md$/, "");
  const out: string[] = [];
  for (let i = newN; i < oldN; i++) out.push(`${base}--${i}.md`);
  return out;
}

export async function getChunkCount(env: Env, docKey: string): Promise<number> {
  const pool = createPool(env);
  const res = await pool.query<{ chunk_count: number }>(
    `SELECT chunk_count FROM kb_index_chunks WHERE doc_key = $1`,
    [docKey],
  );
  return res.rows[0]?.chunk_count ?? 0;
}

export async function setChunkCount(
  env: Env,
  docKey: string,
  source: string,
  count: number,
): Promise<void> {
  const pool = createPool(env);
  await pool.query(
    `INSERT INTO kb_index_chunks (doc_key, source, chunk_count, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (doc_key) DO UPDATE SET chunk_count = EXCLUDED.chunk_count, updated_at = now()`,
    [docKey, source, count],
  );
}

export async function deleteChunkState(env: Env, docKey: string): Promise<void> {
  const pool = createPool(env);
  await pool.query(`DELETE FROM kb_index_chunks WHERE doc_key = $1`, [docKey]);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && npx vitest run src/lib/kbIndexState.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/kbIndexState.ts apps/api/src/lib/kbIndexState.test.ts
git commit -m "feat(rag): kbIndexState (chunksToDelete + contagem por doc)"
```

---

## Task 4: `contentIndexing` — core que lança + limpeza determinística

**Files:**
- Modify: `apps/api/src/lib/contentIndexing.ts`

**Interfaces:**
- Consumes: `chunksToDelete`, `getChunkCount`, `setChunkCount`, `deleteChunkState` (Task 3); `buildIndexChunks` (existente).
- Produces: `indexProtocol/indexExercise/indexWiki(env, id): Promise<void>` (lançam); wrappers `syncProtocol/Exercise/WikiToIndex` (engolem, comportamento atual).

- [ ] **Step 1: Substituir a limpeza baseada em `items.list({search})` por limpeza determinística**

Em `apps/api/src/lib/contentIndexing.ts`, **remover** `deleteChunkFiles` (a versão com `items.list({ search })`) e adicionar, no topo dos imports:
```typescript
import { chunksToDelete, getChunkCount, setChunkCount, deleteChunkState } from "./kbIndexState";
```

Adicionar o helper de limpeza determinística (best-effort — não lança):
```typescript
/** Apaga chunks órfãos por chave exata (só quando o doc encolheu). Best-effort. */
async function cleanupOldChunks(env: Env, baseFilename: string, newCount: number): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  const docKey = baseFilename;
  const oldCount = await getChunkCount(env, docKey).catch(() => 0);
  const keys = chunksToDelete(baseFilename, oldCount, newCount);
  for (const key of keys) {
    try {
      const listing = await env.AI_SEARCH.items.list({ key, source: "builtin", per_page: 1 } as any);
      const items: Array<{ id: string }> = listing?.result ?? listing?.items ?? [];
      await Promise.all(items.map((it) => env.AI_SEARCH!.items.delete(it.id)));
    } catch (error) {
      console.warn(`[contentIndexing] orphan cleanup skipped for ${key}:`, error);
    }
  }
}
```

- [ ] **Step 2: Extrair o core que lança e fazer os wrappers engolirem — exercícios**

Substituir a função `syncExerciseToIndex` inteira por:
```typescript
export async function indexExercise(env: Env, exerciseId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  const pool = createPool(env);
  const res = await pool.query<ExerciseIndexRow>(
    `SELECT e.id, e.name, e.description, e.instructions,
            ec.name AS category, e.difficulty,
            e.muscles_primary, e.muscles_secondary, e.body_parts,
            e.tips, e.precautions, e.benefits
     FROM exercises e
     LEFT JOIN exercise_categories ec ON ec.id = e.category_id
     WHERE e.id = $1 AND e.is_active = true`,
    [exerciseId],
  );
  const row = res.rows[0];
  if (!row) {
    await removeExerciseFromIndex(env, exerciseId);
    return;
  }
  const base = exerciseIndexFilename(row.id);
  const files = buildIndexChunks(
    base,
    buildExerciseDoc(row),
    { status: "current", sourceType: "exercise", specialty: row.category ?? undefined },
    { source: "exercises", id: row.id, title: row.name, category: row.category ?? "" },
  );
  await cleanupOldChunks(env, base, files.length);
  await uploadChunks(env, files);
  await setChunkCount(env, base, "exercises", files.length);
}

export async function syncExerciseToIndex(env: Env, exerciseId: string): Promise<void> {
  try {
    await indexExercise(env, exerciseId);
  } catch (error) {
    console.error(`[contentIndexing] exercise sync failed for ${exerciseId}:`, error);
  }
}
```

- [ ] **Step 3: Idem para protocolos**

Substituir `syncProtocolToIndex` por:
```typescript
export async function indexProtocol(env: Env, protocolId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  const pool = createPool(env);
  const res = await pool.query<ProtocolIndexRow>(
    `SELECT id, name, description, condition_name, weeks_total,
            objectives, contraindications, evidence_level, protocol_type
     FROM exercise_protocols
     WHERE id = $1`,
    [protocolId],
  );
  const row = res.rows[0];
  if (!row) {
    await removeProtocolFromIndex(env, protocolId);
    return;
  }
  const base = protocolIndexFilename(row.id);
  const files = buildIndexChunks(
    base,
    buildProtocolDoc(row),
    { status: "current", sourceType: "protocol", specialty: row.protocol_type ?? undefined },
    { source: "protocols", id: row.id, title: row.name, condition: row.condition_name ?? "" },
  );
  await cleanupOldChunks(env, base, files.length);
  await uploadChunks(env, files);
  await setChunkCount(env, base, "protocols", files.length);
}

export async function syncProtocolToIndex(env: Env, protocolId: string): Promise<void> {
  try {
    await indexProtocol(env, protocolId);
  } catch (error) {
    console.error(`[contentIndexing] protocol sync failed for ${protocolId}:`, error);
  }
}
```

- [ ] **Step 4: Idem para wiki**

Substituir `syncWikiToIndex` por:
```typescript
export async function indexWiki(env: Env, wikiId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  const pool = createPool(env);
  const res = await pool.query<{ id: string; title: string; content: string | null; category: string | null }>(
    `SELECT wp.id, wp.title, LEFT(wp.content, 3000) AS content, wc.name AS category
     FROM wiki_pages wp
     LEFT JOIN wiki_categories wc ON wc.id = wp.category_id
     WHERE wp.id = $1`,
    [wikiId],
  );
  const row = res.rows[0];
  if (!row) {
    await removeWikiFromIndex(env, wikiId);
    return;
  }
  const base = wikiIndexFilename(row.id);
  const files = buildIndexChunks(
    base,
    buildWikiIndexDoc(row),
    { status: "current", sourceType: "wiki", specialty: row.category ?? undefined },
    { source: "wiki", id: row.id, title: row.title, category: row.category ?? "" },
  );
  await cleanupOldChunks(env, base, files.length);
  await uploadChunks(env, files);
  await setChunkCount(env, base, "wiki", files.length);
}

export async function syncWikiToIndex(env: Env, wikiId: string): Promise<void> {
  try {
    await indexWiki(env, wikiId);
  } catch (error) {
    console.error(`[contentIndexing] wiki sync failed for ${wikiId}:`, error);
  }
}
```

- [ ] **Step 5: Atualizar os `removeXFromIndex` para limpeza determinística + limpar estado**

Substituir os três `removeXFromIndex` por versões que apagam por count salvo:
```typescript
async function removeChunksByCount(env: Env, base: string): Promise<void> {
  const count = await getChunkCount(env, base).catch(() => 0);
  for (const key of chunksToDelete(base, count, 0)) {
    try {
      const listing = await env.AI_SEARCH?.items.list({ key, source: "builtin", per_page: 1 } as any);
      const items: Array<{ id: string }> = listing?.result ?? listing?.items ?? [];
      await Promise.all(items.map((it) => env.AI_SEARCH!.items.delete(it.id)));
    } catch {
      /* best-effort */
    }
  }
  await deleteChunkState(env, base).catch(() => {});
}

export async function removeExerciseFromIndex(env: Env, exerciseId: string): Promise<void> {
  const base = exerciseIndexFilename(exerciseId);
  await removeChunksByCount(env, base);
  await deleteIndexedItemsByFilenames(env, [base]);
}

export async function removeProtocolFromIndex(env: Env, protocolId: string): Promise<void> {
  const base = protocolIndexFilename(protocolId);
  await removeChunksByCount(env, base);
  await deleteIndexedItemsByFilenames(env, [base]);
}

export async function removeWikiFromIndex(env: Env, wikiId: string): Promise<void> {
  const base = wikiIndexFilename(wikiId);
  await removeChunksByCount(env, base);
  await deleteIndexedItemsByFilenames(env, [base]);
}
```

- [ ] **Step 6: Atualizar quem chamava `deleteChunkFiles` no batch (`aiSearch.ts`)**

Em `apps/api/src/routes/aiSearch.ts`, na função `indexChunked` dentro de `syncAutoRAGContent`, trocar a limpeza. Substituir:
```typescript
    if (env.AI_SEARCH) {
      await deleteChunkFiles(env, baseFilename);
      await deleteIndexedItemsByFilenames(env, [baseFilename]);
    }
    for (const f of files) {
      await uploadDoc(f.filename, f.text, f.metadata);
    }
```
por:
```typescript
    for (const f of files) {
      await uploadDoc(f.filename, f.text, f.metadata);
    }
    if (env.AI_SEARCH) {
      const { setChunkCount } = await import("../lib/kbIndexState");
      await setChunkCount(env, baseFilename, extra.source as string, files.length);
    }
```
e remover do import de `contentIndexing` o símbolo `deleteChunkFiles` (não existe mais).

- [ ] **Step 7: Rodar typecheck + testes de indexação existentes**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "contentIndexing|aiSearch|kbIndexState" | head`
Expected: nenhuma saída (0 erros nesses arquivos).

Run: `cd apps/api && npx vitest run src/lib/contentIndexing.test.ts`
Expected: PASS (os testes de `buildIndexChunks` continuam válidos).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/lib/contentIndexing.ts apps/api/src/routes/aiSearch.ts
git commit -m "feat(rag): core de indexação lança erro + limpeza determinística por chave"
```

---

## Task 5: `kbReindex` — `reindexKbItem` relança em falha

**Files:**
- Modify: `apps/api/src/lib/kbReindex.ts`
- Modify: `apps/api/src/lib/kbReindex.test.ts`

**Interfaces:**
- Consumes: `indexProtocol/indexExercise/indexWiki` (Task 4).
- Produces: `reindexKbItem` que **propaga** exceções.

- [ ] **Step 1: Escrever o teste que falha (rethrow)**

Adicionar em `apps/api/src/lib/kbReindex.test.ts` (no topo, mocks + novo describe):
```typescript
import { vi } from "vitest";

vi.mock("./contentIndexing", () => ({
  indexProtocol: vi.fn(async () => {
    throw new Error("upload 503");
  }),
  indexExercise: vi.fn(async () => {}),
  indexWiki: vi.fn(async () => {}),
}));

describe("reindexKbItem", () => {
  it("propaga o erro do core (para a fila re-tentar)", async () => {
    const { reindexKbItem } = await import("./kbReindex");
    await expect(
      reindexKbItem({ source: "protocols", id: "abc" }, {} as any),
    ).rejects.toThrow("upload 503");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/lib/kbReindex.test.ts`
Expected: FAIL — `reindexKbItem` ainda chama `syncProtocolToIndex` (que engole) → não lança.

- [ ] **Step 3: Implementar — apontar `reindexKbItem` para o core que lança**

Em `apps/api/src/lib/kbReindex.ts`, trocar o import e o dispatcher:
```typescript
import { indexProtocol, indexExercise, indexWiki } from "./contentIndexing";
```
```typescript
export async function reindexKbItem(payload: ReindexKbItemPayload, env: Env): Promise<void> {
  switch (payload.source) {
    case "protocols":
      await indexProtocol(env, payload.id);
      break;
    case "exercises":
      await indexExercise(env, payload.id);
      break;
    case "wiki":
      await indexWiki(env, payload.id);
      break;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && npx vitest run src/lib/kbReindex.test.ts`
Expected: PASS (helpers + rethrow).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/kbReindex.ts apps/api/src/lib/kbReindex.test.ts
git commit -m "feat(rag): reindexKbItem propaga erro p/ retry da fila"
```

---

## Task 6: `queue.ts` — backoff exponencial no retry

**Files:**
- Modify: `apps/api/src/queue.ts`
- Create: `apps/api/src/queue.reindex.test.ts`

**Interfaces:**
- Consumes: `backoffDelay` (Task 2), `reindexKbItem` (Task 5).

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/src/queue.reindex.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("./lib/kbReindex", () => ({
  reindexKbItem: vi.fn(async () => {
    throw new Error("boom");
  }),
}));

import { handleQueue } from "./queue";

function makeMessage(attempts: number) {
  return {
    body: { type: "REINDEX_KB_ITEM", payload: { source: "protocols", id: "x" } },
    attempts,
    ack: vi.fn(),
    retry: vi.fn(),
  };
}

describe("handleQueue REINDEX_KB_ITEM", () => {
  it("re-tenta com backoff exponencial em vez de ack", async () => {
    const msg = makeMessage(2);
    await handleQueue({ messages: [msg] } as any, {} as any);
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledWith({ delaySeconds: 20 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/queue.reindex.test.ts`
Expected: FAIL — `retry` chamado sem `delaySeconds` (o catch atual faz `message.retry()`).

- [ ] **Step 3: Implementar — backoff no catch**

Em `apps/api/src/queue.ts`: adicionar import no topo:
```typescript
import { backoffDelay } from "./lib/queueBackoff";
```
Localizar o `catch` do loop de mensagens em `handleQueue` (a linha `message.retry();`) e trocar por:
```typescript
      message.retry({ delaySeconds: backoffDelay(message.attempts) });
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && npx vitest run src/queue.reindex.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/queue.ts apps/api/src/queue.reindex.test.ts
git commit -m "feat(queue): retry com backoff exponencial (attempts)"
```

---

## Task 7: `reindexStatus` (puro) + endpoint `GET /reindex/status`

**Files:**
- Create: `apps/api/src/lib/reindexStatus.ts`
- Test: `apps/api/src/lib/reindexStatus.test.ts`
- Modify: `apps/api/src/routes/aiSearch.ts`

**Interfaces:**
- Produces:
  - `aggregateStatus(pages: Array<{ status: string; key?: string }>): { errors: number; pending: number; errorKeys: string[] }`
  - endpoint `POST/GET /api/ai-search/reindex/status` → `{ errors, pending, errorKeys }`

- [ ] **Step 1: Escrever o teste que falha (agregação pura)**

`apps/api/src/lib/reindexStatus.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { aggregateStatus } from "./reindexStatus";

describe("aggregateStatus", () => {
  it("conta erros e pendentes e coleta chaves de erro", () => {
    const out = aggregateStatus([
      { status: "error", key: "protocol-1--0.md" },
      { status: "error", key: "wiki-2--0.md" },
      { status: "running", key: "exercise-3--0.md" },
      { status: "queued", key: "exercise-4--0.md" },
      { status: "completed", key: "protocol-5--0.md" },
    ]);
    expect(out.errors).toBe(2);
    expect(out.pending).toBe(2);
    expect(out.errorKeys).toEqual(["protocol-1--0.md", "wiki-2--0.md"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/api && npx vitest run src/lib/reindexStatus.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar a função pura**

`apps/api/src/lib/reindexStatus.ts`:
```typescript
export interface StatusItem {
  status: string;
  key?: string;
}

export function aggregateStatus(items: StatusItem[]): {
  errors: number;
  pending: number;
  errorKeys: string[];
} {
  let errors = 0;
  let pending = 0;
  const errorKeys: string[] = [];
  for (const it of items) {
    if (it.status === "error") {
      errors++;
      if (it.key) errorKeys.push(it.key);
    } else if (it.status === "running" || it.status === "queued") {
      pending++;
    }
  }
  return { errors, pending, errorKeys };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/api && npx vitest run src/lib/reindexStatus.test.ts`
Expected: PASS.

- [ ] **Step 5: Adicionar o endpoint em `aiSearch.ts`**

Import no topo:
```typescript
import { aggregateStatus, type StatusItem } from "../lib/reindexStatus";
```
Adicionar a rota (perto de `/reindex`):
```typescript
aiSearchApp.get("/reindex/status", requireAuth, async (c) => {
  if (!isInternalRole(c.get("user").role)) {
    return c.json({ error: "Acesso restrito a profissionais da clínica" }, 403);
  }
  if (!c.env.AI_SEARCH?.items) return c.json({ errors: 0, pending: 0, errorKeys: [] });
  const collected: StatusItem[] = [];
  for (const status of ["error", "running", "queued"] as const) {
    for (let page = 1; page <= 10; page++) {
      const listing: any = await c.env.AI_SEARCH.items.list({ status, per_page: 50, page } as any);
      const rows: any[] = listing?.result ?? listing?.items ?? [];
      if (rows.length === 0) break;
      for (const r of rows) collected.push({ status, key: r.key ?? r.filename });
      if (rows.length < 50) break;
    }
  }
  return c.json(aggregateStatus(collected));
});
```

- [ ] **Step 6: Corrigir `per_page` do endpoint `/items` (máx 50)**

Localizar em `aiSearch.ts` a rota `GET /items` e a linha:
```typescript
      per_page: Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50))),
```
trocar `100` por `50`:
```typescript
      per_page: Math.min(50, Math.max(1, Number(c.req.query("limit") ?? 50))),
```

- [ ] **Step 7: Typecheck + testes**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "reindexStatus|aiSearch" | head`
Expected: sem saída.

Run: `cd apps/api && npx vitest run src/lib/reindexStatus.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/lib/reindexStatus.ts apps/api/src/lib/reindexStatus.test.ts apps/api/src/routes/aiSearch.ts
git commit -m "feat(rag): GET /reindex/status via items.list nativo + fix per_page 50"
```

---

## Task 8: Front — mostrar status após enfileirar

**Files:**
- Modify: `src/api/v2/aiSearch.ts`
- Modify: `src/pages/knowledge/KnowledgeAsk.tsx`

**Interfaces:**
- Consumes: endpoint `/api/ai-search/reindex/status` (Task 7).
- Produces: `aiSearchApi.reindexStatus()`.

- [ ] **Step 1: Adicionar o método no client**

Em `src/api/v2/aiSearch.ts`, adicionar após `reindex`:
```typescript
export type ReindexStatus = { errors: number; pending: number; errorKeys: string[] };
```
e dentro de `aiSearchApi`:
```typescript
  reindexStatus: () => request<ReindexStatus>("/api/ai-search/reindex/status", { method: "GET" }),
```

- [ ] **Step 2: Exibir status no `KnowledgeAsk.tsx`**

Na função `reindex()` de `src/pages/knowledge/KnowledgeAsk.tsx`, após o sucesso do enfileiramento, buscar o status uma vez e compor a mensagem:
```typescript
  async function reindex() {
    if (reindexing) return;
    setReindexing(true);
    setReindexMsg(null);
    try {
      const r = await aiSearchApi.reindex();
      const total = Object.values(r.enqueued).reduce((a, b) => a + b, 0);
      let msg = `Reindexação enfileirada: ${total} itens processando em segundo plano.`;
      try {
        const s = await aiSearchApi.reindexStatus();
        msg += ` Status atual — erros: ${s.errors}, processando: ${s.pending}.`;
      } catch {
        /* status é opcional */
      }
      setReindexMsg(msg);
    } catch (e) {
      setReindexMsg((e as Error).message ?? "Falha ao enfileirar reindexação");
    } finally {
      setReindexing(false);
    }
  }
```

- [ ] **Step 3: Typecheck do front**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "aiSearch|KnowledgeAsk" | head`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add src/api/v2/aiSearch.ts src/pages/knowledge/KnowledgeAsk.tsx
git commit -m "feat(rag): botão mostra status real do reindex (erros/processando)"
```

---

## Task 9: Gate completo + deploy

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte API completa**

Run: `cd apps/api && npx vitest run`
Expected: todos verdes (inclui os novos + 758 anteriores).

- [ ] **Step 2: Gate local (idêntico ao CI)**

Run: `bash scripts/predeploy-check.sh`
Expected: "Predeploy checks complete".

- [ ] **Step 3: Push (dispara deploy + aplica migração 0141 via CI)**

```bash
git push origin main
```
Confirmar com o usuário antes do push (produção). Acompanhar `gh run watch` até gate+deploy+smoke verdes.

- [ ] **Step 4: Validação end-to-end em produção**

Após deploy: re-disparar o reindex (botão "Reindexar base"); consultar `GET /reindex/status` → `errors` deve cair a zero conforme os retries; confirmar ausência de novos `chunk cleanup failed` nos logs (Cloudflare observability); query RAG retorna com fontes.

---

## Self-Review

**Spec coverage:**
- Auto-cura (retry+DLQ+backoff) → Tasks 2, 5, 6. ✓
- Limpeza determinística + tabela → Tasks 1, 3, 4. ✓
- Verificável (status nativo) + fix per_page → Task 7. ✓
- Front mostra status → Task 8. ✓
- Migração em `purple-union-72678311` via CI, não autônoma → Task 9 Step 3 (confirmação). ✓

**Placeholder scan:** nenhum TBD/TODO; todo passo tem código concreto.

**Type consistency:** `indexProtocol/indexExercise/indexWiki` (Task 4) consumidos por `reindexKbItem` (Task 5) e mockados no teste; `backoffDelay` (Task 2) usado em Task 6; `chunksToDelete/getChunkCount/setChunkCount/deleteChunkState` (Task 3) usados em Task 4; `aggregateStatus`/`StatusItem` (Task 7) consistentes; `ReindexStatus` (Task 8) espelha o retorno do endpoint (Task 7).

**Nota de risco (implementação):** o parâmetro `key` de `items.list` e a assinatura de `items.delete(id)` do binding devem ser confirmados no typecheck; se o binding não tipar `key`, o `as any` já contorna, e a limpeza é best-effort (não bloqueia o reindex).
