# Tasks: Expansão Cloudflare AI

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## US1 — Indexação imediata no publish (P1)

- [x] T001 — Commitar diff pendente do `apps/api/wrangler.toml` (reativação binding `AI_SEARCH` em default + production) e deployar; smoke: `GET /api/ai-search/status` (ou equivalente) confirma binding ativo
- [x] T002 — Teste Vitest: helper `serializeWikiPageForIndex(page)` → markdown determinístico com frontmatter de metadata (slug, category, tags, org)
- [x] T003 — Implementar `uploadWikiPage(env, page)` em `lib/cloudflareAiSearch.ts` usando `env.AI_SEARCH.get("fisioflow-rag").items.uploadAndPoll()`; chamar no hook de publish em `routes/wiki.ts` (substitui disparo do WikiSyncWorkflow no publish)
- [x] T004 — Remover item do índice ao despublicar/excluir página (Items API delete); teste cobrindo os dois caminhos
- [x] T005 — Manter WikiSyncWorkflow apenas como reconciliação cron; atualizar comentário/cabeçalho do workflow e validar que payload `publish` foi removido dos callers

## US2 — "Pergunte à Wiki" Cmd+K (P1)

- [x] T010 — Rota `POST /api/ai-search/ask` (ou reuso da existente em `routes/aiSearch.ts`): query → resposta gerada + `sources[]`; threshold de score com fallback "sem resposta"; evento `wiki_search`/`wiki_search_miss` no Analytics Engine; testes Vitest (threshold, roles)
- [x] T011 — Componente `WikiAskPalette` (Cmd+K) em `src/components/wiki/`: input, resposta streaming/loading, lista de fontes linkando `/wiki/:slug`; PT-BR; sem glassmorphism
- [x] T012 — Restringir a roles internos (admin/fisio/estagiário) no backend e ocultar entrada na UI p/ paciente
- [ ] T013 — E2E Playwright: abrir paleta, perguntar, ver resposta com fonte clicável; caso sem resultado

## US3 — Indexar protocolos, exercícios e PDFs (P1)

- [x] T020 — Testes + helpers `serializeProtocolForIndex` / `serializeExerciseForIndex` (markdown com metadata `{type, org_id}`)
- [x] T021 — Workflow/step de carga inicial (manual): upload dos 119 protocolos + 248 exercícios via Items API
- [x] T022 — Hooks incrementais nas rotas de mutation de protocolos/exercícios (create/update/delete → upload/replace/remove)
- [x] T023 — Ingestão de PDFs de referência no RAG: endpoint admin `POST/GET/DELETE /api/clinical-docs` (R2 fonte da verdade + AI Search índice; PDF parseado nativamente, validado por PoC). PDFs de paciente NÃO entram (curadoria admin-only, sem RLS no índice). UI `ClinicalDocsManager` no admin + filtro 'Documentos' no Cmd+K.
- [x] T024 — Filtro por tipo de conteúdo (wiki/protocolo/exercício/documento) na UI do Cmd+K usando metadata filters

## US4 — Assistente do app do paciente (P2)

- [x] T030 — Migration: coluna `patient_visible BOOLEAN DEFAULT false` em `wiki_pages` (+ `.down.sql`); toggle na UI de edição da wiki
- [x] T031 — Criar instância `fisioflow-rag-paciente` (namespace binding ou dashboard); sync apenas de páginas `patient_visible = true`
- [x] T032 — Rota `POST /api/patient/assistant` autenticada (role paciente), consultando somente a instância paciente; disclaimer fixo na resposta; evento `patient_assistant_query`
- [ ] T033 — Ativar guardrails do AI Gateway (moderação in/out) nas chamadas dessa rota; ativar cache do gateway p/ FAQ repetida
- [ ] T034 — UI no app do paciente (tela de dúvidas) consumindo a rota; PT-BR; testes do fluxo

## US5 — Painel de lacunas da wiki (P2)

- [x] T040 — Garantir evento `wiki_search_miss` (T010) com blob da query normalizada
- [x] T041 — Rota `GET /api/analytics/wiki-gaps`: SQL no Analytics Engine agregando misses 30d; teste
- [x] T042 — Card "Perguntas sem resposta" no dashboard admin

## US6 — Sugestões contextuais na evolução (P2)

- [x] T050 — Hook `useWikiSuggestions(text)` com debounce ≥ 800ms + AbortController; busca híbrida `retrieval-only` (sem geração)
- [x] T051 — Painel lateral discreto no editor de evolução (NotionEvolutionPanel) listando títulos relacionados; medir zero jank na digitação

## US7 — Agent Memory fallback pgvector (P3)

- [x] T060 — Migration `agent_memories` (org_id, patient_id?, therapist_id?, profile_types, content, embedding vector, created_at) + índice HNSW + RLS; `.down.sql`
- [x] T061 — Testes do driver: remember → embedding bge-m3 + insert; recall → cosine top-k com filtros de escopo
- [x] T062 — Refatorar `lib/agentMemory.ts` p/ interface `MemoryDriver` com implementações `pgvector` e `native` (binding); seleção runtime; rotas inalteradas
- [x] T063 — Integrar recall no `PatientAgent`/sumários de sessão (contexto de preferências); respeitar `lgpd_consents`
- [ ] T064 — Quando beta liberar: descomentar bindings `agent_memory` no wrangler.toml, criar namespace `fisioflow-memory`, smoke test do driver nativo, migrar memórias existentes (script one-shot)

## US8 — Human-in-the-loop WhatsApp (P3)

- [x] T070 — Classificação auto-send vs needs-approval nas respostas do bot (regras + categoria do intent); testes
- [x] T071 — Migration fila `whatsapp_pending_replies` (+ auditoria aprovador/timestamp); rotas approve/edit/reject
- [x] T072 — UI de fila de aprovação no dashboard (lista + ações); notificação ao admin de item pendente

## US9 — Chat useAgent com ClinicAgent (P3)

- [x] T080 — Adaptar `ClinicAgent` para o protocolo do Agents SDK (WebSocket/state sync) se necessário
- [x] T081 — Front: `useAgent` + componente de chat com streaming e tool-use visível (agenda, wiki); roles internos
- [ ] T082 — E2E do fluxo de chat

## Transversais

- [ ] T090 — Atualizar `specs/cloudflare-platform-roadmap/binding-inventory.md` com instâncias AI Search e (futuro) Agent Memory
- [ ] T091 — Monitorar changelog do AI Search p/ anúncio de pricing (fim do open beta) — coberto por rotina agendada externa

## Status da execução (2026-06-12)

Implementado e commitado em `feat/cloudflare-ai-expansion` (US1–US9). Infra aplicada:
migrations 0109/0110/0111 em produção (Neon), instância `fisioflow-rag-paciente`
criada (`wrangler ai-search create --type builtin`), dry-run de deploy validado
com os dois bindings AI Search.

Pendências conscientes:
- T013/T082: E2E Playwright dos fluxos novos
- T023: conectar CLINICAL_DOCS_BUCKET como data source (dashboard AI Search) — instâncias builtin recebem upload direto; avaliar instância dedicada p/ PDFs
- T033: guardrails do AI Gateway = configuração manual no dashboard
- T034: tela de dúvidas no app RN do paciente (rota /api/patient/assistant pronta)
- T064: aguarda liberação do Agent Memory beta (rotina de aviso ativa)
- T071-parcial: notificação push ao admin sobre item pendente (fila + UI prontas)
- T081: chat usa RPC HTTP autenticado ao DO (não WebSocket useAgent) — decisão p/ reaproveitar auth JWT existente
- T090/T091: inventário de bindings + monitorar pricing do AI Search


## Atualização 2026-06-14 — entregue e validado em produção

- **Deploy**: PRs #119/#122/#123/#124/#126/#127 mergeados; produção (api + web) no ar e validada com login real.
- **Conteúdo paciente**: 12 páginas `orientacoes-paciente` (patient_visible) indexadas em `fisioflow-rag-paciente` e em `fisioflow-rag` (busca da equipe).
- **Guardrails**: ativados no dashboard (Firewall, all categories Flag; cache 1h). Geração roteada pelo gateway:
  - `/api/patient/assistant`: retrieval (searchAiSearchOn) + geração (callAI) → passa pelo gateway. Guardrail local determinístico (autoagressão/urgência/medicação).
  - `/api/ai-search/ask` (staff): também refatorado p/ retrieval + callAI → gateway.
  - 6 chamadas `env.AI.run` de geração migradas p/ `runAi` (gateway).
- **Fix de produção**: `retrieval_type` default `hybrid`→`vector` (instâncias built-in só têm índice vetorial) — corrigia 500 em /ask, /patient/assistant, /suggest.
- **Pendente do usuário (dashboard, sem token p/ agente)**: aba Settings do gateway — Rate Limit (30/60s), Retry (2), Spend Limits (US$10/mês opcional). Acompanhar aba Logs ~1 semana e migrar categorias de Flag→Block conforme abuso real. AI Search continua em open beta (monitorar pricing). Agent Memory beta: rotina diária avisa quando liberar (T064).


## Nota T023 (2026-06-14): filtragem por tipo no AI Search built-in
Descoberto na validação: a filtragem por metadata customizada (ex.: source=clinical-doc)
NÃO funciona sem declarar campos (até 5/instância via custom_metadata na criação); e o
filtro por `folder` funciona via REST mas NÃO via binding env.AI_SEARCH.search(). Por isso
o chip "Documentos" foi removido — os PDFs de referência são recuperados na busca PADRÃO
("Pergunte à Wiki" sem filtro), validado em produção (score 0.81). Os chips de tipo
pré-existentes (Wiki/Protocolos/Exercícios) também dependem de source filter e são
não-funcionais — limpeza/declaração de campos fica como follow-up separado.
