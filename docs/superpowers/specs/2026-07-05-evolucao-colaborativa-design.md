# Evolução Colaborativa em Tempo Real — Design

**Data:** 2026-07-05
**Status:** Aprovado (brainstorm) — pronto para plano de implementação
**Autor:** brainstorm com Rafael

## Objetivo

Ligar edição colaborativa em tempo real da **observação (texto rico)** da evolução clínica, tipo Google Docs: vários fisioterapeutas editando a mesma evolução ao vivo, com cursores e presença, de forma robusta e rápida. Hoje a feature existe como scaffolding mas está **desligada** (`PatientEvolution.tsx:687` passa `collaborationId={undefined}`); o que persiste a evolução é um autosave TipTap de um usuário em `sessions.observacao`.

## Decisões travadas (brainstorm)

1. **Fonte da verdade:** o Durable Object (`EvolutionCollaboration`, um por evolução) é o **servidor Yjs autoritativo** e o **único** que grava em `sessions.observacao`. O autosave do cliente é desligado quando a colaboração está ativa. Fora de colaboração, nada muda.
2. **Escala:** 2-3 editores simultâneos por evolução (caso real de clínica). Dimensionar para latência baixa e custo mínimo (WebSocket Hibernation), sem complexidade de escala alta.
3. **Escopo de conteúdo:** apenas a observação de texto rico. Campos estruturados (medidas, exercícios, escala de dor) continuam de um usuário com o save atual.
4. **Rollout:** sempre ligado, com **fallback gracioso** — se o WebSocket não conectar, o editor remonta em modo clássico de um usuário (autosave atual). Editar nunca quebra.
5. **Segurança:** o DO exige **JWT válido + mesma organização + permissão de editar evolução** (RBAC atual: fisio/admin/estagiário; paciente nunca) no upgrade do WebSocket. Hoje não há autenticação nenhuma no WS.
6. **Contexto:** o projeto **não tem dados reais ainda** — mudanças que quebram compatibilidade são aceitáveis; não é preciso migração conservadora nem preservar linhas existentes.

## Arquitetura

```
Cliente (TipTap + Yjs)  <--WebSocket-->  Durable Object       -->  Neon
- Collaboration ext                       EvolutionCollaboration    sessions.observacao (HTML)
- CollaborationCursor                     - Y.Doc autoritativo
- WebsocketProvider                       - state.storage (binário Yjs, durável)
- y-indexeddb (offline)                   - Hibernation API
                                          - alarm() = save debounced
```

**Fluxo de uma edição:**
1. Cliente abre a evolução → WebSocket para `/api/sessions/:id/collaboration`, passando o JWT via subprotocolo.
2. DO autentica (JWT + org + permissão). Falhou → recusa (cliente cai no modo clássico).
3. Primeira conexão numa evolução "fria" (sem estado no storage) → DO carrega o HTML de `sessions.observacao` e semeia o Y.Doc (guard de bootstrap concorrente).
4. Edições vão ao DO, que funde (Yjs, sem conflito) e reflete aos clientes com cursores/presença.
5. DO agenda `alarm` ~2s à frente (coalescido = debounce). Ao disparar: converte Y.Doc → HTML, grava em `sessions.observacao`, persiste o binário Yjs no storage.
6. Todos saem → estado persistido; DO hiberna (custo ~zero) e acorda intacto.

## Componentes e interfaces

### 1. `packages/evolution-editor-schema/` (NOVO — linchpin)
Módulo compartilhado com o conjunto de extensões **de documento** do editor de evolução (negrito, títulos, listas, tabelas, etc. — o que define o schema ProseMirror). Importado **tanto** pelo cliente (`RichTextEditor.tsx`) **quanto** pelo DO. Fonte única → zero drift de schema. Extensões só-de-UI (placeholder, cursores) ficam no cliente.
- Exporta: `evolutionEditorExtensions` (array de extensões de documento) e helpers de conversão `htmlToYDoc(html): Uint8Array` / `yDocToHtml(update: Uint8Array): string` construídos sobre `@tiptap/html` + `zeed-dom` + `y-prosemirror`.

### 2. `apps/api/src/agents/EvolutionCollaboration.ts` (REESCRITA)
Durable Object. Responsabilidades:
- **Upgrade autenticado:** validar JWT (JWKS existente), carregar a sessão do Neon, confirmar org + papel; senão fechar.
- **WebSocket Hibernation:** `state.acceptWebSocket(ws)` + `webSocketMessage` / `webSocketClose` / `webSocketError`.
- **Y.Doc autoritativo:** reidratado de `state.storage` ao acordar; protocolo de sync Yjs (sync step 1/2 + relay de awareness).
- **Bootstrap:** primeira conexão sem estado → semeia do `sessions.observacao` (guard por flag).
- **Persistência debounced:** cada update agenda/coalesce um `alarm(now+~2s)`; em `alarm()` converte Y.Doc → HTML, grava no Neon, persiste binário no storage; re-tenta na próxima em caso de falha (evento no Analytics).

### 3. `apps/api/src/index.ts` (`handleCollaborationWS`)
Já roteia para o DO por `idFromName(sessionId)`. Ajuste: repassar/expor o JWT do subprotocolo ao DO (o DO faz a validação).

### 4. Cliente
- `PatientEvolution.tsx`: passar `collaborationId={sessionId}` (era `undefined`).
- `RichTextEditor.tsx`: passar o JWT (`getNeonAccessToken()`) ao `WebsocketProvider` via subprotocolo; usar `evolutionEditorExtensions` do pacote compartilhado; adicionar `y-indexeddb`; expor estado de conexão.
- **Máquina de dois estados (decidida antes de montar):** WS conectou → modo colaborativo (autosave OFF, presença ON); WS falhou (timeout/erro) → **remonta** em modo clássico (carrega `observacao`, autosave ON). Remontar evita troca de extensões em runtime.
- **Presença:** indicador "quem está online" a partir do awareness do Yjs.

## Casos de borda

- **Bootstrap concorrente:** só o primeiro carrega/semeia (flag no storage); os demais entram no sync.
- **Acordar hibernação:** garantir Y.Doc reidratado antes de aplicar mensagem.
- **Falha de escrita no Neon:** estado seguro no storage durável; próximo `alarm` re-tenta; evento no Analytics Engine.
- **Auth falha/org errada:** WS fechado com código claro → cliente em modo clássico.
- **Sem escrita dupla:** fallback (autosave cliente) só liga com WS fora, quando o DO não recebe edições.
- **Drift de schema:** teste de ida-e-volta trava divergência.

## Testes

- **Tarefa 1 (gate):** spike `HTML → Yjs → HTML` volta completa no runtime de Workers (vitest workers pool) com schema compartilhado + zeed-dom. Plano B: serializador JSON→HTML manual para o conjunto conhecido de nós/marcas.
- **DO (vitest ambiente Workers):** dois clientes convergem; `alarm` debounced = 1 escrita/rajada (DB mockado); bootstrap semeia do `observacao`; rejeição de auth (JWT ruim/ausente, org errada); reidratação pós-hibernação.
- **Cliente (Testing Library):** WS conectado desliga autosave; WS falho remonta clássico + autosave ligado.
- **E2E (Playwright):** dois navegadores convergem, presença aparece, matar WS cai no fallback.

## Fora de escopo

- Colaboração nos campos estruturados (medidas/exercícios/escalas) — continuam de um usuário.
- Histórico de versões/replay do Yjs (o `evolution-versions` atual continua como está).
- Coluna binária Yjs no Neon (o storage durável do DO basta; HTML cobre a formatação).
- Escala > ~10 editores simultâneos.

## Risco principal

Conversão ProseMirror → HTML no runtime de Workers (sem DOM). Mitigação: `@tiptap/html` + `zeed-dom` (suporte oficial edge/Workers); validado no spike da Tarefa 1 antes de qualquer outra coisa; plano B = serializador manual.
