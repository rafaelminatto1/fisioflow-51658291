# Evolução Colaborativa em Tempo Real — Design

**Data:** 2026-07-05 (revisado após pesquisa context7/exa/Cloudflare docs)
**Status:** Aprovado (brainstorm) — pronto para plano de implementação
**Autor:** brainstorm com Rafael

## Objetivo

Ligar edição colaborativa em tempo real da **observação (texto rico)** da evolução clínica, tipo Google Docs: vários fisioterapeutas editando a mesma evolução ao vivo, com cursores e presença, de forma robusta e rápida. Hoje a feature existe como scaffolding mas está **desligada** (`PatientEvolution.tsx:687` passa `collaborationId={undefined}`); o que persiste a evolução é um autosave TipTap de um usuário em `sessions.observacao`.

## Decisões travadas (brainstorm)

1. **Fonte da verdade:** um Durable Object por evolução é o **servidor Yjs autoritativo** e o **único** que grava em `sessions.observacao`. O autosave do cliente é desligado quando a colaboração está ativa. Fora de colaboração, nada muda.
2. **Escala:** 2-3 editores simultâneos por evolução. Dimensionar para latência baixa e custo mínimo, sem complexidade de escala alta.
3. **Escopo de conteúdo:** apenas a observação de texto rico. Campos estruturados (medidas, exercícios, escala de dor) continuam de um usuário com o save atual.
4. **Rollout:** sempre ligado, com **fallback gracioso** — se o WebSocket não conectar, o editor remonta em modo clássico de um usuário (autosave atual). Editar nunca quebra.
5. **Segurança:** o DO exige **JWT válido + mesma organização + permissão de editar evolução** (RBAC atual: fisio/admin/estagiário; paciente nunca) no upgrade do WebSocket. Hoje não há autenticação nenhuma no WS.
6. **Contexto:** o projeto **não tem dados reais ainda** — mudanças que quebram compatibilidade são aceitáveis; sem migração conservadora.

## Decisões de arquitetura (pós-pesquisa)

Pesquisa (context7 + exa + Cloudflare docs, jul/2026) mudou a arquitetura para reduzir código customizado e eliminar o maior risco técnico:

- **`y-partyserver`** (biblioteca oficial `cloudflare/partykit`) como backend Yjs no DO. Resolve, mantido pela Cloudflare: protocolo de sync, awareness (presença/cursores), broadcast, reconexão com backoff no cliente, e persistência debounced via hooks `onLoad`/`onSave`. Substitui o servidor Yjs que seria escrito à mão.
- **Snapshot binário Yjs persistido no Neon** (coluna nova `sessions.observacao_ydoc BYTEA`), restaurado no `onLoad` (`Y.applyUpdate`) e salvo no `onSave` (`Y.encodeStateAsUpdate`). Isso **elimina a conversão HTML→Yjs** (que exigiria um DOM no runtime dos Workers via happy-dom/zeed-dom — suporte incerto). Como não há dados reais, evolução nova começa vazia; nada de legado para converter.
- **`@tiptap/static-renderer` (`renderToHTMLString`)** para gerar o HTML de `sessions.observacao` a partir do JSON ProseMirror. A doc confirma: "pure JavaScript function... doesn't require a browser, DOM or even an editor instance" → roda no Workers. É a direção Yjs→HTML, a única de conversão que precisamos.
- **Durable Object com SQLite** (`new_sqlite_classes`) conforme guia "Rules of Durable Objects" (Cloudflare, dez/2025): melhor performance + PITR de 30 dias. O DO atual é KV (`new_classes`); sem dados reais, trocamos.
- **Trade-off aceito:** com `y-partyserver` o DO **não hiberna no meio da sessão** (o Y.Doc precisa ficar em memória para fundir CRDT). Ele fica quente enquanto há clientes e é **despejado quando a sala esvazia**. Para 2-3 pessoas em sessões curtas, o custo é baixo; o ganho (biblioteca oficial + snapshot sem perda + menos código) supera a hibernação no meio da sessão.

Alternativas descartadas: **Liveblocks** (SaaS — dados de saúde sairiam do Cloudflare/Neon, LGPD/custo, fere o "100% Cloudflare+Neon"); **Hocuspocus** (exige servidor Node persistente + Redis, não é serverless); **servidor Yjs à mão** (mais código e risco que `y-partyserver`).

## Arquitetura

```
Cliente (TipTap + Yjs)         Durable Object (SQLite)          Neon
- Collaboration ext            YServer (y-partyserver)          sessions.observacao (HTML)
- CollaborationCursor          - Y.Doc autoritativo em memória  sessions.observacao_ydoc (BYTEA)
- y-partyserver/provider       - onLoad() <- ydoc do Neon
  (params: JWT, backoff)       - onSave() -> ydoc + HTML (debounced 2s/10s)
- y-indexeddb (offline)        - auth no connect (JWT+org+RBAC)
```

**Fluxo de uma edição:**
1. Cliente abre a evolução → `YProvider` conecta em `/api/sessions/:id/collaboration`, passando o JWT via `params: async () => ({ token })`.
2. DO autentica no lifecycle da conexão (valida JWT, carrega a sessão do Neon, confirma org + papel). Falhou → recusa (cliente cai no modo clássico).
3. `onLoad()` (primeira conexão): busca `observacao_ydoc` do Neon; se existir, `Y.applyUpdate(this.document, snapshot)`. Se vazio (evolução nova), começa vazio.
4. Edições vão ao DO via `y-partyserver`, que funde (CRDT) e reflete aos clientes com cursores/presença.
5. `onSave()` (debounced 2s, máx 10s, e ao esvaziar): grava no Neon `observacao_ydoc = Y.encodeStateAsUpdate(this.document)` e `observacao = renderToHTMLString({ extensions, content: yDocToJSON(this.document) })`. Numa transação.
6. Todos saem → `onSave` final; DO despejado (custo para).

## Componentes e interfaces

### 1. `packages/evolution-editor-schema/` (NOVO — linchpin)
Conjunto de extensões **de documento** do editor de evolução (negrito, títulos, listas, tabelas, etc. — define o schema ProseMirror), importado **tanto** pelo cliente **quanto** pelo DO. Fonte única → zero drift.
- Exporta: `evolutionEditorExtensions: Extensions`.
- Exporta helper `yDocToHtml(doc: Y.Doc): string` = `y-prosemirror` (`yXmlFragmentToProseMirrorRootNode(doc.getXmlFragment("default"), schema).toJSON()`) → `renderToHTMLString({ extensions: evolutionEditorExtensions, content })`. Sem DOM.
- Extensões só-de-UI (placeholder, cursores) ficam no cliente e NÃO entram no pacote.

### 2. `apps/api/src/agents/EvolutionCollaboration.ts` (REESCRITA sobre `y-partyserver`)
`export class EvolutionCollaboration extends YServer` (de `y-partyserver`). Overrides:
- **Auth no connect:** validar JWT (JWKS existente) do `params.token`; carregar sessão do Neon; confirmar org + papel; senão fechar a conexão. Persistir userId/org por conexão com `serializeAttachment()`.
- `static callbackOptions = { debounceWait: 2000, debounceMaxWait: 10000 }`.
- `onLoad()`: `observacao_ydoc` do Neon → `Y.applyUpdate` (se existir).
- `onSave()`: transação Neon gravando `observacao_ydoc` (binário) + `observacao` (HTML via `yDocToHtml`). Falha → log + evento Analytics; o estado segue em memória e re-tenta no próximo `onSave`.

### 3. `apps/api/src/index.ts` (`handleCollaborationWS`) + `wrangler.toml`
- Roteamento para o DO já existe (`idFromName(sessionId)`). Ajuste conforme o padrão de fetch do `partyserver` (roteamento por `party`/`room`).
- `wrangler.toml`: migração do DO para `new_sqlite_classes`.

### 4. Migration Neon
- Nova migration (próximo número sequencial) adicionando `sessions.observacao_ydoc BYTEA NULL`. Criar `.down.sql`.

### 5. Cliente
- `PatientEvolution.tsx`: passar `collaborationId={sessionId}` (era `undefined`).
- `RichTextEditor.tsx`: trocar `y-websocket`/`WebsocketProvider` por `y-partyserver/provider` (`useYProvider`); `params` com `getNeonAccessToken()`; usar `evolutionEditorExtensions` do pacote compartilhado; adicionar `y-indexeddb`; expor estado de conexão.
- **Máquina de dois estados (antes de montar):** conectou → colaborativo (autosave OFF, presença ON); falhou → **remonta** em modo clássico (carrega `observacao`, autosave ON). Remontar evita troca de extensões em runtime.
- **Presença:** indicador "quem está online" a partir do awareness.

## Casos de borda

- **Acordar/reidratar:** `onLoad` roda ao (re)instanciar a sala; o Y.Doc fica em memória enquanto há clientes.
- **Falha de escrita no Neon:** estado segue em memória; próximo `onSave` re-tenta; evento no Analytics Engine.
- **Auth falha/org errada:** conexão recusada → cliente em modo clássico.
- **Sem escrita dupla:** fallback (autosave cliente) só liga com WS fora, quando o DO não recebe edições.
- **Drift de schema:** teste de ida-e-volta (JSON→HTML estável) trava divergência cliente↔servidor.
- **Sala esvazia:** `onSave` final garante persistência antes do despejo.

## Testes

- **Tarefa 1 (gate):** spike no runtime de Workers (vitest workers pool) provando `Y.Doc → JSON → HTML` (via `yDocToHtml`) roda e é estável com o schema compartilhado. Confirma `@tiptap/static-renderer` no Workers antes de tudo. (Plano B, se falhar: `nodeMapping`/`markMapping` manuais no `renderToHTMLString` para o conjunto conhecido de nós/marcas.)
- **DO (vitest ambiente Workers, `@cloudflare/vitest-pool-workers`):** `env.X.getByName()` + `runDurableObjectAlarm`; dois clientes simulados convergem; `onSave` grava ydoc+HTML (Neon mockado); `onLoad` restaura do snapshot; rejeição de auth (JWT ruim/ausente, org errada).
- **Cliente (Testing Library):** WS conectado desliga autosave; WS falho remonta clássico + autosave ligado.
- **E2E (Playwright):** dois navegadores convergem, presença aparece, matar WS cai no fallback.

## Fora de escopo

- Colaboração nos campos estruturados (medidas/exercícios/escalas) — continuam de um usuário.
- Histórico de versões/replay do Yjs (o `evolution-versions` atual continua como está).
- WebRTC para cursores (otimização de tráfego só necessária em escala grande).
- Hibernação no meio da sessão (incompatível com o modelo de doc-em-memória do `y-partyserver`; desnecessária no caso 2-3 usuários).

## Risco principal (residual, baixo)

`@tiptap/static-renderer` rodar no runtime de Workers. Confirmado pela doc como JS puro sem DOM; validado no spike da Tarefa 1 antes de qualquer outra coisa. Plano B: mappings manuais de nós/marcas no `renderToHTMLString`.

## Dependências novas
- `y-partyserver`, `partyserver` (server + `y-partyserver/provider` no cliente)
- `@tiptap/static-renderer`, `y-prosemirror` (conversão Yjs→HTML no server compartilhado)
- `y-indexeddb` (offline no cliente)
- Verificar via context7/ctx7 as versões atuais compatíveis com o React 19.2 / Vite 8 / TipTap v3 já no projeto, no início do plano.
