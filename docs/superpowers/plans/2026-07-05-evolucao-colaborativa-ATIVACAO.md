# Evolução Colaborativa — Checklist de Ativação (pré-produção)

A feature está **completa e funcional em código** (8 tasks + gates pós-revisão, na `main`). Os 2 gaps da revisão final foram tratados em 6/jul.

## ⚠️ DESCOBERTA IMPORTANTE (6/jul): HÁ dados reais
Ao investigar os gates, o banco de produção (`purple-union-72678311` / `ep-wandering-bonus`, São Paulo) tem **11.015 sessões, 11.014 com `observacao`** — NÃO está vazio. Portanto os gates eram riscos reais (não teóricos), e **o deploy que LIGA a colaboração mexe com 11k prontuários reais** → decisão do usuário, com validação em staging.

## Status dos gates (RESOLVIDOS em código)
- **Gate 2 (RLS): CLEARED.** `neondb_owner` (role do Worker) tem `rolbypassrls=true` → o DO lê a org da sessão sem contexto. Sem mudança de código.
- **Gate 1 (seeding): FEITO.** O DO (`onLoad`) semeia o Y.Doc a partir do `observacao` HTML quando não há snapshot (zeed-dom→ProseMirror→Yjs, rodando no workerd; commit `8afe4f884`); o cliente parou de semear em modo colaborativo (evita duplicação; commit `4b991b03a` Part B). `<table>`/tasklist/codeblock seed corrigido + `onLoad` à prova de crash (try/catch + Analytics; commit `91a88f6d4`).
- **BINDING (bug crítico descoberto e corrigido):** o editor do cliente NÃO estava de fato ligado ao Y.Doc (o `ySyncPlugin` nunca anexava) — digitar não chegava ao doc. Corrigido tornando o `Y.Doc` síncrono via `useMemo` (`4b991b03a`), com teste real de propagação. A **edição colaborativa de texto agora funciona de verdade.**

## Remanescente antes de ligar
- **Bump `@tiptap/extension-collaboration-cursor` 2.26.2 → ^3.x**: está incompatível com `@tiptap/core@3` e crasharia se os cursores in-editor montassem. Por isso os cursores coloridos dentro do texto ficam **inertes** por enquanto (a presença por avatar via awareness FUNCIONA). Bump simples resolve.

## 🔴 Gate 1 (Crítico) — seeding de sessões com conteúdo existente
Sessões antigas têm `observacao` (HTML) mas `observacao_ydoc` NULL. O `onLoad` do DO só semeia a partir do snapshot binário; o cliente, em modo colaborativo, monta o editor com `content` do prop enquanto a extensão `Collaboration` está ligada a um fragmento vazio no servidor → padrão perigoso do TipTap+Yjs. Risco: descartar a `observacao` existente OU duplicar a nota se dois abrirem a mesma sessão nunca-colaborada ao mesmo tempo. Auto-corrige após o primeiro save single-user limpo.

**Antes de ligar para sessões com conteúdo, escolher UMA:**
- (a) Backfill: migration que popula `observacao_ydoc` a partir de `observacao` (precisa de HTML→Yjs no servidor — reintroduz a dependência de DOM tipo happy-dom/zeed-dom que evitamos; avaliar custo).
- (b) Semeadura no servidor: `onLoad` converte `observacao` HTML → Y.Doc quando o snapshot é NULL (mesma dependência HTML→PM).
- (c) Gate de rollout: habilitar colaboração só para sessões NOVAS (sem `observacao` pré-existente) até (a)/(b) existir.
- **Como não há dados reais agora, (c) é suficiente para começar.** Validar em staging com um registro legado real antes de expandir.

## 🟠 Gate 2 (Importante) — contexto de org / RLS no Durable Object
O DO chama `getRawSql(env, …)` (loadSessionOrgId/onLoad/onSave) **fora** de `runWithOrg`, então `app.org_id` não é setado. Se o role de DB do Worker aplicar RLS em `sessions`, o `SELECT org_id` volta vazio → toda conexão fecha `4403` → feature morta. As suítes mockam o DB, então o CI não pega isso.
**Ação:** validar em staging que uma conexão real chega a `connected` (não 4403). Se falhar, o SELECT de bootstrap do DO precisa rodar num caminho que ignore RLS (o DO precisa descobrir a org ANTES de saber a org — é intrinsecamente pré-org).

## Passo a passo de deploy (ordem obrigatória)
1. **Aplicar a migration `0139`** no Neon de produção (`observacao_ydoc BYTEA NULL`). (Ainda não aplicada.)
2. **Deploy do código atual = wrangler v13** (rebind `EVOLUTION_COLLABORATION` → `EvolutionCollaborationSql`; a classe KV antiga continua exportada como stub 410). **NÃO** adicionar `deleted_classes` neste deploy.
3. **Validar em staging:** Gate 2 (conexão chega a `connected`) e Gate 1 (abrir sessão com `observacao`, single-user e depois dois-user, sem perda/duplicação).
4. **Ligar para usuários** só após Gate 1 resolvido/validado — idealmente com rollout por organização.
5. **Deploy futuro separado = wrangler v14:** adicionar `deleted_classes=["EvolutionCollaboration"]` e remover a classe stub 410 (a Cloudflare proíbe delete+rebind no mesmo deploy).

## Backlog (defer — não bloqueia ligar, mas fazer)
- Task 4: `console.error` no erro de JWT pode logar token cru em alguns paths — scrub (1 linha, defense-in-depth).
- Task 7: queda de rede PÓS-conexão não re-arma o fallback clássico (só timeout de conexão inicial). O `y-indexeddb` + reconexão do y-partyserver cobrem, mas o usuário não tem aviso visível de que o save ao vivo parou → adicionar indicador "reconectando/offline".
- Task 7: foco/cursor/undo perdidos no remount único undefined→id (conteúdo é preservado; cosmético).
- Task 7: atributo `data-collab-status` fica no DOM de produção (E2E depende dele).
- E2E `e2e/flows/evolucao-colaborativa.spec.ts` só roda com stack vivo + `E2E_EMAIL`/`E2E_PASSWORD` (idealmente `E2E_EMAIL_B` para presença real de 2 usuários). É o gate real de staging para os Gates 1 e 2.
- Web: ~90 erros de type-check PRÉ-EXISTENTES (de outra feature, não desta) — fora de escopo.

## Positivos confirmados na revisão final
Fidelidade de schema cliente↔servidor real (ambos usam `getXmlFragment("default")` + `evolutionEditorExtensions`); contrato auth/provider/roteamento correto (socket vai exatamente para `/api/sessions/:id/collaboration?…&token=…`); "Replicar" conectado NÃO duplica escrita do texto; testes reais (não tautológicos); migração wrangler v13 na ordem certa.
