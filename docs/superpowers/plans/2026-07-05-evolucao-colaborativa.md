# Evolução Colaborativa em Tempo Real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar edição colaborativa em tempo real (tipo Google Docs) da observação de texto rico da evolução clínica, com o Durable Object como servidor Yjs autoritativo e único escritor em `sessions.observacao`.

**Architecture:** Cliente TipTap+Yjs conecta via `y-partyserver/provider` a um Durable Object (`YServer` de `y-partyserver`) por evolução, autenticado por JWT. O DO mantém o Y.Doc autoritativo, persiste (debounced) um snapshot binário em `sessions.observacao_ydoc` e o HTML renderizado (via `@tiptap/static-renderer`, sem DOM) em `sessions.observacao`. Fallback: se o WS não conectar, o editor remonta no modo clássico de um usuário (autosave atual).

**Tech Stack:** Cloudflare Durable Objects (SQLite backend, WebSocket) + `y-partyserver`/`partyserver`, Yjs + `y-prosemirror`, `@tiptap/static-renderer`, TipTap v3, React 19.2 + Vite 8, Neon Postgres (Hyperdrive/pg), Vitest + `@cloudflare/vitest-pool-workers`, Playwright.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-evolucao-colaborativa-design.md`.
- TypeScript strict; sem comentários supérfluos; PT-BR em UI.
- Rodar `pnpm type-check` (web) e `pnpm workers:type-check` (api) antes de cada commit que toca `.ts`/`.tsx`.
- Trabalhar na branch `feat/evolucao-colaborativa` (já criada). Não commitar na `main` (push na main = auto-deploy).
- Fonte da verdade: o DO é o ÚNICO escritor de `sessions.observacao` quando colaboração ativa; o autosave do cliente é desligado nesse caso. Fora de colaboração, nada muda.
- Escopo: apenas a observação de texto rico. Campos estruturados ficam de fora.
- Sem dados reais no projeto → sem migração de conteúdo legado; evolução nova começa vazia.
- Migrations Neon em `apps/api/migrations/`, próximo número sequencial = **0139**; sempre criar `.down.sql`.
- Auth obrigatória no upgrade do WS: JWT válido + mesma org + papel que edita evolução (fisio/admin/estagiário; paciente nunca).
- `debounceWait: 2000`, `debounceMaxWait: 10000` no `onSave` (via `static callbackOptions`).
- Ao adicionar deps, confirmar a versão atual compatível via `npx ctx7@latest` (React 19.2 / Vite 8 / TipTap v3).

---

## File Structure

- `packages/evolution-editor-schema/` (NOVO) — pacote compartilhado: `evolutionEditorExtensions` (extensões de documento) + `yDocToHtml(doc)`. Importado por cliente e DO. Uma fonte → zero drift.
- `apps/api/src/agents/EvolutionCollaboration.ts` (REESCRITA) — `class EvolutionCollaboration extends YServer`; auth no connect; `onLoad`/`onSave`.
- `apps/api/migrations/0139_evolution_ydoc_snapshot.sql` (+ `.down.sql`) — coluna `sessions.observacao_ydoc BYTEA`.
- `apps/api/wrangler.toml` — migração do DO para SQLite; roteamento partyserver.
- `apps/api/src/index.ts` — `handleCollaborationWS` alinhado ao roteamento do partyserver.
- `apps/api/vitest.config.ts` / `apps/api/package.json` — `@cloudflare/vitest-pool-workers`.
- `src/components/ui/RichTextEditor.tsx` (MODIFICA) — provider `y-partyserver` + JWT + `y-indexeddb` + extensões compartilhadas.
- `src/pages/PatientEvolution.tsx` (MODIFICA) — `collaborationId={sessionId}` + máquina de dois estados.
- `src/components/evolution/CollaborationPresence.tsx` (NOVO) — indicador "quem está online".
- `e2e/flows/evolucao-colaborativa.spec.ts` (NOVO) — E2E.

## Sequência (por que esta ordem)

1. **Task 1 é gate:** se `@tiptap/static-renderer` não rodar no runtime de Workers, o design muda (mappings manuais) — descobrir isso antes de tudo.
2. **Task 2 (migration)** é independente e barata; libera a persistência.
3. **Tasks 3-5 (DO)** dependem de 1 (conversão) e 2 (coluna): skeleton+sync → auth → persistência.
4. **Tasks 6-7 (cliente)** dependem do DO existir para testar de ponta a ponta.
5. **Task 8 (E2E)** por último, valida o conjunto.

---

## Task 1 (GATE): Pacote de schema compartilhado + spike Yjs→HTML no Workers

**Files:**
- Create: `packages/evolution-editor-schema/package.json`
- Create: `packages/evolution-editor-schema/src/index.ts`
- Create: `packages/evolution-editor-schema/src/extensions.ts`
- Create: `packages/evolution-editor-schema/src/yDocToHtml.ts`
- Test: `packages/evolution-editor-schema/src/__tests__/yDocToHtml.workers.test.ts`
- Modify: `apps/api/vitest.config.ts` (garantir pool workers para este teste) ou test config do pacote

**Interfaces:**
- Produces: `evolutionEditorExtensions: Extensions` (array de extensões TipTap de documento) e `yDocToHtml(doc: Y.Doc): string`. Consumidos pelo DO (Task 5) e pelo cliente (Task 6).

- [ ] **Step 1: Confirmar a API atual de `@tiptap/static-renderer` e `y-prosemirror`**

Run:
```bash
npx ctx7@latest library "Tiptap" "static-renderer renderToHTMLString server side no DOM extensions"
npx ctx7@latest docs <id> "renderToHTMLString pm/html-string usage extensions content"
```
Expected: confirmar `import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string"` e a assinatura `renderToHTMLString({ extensions, content })`. Confirmar versão compatível com `@tiptap/core ^3.23.4` e instalar: `pnpm --filter @fisioflow/evolution-editor-schema add @tiptap/static-renderer@<v> y-prosemirror@<v> yjs@<v> @tiptap/core@<v>`.

- [ ] **Step 2: Criar o pacote e extrair as extensões de documento**

Criar `packages/evolution-editor-schema/package.json` (nome `@fisioflow/evolution-editor-schema`, `type: module`, `main`/`exports` para `src/index.ts`, sem build — consumido via workspace TS como os outros `packages/*`).
Em `src/extensions.ts`, exportar `evolutionEditorExtensions`: **extrair exatamente as extensões de documento hoje configuradas em `src/components/ui/RichTextEditor.tsx`** (StarterKit e afins, tabelas, listas, highlight, image, etc.), EXCLUINDO extensões só-de-UI: `Placeholder`, `Collaboration`, `CollaborationCursor`, e qualquer helper de foco/typing. Estas ficam no cliente.
`src/index.ts` re-exporta `evolutionEditorExtensions` e `yDocToHtml`.

- [ ] **Step 3: Escrever o teste do spike (RED) — rodando no runtime de Workers**

`src/__tests__/yDocToHtml.workers.test.ts` (config vitest com `pool: "@cloudflare/vitest-pool-workers"` ou reaproveitar o de `apps/api`):
```ts
import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import { Node as PMNode } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import { evolutionEditorExtensions } from "../extensions";
import { yDocToHtml } from "../yDocToHtml";

it("renderiza um Y.Doc simples para HTML no runtime de Workers", () => {
  const schema = getSchema(evolutionEditorExtensions);
  const pmDoc = PMNode.fromJSON(schema, {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Olá mundo" }] }],
  });
  const doc = new Y.Doc();
  prosemirrorToYXmlFragment(pmDoc, doc.getXmlFragment("default"));
  const html = yDocToHtml(doc);
  expect(html).toContain("Olá mundo");
  expect(html).toContain("<p");
});

it("ida-e-volta é estável (idempotência de render)", () => {
  const schema = getSchema(evolutionEditorExtensions);
  const pmDoc = PMNode.fromJSON(schema, {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Título" }] },
      { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "negrito" }] },
    ],
  });
  const doc = new Y.Doc();
  prosemirrorToYXmlFragment(pmDoc, doc.getXmlFragment("default"));
  expect(yDocToHtml(doc)).toBe(yDocToHtml(doc));
});
```

- [ ] **Step 4: Rodar o teste e confirmar que falha**

Run: `pnpm --filter @fisioflow/evolution-editor-schema exec vitest run` (ou o comando de teste do pacote)
Expected: FAIL (`yDocToHtml` não existe).

- [ ] **Step 5: Implementar `yDocToHtml`**

`src/yDocToHtml.ts`:
```ts
import * as Y from "yjs";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import { getSchema } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { evolutionEditorExtensions } from "./extensions";

const schema = getSchema(evolutionEditorExtensions);

export function yDocToHtml(doc: Y.Doc): string {
  const fragment = doc.getXmlFragment("default");
  const node = yXmlFragmentToProseMirrorRootNode(fragment, schema);
  return renderToHTMLString({ extensions: evolutionEditorExtensions, content: node.toJSON() });
}
```
> Se o Step 1 revelar assinatura diferente (ex.: `content` aceita PMNode direto), ajustar para a API confirmada.

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `pnpm --filter @fisioflow/evolution-editor-schema exec vitest run`
Expected: PASS. **Se FALHAR por o `renderToHTMLString` não rodar no runtime de Workers**, aplicar o Plano B: passar `options.nodeMapping`/`options.markMapping` manuais no `renderToHTMLString` cobrindo os nós/marcas de `evolutionEditorExtensions` (parágrafo, heading, bold, italic, listas, etc.), e re-rodar. Documentar no relatório qual caminho funcionou.

- [ ] **Step 7: Commit**

```bash
git add packages/evolution-editor-schema apps/api/vitest.config.ts
git commit -m "feat(collab): pacote de schema compartilhado + Yjs->HTML no Workers (spike gate)"
```

---

## Task 2: Migration Neon — coluna do snapshot Yjs

**Files:**
- Create: `apps/api/migrations/0139_evolution_ydoc_snapshot.sql`
- Create: `apps/api/migrations/0139_evolution_ydoc_snapshot.down.sql`

**Interfaces:**
- Produces: coluna `sessions.observacao_ydoc BYTEA NULL`. Consumida pelo DO (Task 5).

- [ ] **Step 1: Escrever a migration up**

`0139_evolution_ydoc_snapshot.sql`:
```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS observacao_ydoc BYTEA NULL;
```

- [ ] **Step 2: Escrever a migration down**

`0139_evolution_ydoc_snapshot.down.sql`:
```sql
ALTER TABLE sessions DROP COLUMN IF EXISTS observacao_ydoc;
```

- [ ] **Step 3: Aplicar na branch Neon de dev e verificar**

Run (via MCP Neon ou o runner de migrations do projeto): aplicar `0139` e confirmar a coluna:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'observacao_ydoc';
```
Expected: uma linha, `bytea`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/migrations/0139_evolution_ydoc_snapshot.sql apps/api/migrations/0139_evolution_ydoc_snapshot.down.sql
git commit -m "feat(collab): coluna sessions.observacao_ydoc para snapshot Yjs"
```

---

## Task 3: Durable Object sobre `y-partyserver` + roteamento + SQLite

**Files:**
- Modify: `apps/api/package.json` (deps)
- Modify: `apps/api/src/agents/EvolutionCollaboration.ts` (reescrita)
- Modify: `apps/api/src/index.ts` (`handleCollaborationWS`)
- Modify: `apps/api/wrangler.toml` (migração SQLite do DO)
- Modify: `apps/api/vitest.config.ts` / `apps/api/package.json` (pool workers)
- Test: `apps/api/src/agents/__tests__/EvolutionCollaboration.sync.test.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores ainda (persistência vem na Task 5).
- Produces: `class EvolutionCollaboration extends YServer` roteável em `/api/sessions/:id/collaboration`, sincronizando clientes Yjs. Consumido pelas Tasks 4-7.

- [ ] **Step 1: Confirmar API do `y-partyserver`/`partyserver` e instalar**

Run:
```bash
npx ctx7@latest library "PartyKit y-partyserver" "YServer durable object routing wrangler onLoad onSave auth"
npx ctx7@latest docs <id> "YServer extend routePartykitRequest wrangler durable object binding auth onConnect"
```
Expected: confirmar (a) o helper de roteamento no fetch handler (ex.: `routePartykitRequest`/`partyserverMiddleware`), (b) a classe base `YServer`, (c) o hook de ciclo de vida da conexão para auth. Instalar versões confirmadas:
```bash
pnpm --dir apps/api add y-partyserver partyserver yjs y-prosemirror @tiptap/static-renderer @tiptap/core
pnpm --dir apps/api add -D @cloudflare/vitest-pool-workers
```

- [ ] **Step 2: Configurar vitest pool workers no apps/api**

Ajustar `apps/api/vitest.config.ts` para usar `@cloudflare/vitest-pool-workers` com `wrangler.toml` (miniflare), habilitando testes de Durable Object (`env`, `runInDurableObject`). Seguir o exemplo oficial da doc "testing-with-durable-objects".

- [ ] **Step 3: Escrever o teste de sync (RED) — dois clientes convergem**

`apps/api/src/agents/__tests__/EvolutionCollaboration.sync.test.ts`: usando `@cloudflare/vitest-pool-workers`, abrir duas conexões WebSocket ao mesmo `sessionId`, aplicar um update Yjs numa e assertar que a outra recebe e converge (o Y.Doc das duas fica igual). (Seguir o padrão de teste de WS/DO da doc oficial; auth ainda não — usar um token de teste aceito temporariamente ou stubar a validação até a Task 4.)

- [ ] **Step 4: Rodar e confirmar falha**

Run: `pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.sync.test.ts`
Expected: FAIL (DO ainda é o relay antigo).

- [ ] **Step 5: Reescrever o DO sobre `YServer` + wrangler SQLite + roteamento**

`apps/api/src/agents/EvolutionCollaboration.ts`:
```ts
import { YServer } from "y-partyserver";
import type { Env } from "../types/env";

export class EvolutionCollaboration extends YServer<Env> {
  static callbackOptions = { debounceWait: 2000, debounceMaxWait: 10000 };
  // onLoad/onSave e auth chegam nas Tasks 4-5.
}
```
`apps/api/src/index.ts` (`handleCollaborationWS`): rotear via o helper confirmado no Step 1 (ex.: `routePartykitRequest(request, env)` mapeando `EVOLUTION_COLLABORATION`), mantendo o path `/api/sessions/:id/collaboration` como o room name = `sessionId`.
`apps/api/wrangler.toml`: converter o DO para SQLite. Como não há dados reais, na seção `[[migrations]]`, adicionar uma nova tag que faz o rename/recreate para `new_sqlite_classes`. Confirmar a sintaxe exata (rename vs delete+create) na doc do wrangler (`npx ctx7@latest library "Cloudflare Workers" "durable object migration new_sqlite_classes rename delete class"`). Refletir também em `[env.production.durable_objects]`.

- [ ] **Step 6: type-check + rodar o teste até passar**

Run:
```bash
pnpm workers:type-check
pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.sync.test.ts
```
Expected: type-check 0 erros; teste PASS (dois clientes convergem).

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/src/agents/EvolutionCollaboration.ts apps/api/src/index.ts apps/api/wrangler.toml apps/api/vitest.config.ts
git commit -m "feat(collab): DO sobre y-partyserver (sync + SQLite + roteamento)"
```

---

## Task 4: Autenticação no upgrade do WebSocket (JWT + org + RBAC)

**Files:**
- Modify: `apps/api/src/agents/EvolutionCollaboration.ts`
- Test: `apps/api/src/agents/__tests__/EvolutionCollaboration.auth.test.ts`

**Interfaces:**
- Consumes: `YServer` da Task 3; validadores JWT existentes (`apps/api/src/lib/auth.ts`), sessão do Neon.
- Produces: DO que recusa conexões sem JWT válido / org divergente / papel sem permissão.

- [ ] **Step 1: Escrever o teste de auth (RED)**

`EvolutionCollaboration.auth.test.ts`, três casos:
- token ausente → conexão recusada (WS fecha / handshake falha).
- token válido de OUTRA org que a da sessão → recusada.
- token válido, mesma org, papel fisio → aceita.
(Mockar o `verifyToken`/JWKS e o SELECT da sessão conforme o padrão de teste do projeto.)

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.auth.test.ts`
Expected: FAIL (sem auth, tudo é aceito).

- [ ] **Step 3: Implementar auth no ciclo de conexão**

No hook de conexão do `YServer`/`partyserver` confirmado na Task 3 Step 1 (ex.: `onConnect(connection, ctx)` ou `static onBeforeConnect`): extrair o token do `params` (query) da requisição; validar com o `verifyToken` existente; carregar a sessão (`SELECT org_id FROM sessions WHERE id = room`) e confirmar `session.org_id === claims.org_id` e papel ∈ {admin, fisioterapeuta, estagiario}; senão fechar a conexão (código 4401/4403). Persistir `{ userId, orgId }` com `connection.serializeAttachment()` para sobreviver à hibernação.

- [ ] **Step 4: Rodar e confirmar passe**

Run: `pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.auth.test.ts`
Expected: PASS (recusa os dois primeiros, aceita o terceiro).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/EvolutionCollaboration.ts apps/api/src/agents/__tests__/EvolutionCollaboration.auth.test.ts
git commit -m "feat(collab): auth no upgrade do WS (JWT + org + RBAC)"
```

---

## Task 5: Persistência `onLoad`/`onSave` (snapshot Yjs + HTML no Neon)

**Files:**
- Modify: `apps/api/src/agents/EvolutionCollaboration.ts`
- Test: `apps/api/src/agents/__tests__/EvolutionCollaboration.persist.test.ts`

**Interfaces:**
- Consumes: `yDocToHtml` (Task 1), coluna `observacao_ydoc` (Task 2), `YServer` (Task 3).
- Produces: DO que restaura do snapshot ao abrir e grava snapshot+HTML debounced.

- [ ] **Step 1: Escrever o teste de persistência (RED)**

`EvolutionCollaboration.persist.test.ts` (Neon mockado — capturar os parâmetros do UPDATE):
- `onSave`: após uma edição, dispara um UPDATE em `sessions` setando `observacao_ydoc` (bytes = `Y.encodeStateAsUpdate(doc)`) e `observacao` (HTML contendo o texto digitado). Usar `runDurableObjectAlarm`/avanço de tempo para forçar o debounce.
- `onLoad`: com `observacao_ydoc` pré-populado (um snapshot de "Olá"), ao abrir a sala o Y.Doc contém "Olá".

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.persist.test.ts`
Expected: FAIL (sem onLoad/onSave).

- [ ] **Step 3: Implementar `onLoad`/`onSave`**

```ts
import * as Y from "yjs";
import { yDocToHtml } from "@fisioflow/evolution-editor-schema";
import { getDb } from "../lib/db"; // usar o helper de conexão Neon existente

// dentro da classe EvolutionCollaboration:
async onLoad(): Promise<void> {
  const db = getDb(this.env);
  const rows = await db /* SELECT observacao_ydoc FROM sessions WHERE id = this.name */;
  const snap = rows[0]?.observacao_ydoc as Uint8Array | null | undefined;
  if (snap && snap.byteLength > 0) Y.applyUpdate(this.document, snap);
}

async onSave(): Promise<void> {
  const update = Y.encodeStateAsUpdate(this.document);
  const html = yDocToHtml(this.document);
  const db = getDb(this.env);
  try {
    await db /* UPDATE sessions SET observacao_ydoc = $1, observacao = $2 WHERE id = $3 */;
  } catch (err) {
    console.error("[EvolutionCollaboration] onSave falhou:", err);
    // estado segue em memória; próximo onSave re-tenta. Evento no Analytics:
    this.env.ANALYTICS?.writeDataPoint?.({ blobs: ["collab_save_error", this.name], doubles: [1] });
  }
}
```
> Usar o mesmo padrão de acesso ao DB das outras rotas (`getDb`/`createDb` + `pg`/drizzle) e o binding `ANALYTICS` existente. `this.name` = room = `sessionId`.

- [ ] **Step 4: Rodar e confirmar passe**

Run: `pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.persist.test.ts`
Expected: PASS (onSave grava ydoc+HTML; onLoad restaura).

- [ ] **Step 5: type-check + commit**

Run: `pnpm workers:type-check` (0 erros).
```bash
git add apps/api/src/agents/EvolutionCollaboration.ts apps/api/src/agents/__tests__/EvolutionCollaboration.persist.test.ts
git commit -m "feat(collab): persistência onLoad/onSave (snapshot Yjs + HTML)"
```

---

## Task 6: Cliente — provider `y-partyserver` + JWT + offline

**Files:**
- Modify: `apps/web/package.json` (deps)
- Modify: `src/components/ui/RichTextEditor.tsx`
- Test: `src/components/ui/__tests__/RichTextEditor.collab.test.tsx`

**Interfaces:**
- Consumes: `evolutionEditorExtensions` (Task 1); DO da Task 3-5; `getNeonAccessToken()` (`src/lib/auth/neon-token.ts`).
- Produces: `RichTextEditor` que, com `collaborationId`, conecta via `y-partyserver` autenticado, com persistência offline.

- [ ] **Step 1: Instalar deps do cliente**

Run:
```bash
pnpm --filter fisioflow-web add y-partyserver y-indexeddb
```
(Confirmar versão de `y-partyserver` idêntica à do server, Task 3.) `yjs` e as extensões TipTap já existem em `apps/web/package.json`.

- [ ] **Step 2: Escrever o teste (RED)**

`src/components/ui/__tests__/RichTextEditor.collab.test.tsx`: mockar `y-partyserver/provider` e `@/lib/auth/neon-token`. Assertar que, ao montar `RichTextEditor` com `collaborationId="sess-1"`, o provider é construído com o room `"sess-1"` e um `params` que resolve `{ token }` a partir de `getNeonAccessToken()`.

- [ ] **Step 3: Rodar e confirmar falha**

Run: `pnpm --dir apps/web exec vitest run src/components/ui/__tests__/RichTextEditor.collab.test.tsx`
Expected: FAIL (ainda usa `WebsocketProvider` do `y-websocket`).

- [ ] **Step 4: Trocar o provider no `RichTextEditor.tsx`**

No `useEffect` de colaboração (hoje em `src/components/ui/RichTextEditor.tsx:229-251`), substituir `new WebsocketProvider(...)` por `y-partyserver`:
```ts
import YProvider from "y-partyserver/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
// ...
const doc = new Y.Doc();
setYdoc(doc);
const idb = new IndexeddbPersistence(collaborationId, doc);
const host = new URL(getWorkersApiUrl()).host;
const p = new YProvider(host, collaborationId, doc, {
  party: "evolution_collaboration",
  params: async () => ({ token: (await getNeonAccessToken()) ?? "" }),
});
setProvider(p);
return () => { p.destroy(); idb.destroy(); doc.destroy(); };
```
Ajustar tipos de `provider`/`setProvider` de `WebsocketProvider` para o tipo do `YProvider`. Usar `evolutionEditorExtensions` do pacote compartilhado nas extensões de documento do editor (mantendo `Collaboration`/`CollaborationCursor`/`Placeholder` no cliente). Confirmar o valor de `party`/`prefix` conforme o roteamento definido na Task 3.

- [ ] **Step 5: Rodar e confirmar passe + type-check**

Run:
```bash
pnpm --dir apps/web exec vitest run src/components/ui/__tests__/RichTextEditor.collab.test.tsx
pnpm type-check
```
Expected: PASS; 0 erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json src/components/ui/RichTextEditor.tsx src/components/ui/__tests__/RichTextEditor.collab.test.tsx
git commit -m "feat(collab): cliente usa y-partyserver autenticado + offline (y-indexeddb)"
```

---

## Task 7: Cliente — ligar colaboração + fallback clássico + presença

**Files:**
- Modify: `src/pages/PatientEvolution.tsx` (linha ~687: `collaborationId`)
- Modify: `src/components/evolution/v2-improved/NotionEvolutionPanel.tsx` (gating do autosave)
- Create: `src/components/evolution/CollaborationPresence.tsx`
- Test: `src/components/evolution/__tests__/collaboration-fallback.test.tsx`

**Interfaces:**
- Consumes: `RichTextEditor` colaborativo (Task 6).
- Produces: evolução com colaboração ligada por padrão + fallback + presença.

- [ ] **Step 1: Escrever o teste da máquina de dois estados (RED)**

`src/components/evolution/__tests__/collaboration-fallback.test.tsx` (mockando o provider):
- provider conecta (evento `status: "connected"`/`synced`) → o autosave clássico NÃO é chamado (a escrita é do DO).
- provider falha ao conectar (timeout/erro) → o editor remonta em modo clássico: carrega `observacao` e o autosave clássico volta a ser chamado ao digitar.

- [ ] **Step 2: Rodar e confirmar falha**

Run: `pnpm --dir apps/web exec vitest run src/components/evolution/__tests__/collaboration-fallback.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Ligar `collaborationId` e implementar a máquina de dois estados**

- `src/pages/PatientEvolution.tsx:687`: `collaborationId={undefined}` → `collaborationId={sessionId}` (o id da sessão de evolução em foco).
- No `NotionEvolutionPanel` (v2-improved), introduzir um estado `collabStatus: "connecting" | "connected" | "fallback"` derivado dos eventos do provider: `connected` desliga o autosave clássico (o DO é o escritor); em falha/timeout (~5s sem conectar) vira `fallback`, que **remonta** o editor sem colaboração (carrega `observacao`, autosave clássico ligado). Remontar via `key` diferente no `RichTextEditor` para os dois modos.

- [ ] **Step 4: Implementar o indicador de presença**

`src/components/evolution/CollaborationPresence.tsx`: lê o `awareness` do provider (`provider.awareness.getStates()`), renderiza avatares/nome dos usuários online (PT-BR, sem glassmorphism, superfícies sólidas). Montado no cabeçalho do painel de evolução quando `collabStatus === "connected"`.

- [ ] **Step 5: Rodar e confirmar passe + type-check**

Run:
```bash
pnpm --dir apps/web exec vitest run src/components/evolution/__tests__/collaboration-fallback.test.tsx
pnpm type-check
```
Expected: PASS; 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PatientEvolution.tsx src/components/evolution/v2-improved/NotionEvolutionPanel.tsx src/components/evolution/CollaborationPresence.tsx src/components/evolution/__tests__/collaboration-fallback.test.tsx
git commit -m "feat(collab): ligar colaboração na evolução + fallback clássico + presença"
```

---

## Task 8: E2E (Playwright) — convergência, presença, fallback

**Files:**
- Create: `e2e/flows/evolucao-colaborativa.spec.ts`

**Interfaces:**
- Consumes: tudo anterior (feature ponta-a-ponta).

- [ ] **Step 1: Escrever o E2E (RED até a feature estar deployada em staging/local)**

`e2e/flows/evolucao-colaborativa.spec.ts`: dois `browser.newContext()` autenticados abrindo a mesma evolução; A digita → B vê o texto (convergência); B aparece na presença de A; matar/derrubar o WS de A → A continua editando (fallback) sem erro. Seguir o padrão dos specs em `e2e/flows/`.

- [ ] **Step 2: Rodar o E2E**

Run: `cd e2e && npx playwright test flows/evolucao-colaborativa.spec.ts`
Expected: PASS contra o ambiente onde a feature está rodando (local `pnpm dev` / staging). Se depender de deploy, marcar como pendente de ambiente e rodar após deploy.

- [ ] **Step 3: Commit**

```bash
git add e2e/flows/evolucao-colaborativa.spec.ts
git commit -m "test(collab): E2E de convergência, presença e fallback"
```

---

## Self-Review

- **Cobertura do spec:** pacote compartilhado (T1) ✓; snapshot Yjs col (T2) ✓; DO y-partyserver + SQLite + roteamento (T3) ✓; auth JWT+org+RBAC (T4) ✓; onLoad/onSave ydoc+HTML via static-renderer (T5) ✓; cliente provider+JWT+offline (T6) ✓; ligar + fallback + presença (T7) ✓; testes DO/cliente/E2E ✓; spike-gate como T1 ✓. Fora de escopo (blocos estruturados, hibernação no meio, WebRTC) permanece fora.
- **Placeholders:** os pontos version-sensitive (`renderToHTMLString` import, helper de roteamento partyserver, hook de auth, sintaxe da migração SQLite do DO) têm um Step explícito de confirmação via ctx7 com o shape esperado — não são "TODO", são verificações necessárias de API de terceiros (o próprio spec exige).
- **Consistência de tipos/nomes:** `evolutionEditorExtensions` e `yDocToHtml(doc)` iguais em T1/T5/T6; `EvolutionCollaboration extends YServer` de T3 usado em T4/T5; `collaborationId`/room = `sessionId` consistente T3/T6/T7; `observacao_ydoc` (T2) usado igual em T5.
- **Risco:** concentrado em T1 (gate) e nas confirmações de API de T3; ambos resolvidos antes de construir a parte pesada.
