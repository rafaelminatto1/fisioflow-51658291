# FisioFlow — Plataforma de IA, Conhecimento Clínico e Automação (Jun/2026)

Documentação das capacidades entregues nas PRs **#136–#182**. Tudo em produção
(`fisioflow-api.rafalegollas.workers.dev` + `www.moocafisio.com.br`), validado ao vivo.

> Stack: Cloudflare Workers (Hono) + Neon Postgres 17 (Hyperdrive, RLS por `app.org_id`) +
> Workers AI (via AI Gateway) + R2 + Cloudflare Workflows/Queues/Durable Objects + React 19/Vite/Tailwind v4.

---

## 1. Evidence Gateway (evidência científica — PubMed/Europe PMC)

Busca, cacheia e vincula artigos científicos a entidades clínicas.

- **Migração:** `0115_evidence_gateway.sql` — `evidence_articles` (cache global, `embedding vector(1024)`) + `evidence_links` (vínculos por org, RLS).
- **Lib:** `apps/api/src/lib/evidence/` (ncbiClient, sources/pubmed, sources/europepmc, rank, cache, summarize). Rate-limit NCBI via D1.
- **Endpoints** (`/api/evidence`):
  - `GET /search?q=&limit=` — busca PubMed (cache KV+Neon). Exporta `runSearch()` reusado pelo Copilot e MCP.
  - `GET /article/:pmid/fulltext` · `POST /summarize` · `GET /library`
  - `POST /save` — vincula artigo a alvo (`{pmid, targetType, targetId}`).
  - **`GET /links?targetType=&targetId=`** — artigos vinculados a um alvo (#172).
  - **`DELETE /link/:id`** — desvincula (#172).
  - **`GET /cid10/:code`** — mapa curado CID-10 (fisioterapia) → label PT + query PubMed (#174).
- **CID-10 → PubMed:** `apps/api/src/lib/evidence/cid10Physio.ts` — ~27 códigos (M-series + neuro) com fallback por prefixo.
- **UI:** `/exercicios/:id/evidencia` — lista/busca/vincula/remove evidência de um exercício (#180).
- **Secrets:** `NCBI_API_KEY`, `NCBI_EMAIL`.

## 2. Ingestão e Curadoria de Exercícios (free-exercise-db)

- **Migração:** `0116_exercise_provenance_curation.sql` — provenance + `exercise_import_candidates`.
- **Lib:** `apps/api/src/lib/exerciseImport/` (mapFreeExerciseDb, normalize/dedup, ingest).
- **Endpoints** (`/api/exercise-import`): `POST /ingest` (importou **873** candidatos), `GET /candidates?status=`, `POST /candidates/:id/approve` (promove a exercício real), `POST /candidates/:id/reject`.
- **UI:** `/exercicios/curadoria` — revisar/aprovar/rejeitar candidatos (#179).

## 3. Busca Semântica de Exercícios (pgvector + bge-m3)

- **Migração:** `0117_exercises_embedding_1024.sql` — `exercises.embedding vector(1024)`.
- **Embeddings:** `generateEmbedding1024` (bge-m3, **1024d**) em `ai-native.ts`. ⚠️ NÃO usar `generateEmbedding` (bge-base, 768d) para `exercises.embedding` — dimensão incompatível (corrigido em #177).
- **Backfill:** `POST /api/exercises/embeddings/backfill` (admin, lotes de 20) — **398/398** exercícios embedados.
- **Busca:** `GET /api/exercises/search/semantic?q=` — tenta AI Search; fallback pgvector (`cosineDistance`); fallback texto.
- **UI:** `/exercicios/busca-ia` — busca semântica com score de similaridade (#178).

## 4. AI Search / AutoRAG (RAG sobre wiki + exercícios)

- **Binding:** `[[ai_search]] binding="AI_SEARCH" instance="fisioflow-rag"` (wrangler.toml). `AI_SEARCH_PATIENT` separado.
- **Ingestão:** `contentIndexing.ts` → `AI_SEARCH.items.upload(...)` (sync de exercícios/protocolos no create/update).
- **Endpoints** (`/api/ai-search`): `/ask` (RAG com fontes, role profissional), `/search`.
- **UI:** `/base-conhecimento` — Q&A com resposta fundamentada + fontes/scores (#181).

## 5. AI Copilot Clínico (tool-calling)

- **Lib:** `apps/api/src/lib/copilot/` (runCopilot loop OpenAI-threading, workersAiAdapter) + `agents/tools.ts`.
- **Modelo:** `llama_3_1_8b` (`-fast` = formato de tools OpenAI/vLLM). Tools: `search_evidence` (traduz query PT→EN, cita título/PMID/ano), `search_exercises`, `get_patient_history`, `schedule_session`.
- **Endpoint:** `POST /api/copilot/chat` (`{messages}` → `{answer, toolCalls}`).
- **UI:** `/copiloto` — chat com chips de ferramenta usada (#162).

## 6. Automação (motor + Workflow durável + canvas visual)

- **Migração:** `0119_automations.sql` (RLS). Tabela `automations` + `automation_logs`.
- **Libs:** `apps/api/src/lib/automation/` — `types.ts` (Zod discriminatedUnion: trigger/condition/action/wait + edges com branch), `runAutomation.ts` (DAG walker puro), `conditions.ts`, `actionHandlers.ts`, `triggerAutomations.ts` (gated por `AUTOMATION_EXECUTION_ENABLED`).
- **Workflow durável:** `apps/api/src/workflows/automationExecutor.ts` — `AutomationExecutor extends WorkflowEntrypoint` (step.do/step.sleep), grava status `completed` em `automation_logs`.
- **Action handlers:** `send_email`, `send_whatsapp`, `create_task`, `log_event`, **`send_webhook`** (ponte n8n/Make — POST https) (#166).
- **Event bus:** `queue.ts` chama `runAutomationsForEvent` (envolto em `runWithOrg` p/ RLS — fix crítico #154).
- **Endpoints** (`/api/automation`): CRUD + `POST /simulate` (dry-run) + `GET /logs`.
- **UI:** `/automacoes` — canvas React Flow (nós color-coded, paleta, inspector, **TracePanel** da simulação) (#155).

## 7. Editor Modular de Evolução (blocos estilo Notion)

- **Migração:** `0120_sessions_blocks.sql` — `sessions.blocks JSONB`.
- **Backend:** `parseBlocks` (valida id+type, tipos: text/vas/goniometry/checklist/photo/ai_insight, máx 200). Aceito em create/PUT de sessions; persistência via PUT debounced.
- **UI:** `EvolutionBlocksEditor` + `blockUtils.blocksToText` (espelha texto → `observacao` p/ autosave/finalização/legado).
- **Integração:** toggle **Clássico | Blocos (beta)** por usuário (localStorage, default Clássico) na aba Evolução (#171). Override `?blocks=1`.
- **⚠️ Decisão:** mantido como **opt-in** (não default-ON) porque o editor de blocos ainda NÃO replica procedimentos/exercícios/EVA-tendência/medições do editor clássico (`EvolutionNoScrollPanel`). Demo isolada em `/editor-blocos`.

## 8. Google Calendar (push real)

- **OAuth:** projeto GCP `fisioflow-cal-98466` + Calendar API. Secrets `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` (`https://moocafisio.com.br/auth/google/callback`).
- **Lib:** `apps/api/src/lib/googleCalendar/` (mapEvent puro, client refresh+insert).
- **Endpoint:** `POST /api/integrations/google/calendar/sync-appointment` — refresh token → cria evento real (status success/error/pending).
- ⚠️ App publicado no Google (não-verificado); contas precisam ser test users ou app publicado.

## 9. Morning Briefing

- **Lib:** `apps/api/src/lib/briefing/` (buildBriefing puro, queries, formatBriefingEmail, sendBriefing gated por `MORNING_BRIEFING_ENABLED`).
- **Endpoints:** `GET /api/briefing` (digest), `POST /api/briefing/send` (admin, on-demand). Dispatch via cron.
- **UI:** `/briefing` — KPIs (atendimentos hoje, faltas ontem, inativos) + agenda por status (#164).

## 10. Event Monitor

- **Endpoint:** `GET /api/events/feed` — feed unificado (automation_logs + google_sync_logs, org-scoped, `mergeFeed`) (#161).
- **UI:** `/monitor` — feed de atividades (polling 30s) (#164).

## 11. MCP Server (`fisioflow-mcp-server`)

- `apps/mcp-server/` — `McpAgent` (Durable Object). Tools HTTP→fisioflow-api: `search_evidence`, `search_exercises`, `get_patient_history`, `schedule_session` (Bearer passthrough).

---

## Navegação (sidebar)
Itens adicionados: **Copiloto Clínico** + **Base de Conhecimento** (Inteligência & IA); **Busca IA (Exercícios)** + **Curadoria de Exercícios** (Clínica); **Briefing do Dia** + **Automações** + **Monitor de Atividades** (Gestão & Operação).

> Todas as páginas novas são envolvidas em `<PageLayout>` no `src/routes/core.tsx` (shell/sidebar/header) — fix #182.

## Variáveis de ambiente / secrets
`NCBI_API_KEY`, `NCBI_EMAIL`, `WGER_API_TOKEN`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`,
`MORNING_BRIEFING_ENABLED/TO/ORG_ID`, `AUTOMATION_EXECUTION_ENABLED`, binding `AI_SEARCH`.

## Migrações (Neon prod — aplicadas)
`0115` evidence · `0116` exercise provenance/curation · `0117` exercises embedding 1024 ·
`0118` sessions device · `0119` automations · `0120` sessions blocks.

## 12. IA estruturada (saída JSON) — PRs #184–#188

Helper genérico de saída estruturada + 3 aplicações.

- **Helper:** `apps/api/src/lib/ai/hermes.ts` — `structuredJson(env, system, user)` + `parseJsonLoose` (tolera markdown/objeto) + `readAiContent` (lê `.response` E `choices[].message.content`, pois os modelos `-fast` usam formato OpenAI).
- ⚠️ **Hermes 2 Pro DEPRECADO no Cloudflare Workers AI em 2026-05-30.** `STRUCTURED_MODEL` usa **`@cf/meta/llama-3.3-70b-instruct-fp8-fast`** (ativo, forte em JSON). Em geral, modelos `-fast` permanecem após deprecações (ver `DEPRECATED_MODELS_2026_05_30` em `workersAi.ts`).
- **Extração texto→blocos:** `POST /api/evolution/extract-blocks {text}` → blocos validados (`coerceBlocks`); botão "Gerar blocos do texto (IA)" no `EvolutionBlocksEditor`. (#184)
- **Ditado de voz→blocos:** `POST /api/evolution/transcribe-blocks {audioBase64}` → `{transcript, blocks}` (transcrição Deepgram Nova-3 via `transcribeAudio` → `structuredJson` → `coerceBlocks`); botão "Ditar blocos (voz)" no `EvolutionBlocksEditor` (grava via `useAudioRecorder`).
- **NL→condição de automação:** `POST /api/automation/nl-condition {text}` → `{field, op, value}` (`coerceCondition`). Ex.: "se a dor for maior que 7" → `{field:"evolution.painScale", op:"gt", value:7}`. (#188)
- **Copilot A/B de modelo:** `POST /api/copilot/chat` aceita `model` opcional (`llama_3_1_8b` default | `llama_3_3_70b`). Achado do A/B: o **70b entra em loop de tool-calls sem concluir**; o **8b (default) é melhor** para o tool-calling do Copilot. (#188)

### Survey — onde mais aplicar harness e IA estruturada
- **Harness (Cloudflare Agents SDK):** já usado no MCP server (`McpAgent`). Próximos: Copilot como agente persistente (estado por paciente via DO), agente de triagem reativo sobre o event bus.
- **IA estruturada (`structuredJson`):** classificar intenção de WhatsApp; sugerir metas (goals) a partir da avaliação; extrair medições/PROMs de texto; mapear CID-10 livres → código; gerar rascunho de laudo.
- **Cuidado:** structuredJson não é determinístico — sempre validar com Zod/coerce (como fazemos) e manter o humano no loop para dados clínicos.

## Pendência operacional
🔴 **Rotação de credenciais** expostas durante o desenvolvimento (NCBI/wger/Neon/Yahoo/Google secret) — ação do dono das contas.
