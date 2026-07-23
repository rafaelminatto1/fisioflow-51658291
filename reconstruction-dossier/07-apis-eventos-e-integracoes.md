# 07 — APIs, Eventos e Integrações Externas

Auditoria somente-leitura no commit `9b5c76f10`. Inventários detalhados em
`inventories/api-endpoints.csv` (1.191 endpoints), `inventories/events-and-jobs.csv`
(57 itens) e `inventories/integrations.csv` (33 fornecedores).

## 1. Arquitetura da API

Worker único **fisioflow-api** (Hono) em `apps/api/src/index.ts`, servindo os
domínios `api-pro.moocafisio.com.br` e `api-paciente.moocafisio.com.br`
(`apps/api/wrangler.toml:11-14`). O `export default` implementa três handlers:
`fetch` (HTTP/WS), `scheduled` (crons) e `queue` (3 filas) — `index.ts:506-587`.

### Pipeline de middlewares (ordem em `index.ts:171-230`)
1. **CORS** com allowlist por env `ALLOWED_ORIGINS` (CSV); wildcard só fora de
   produção (`resolveCorsOrigin`, `index.ts:158-168`). Headers permitidos incluem
   `Idempotency-Key` e `X-Neon-Auth-Token`.
2. **logger** + **secureHeaders** (HSTS preload, CSP restritiva, COOP/CORP,
   Permissions-Policy) — `index.ts:193-227`.
3. **requestIdMiddleware** (`middleware/requestId.ts`) — propaga `X-Request-ID`.
4. **analyticsMiddleware** (`lib/analytics.ts`) — instrumentação automática de
   todas as rotas no Analytics Engine (fire-and-forget), base do SLO.
5. Antes do Hono, o `fetch` bloqueia scanners (`/.git*` → 403 com log no Axiom,
   `index.ts:529-547`) e intercepta upgrades WebSocket para não corromper a
   resposta 101 com headers de middleware (`index.ts:566-574`).

### Autenticação e RLS
- **JWT Neon Auth** validado via JWKS (`NEON_AUTH_JWKS_URL`, `wrangler.toml`),
  em `lib/auth.ts` (`requireAuth`/`verifyToken`). O `AuthUser` carrega
  `uid`, `organizationId` e roles.
- **RBAC**: `requireRole([...])` em rotas admin (`routes/admin/*.ts`, p.ex.
  `admin/dlq-replay.ts:12-13`), `requireRole(["admin","owner"])` em
  `clinicalDocs.ts:19-20` e `cloudflareAnalytics.ts:7-8`; RBAC específico de
  WhatsApp em `middleware/whatsapp-rbac.ts`.
- **RLS multi-tenant**: toda conexão seta `set_config('app.org_id', $1, ...)`
  (`lib/db.ts:170,283,327-329`); as policies Postgres usam
  `current_setting('app.org_id', true)`. Helpers: `runWithOrg` (`lib/db.ts:38`),
  `createPoolForOrg`, e `withTenant` (filtro Drizzle por `organizationId` +
  soft-delete, `lib/db-utils.ts:25`).
- **Portal do paciente** tem autenticação própria por OTP
  (`patientPortal.ts:499-583` — `request-otp`/`verify-otp` públicos, resto via
  `requirePatientAuth` de `lib/auth/patientAuth.ts`).
- **Turnstile** protege rotas públicas: `routes/auth.ts` (login) e
  `routes/publicBooking.ts` (`middleware/turnstile.ts`).

### Rate limiting, erros e paginação
- **Rate limit** persistido no D1 `EDGE_CACHE` (tabela `rate_limits`,
  `middleware/rateLimit.ts:28-46`; cleanup diário no cron `0 11 * * *`,
  `cron.ts:128-131`). Aplicado a `/api/ai/*` (100/h, `ai.ts:19`),
  `/api/fisiobrain` (60/h, `fisiobrain.ts:15`), `/api/ai/retention` (60/min) e
  ao webchat público (`webchat.ts:171,489`).
- **Erros**: `app.onError(errorHandler)` (`index.ts:436`) com taxonomia
  `ErrorType` + `AppErrorImpl` e `requestId` no corpo
  (`middleware/errorHandler.ts:5-37,90`). Handler "blindado com CORS".
- **Paginação**: convenção `?page/limit` ou `?limit/offset` por rota (não há
  middleware único); listas grandes (inbox, tarefas, pacientes) paginam via SQL.
- **Idempotência**: header `Idempotency-Key` aceito no CORS; filas derivam chave
  própria (`queue.ts:121` `deriveQueueIdempotencyKey`); WhatsApp tem dedup em
  `lib/whatsapp-idempotency.ts`.

### Montagem de rotas
119 mounts declarados no array `apiRoutes` (`index.ts:284-412`), com
sub-routers compostos por dois padrões: `app.route()` (`scheduling.ts:10-12`,
`ai.ts:22-30`, `clinical.ts:123-125`) e funções `register*Routes(app)`
(`financial.ts:848-850`, `patients.ts:1800`, `analytics.ts:16`).

## 2. Contagens

| Categoria | Total |
|---|---|
| Endpoints HTTP inventariados | **1.191** (1.168 ativos, 23 órfãos) |
| Crons no wrangler.toml | **14** (+2 schedules nativos de Workflows) |
| Cases de cron no código | 18 (4 mortos — ver §5) |
| Queues | **3** consumidas + 1 DLQ sem consumer |
| Workflows | **12** registrados (+1 módulo órfão) |
| Durable Objects | **6** |
| WebSockets | 3 famílias + 2 rotas SSE |
| Webhooks de entrada | 6 |
| Integrações externas | **34** fornecedores |

Maiores áreas por número de endpoints: whatsapp-inbox (49), gamification (43),
clinical/resources (40), eventos (33), marketing (30), scheduling-settings (29),
patients/clinical-details (28), boards (27), patient-portal (26), financial (25).

## 3. Crons (dispatcher `apps/api/src/cron.ts`, triggers em `wrangler.toml:471-487`)

| Cron | O quê |
|---|---|
| `*/5` | Health monitor DB-free → ntfy (`cron.ts:31`) |
| `*/15` | CRM automations scan + lembretes configuráveis + SLA leads + concierge IG + backfill perfis IG (`cron.ts:47`) |
| `0 6` | Lead scoring batch (`cron.ts:35`) |
| `0 9` | Prewarm Neon + lembretes/confirmação D-2 + aniversários + inativos + recall + reengajamento sessão-3 + exercise reminders + morning briefing (`cron.ts:88`) |
| `0 11` | Limpeza DB + same-day não confirmados + D-1 urgente + cleanup rate_limits (`cron.ts:117`) |
| `0 12` | Automações de tarefas (vencimento, urgentes, pendências clínicas, travadas) (`cron.ts:135`) |
| `30 10` / `30 21` / `0 12 seg` | ClinicAgent DO: briefing, resumo diário, pacientes sumidos (`cron.ts:186-233`) |
| `0 14` | NPS auto-trigger (`cron.ts:235`) |
| `0 3 dia 1` | Arquivamento de sessions >90d → Pipeline/R2 Iceberg (`cron.ts:271`) |
| `0 9 dias 1,15` | Relatório SLO quinzenal + refresh tokens IG (`cron.ts:283`) |
| `15 * * * *` | SLO health check + disparo de campanhas WhatsApp agendadas (`cron.ts:300`) |
| `0 21` | Push diário de HEP aos pacientes (`cron.ts:336`) |

**Workflows com cron nativo**: WikiSync `0 9 * * *` e KnowledgeSync
`10 10 * * 1` (`wrangler.toml:124-134`).

## 4. Queues, Workflows e Durable Objects

- **fisioflow-background-tasks** (`queue.ts:169`): fila genérica — envio
  WhatsApp/push, R2 events, processamento de exames/biomecânica, TTS, trigger de
  workflows, NFS-e, além de eventos de domínio (`appointment.created`,
  `patient.birthday`, `prescription.created`…) que alimentam o motor de
  automações (`runAutomationsForEvent`). DLQ `fisioflow-tasks-dlq` **sem
  consumer** (replay via `/api/admin/dlq`).
- **fisioflow-whatsapp-inbound** (`queues/whatsapp-inbound.ts`): desacopla o ack
  do webhook Meta do processamento pesado (IA de inbox, DB); retries 5 e DLQ
  própria com consumer de revisão (`queues/whatsapp-dlq.ts`).
- **12 Workflows** exportados (`index.ts:452-465`): reminder, onboarding, NFS-e,
  HEP compliance, alta, reengajamento, digital twin, wiki/knowledge sync,
  session summary, biomecânica e AutomationExecutor (ações do canvas, gated por
  `AUTOMATION_EXECUTION_ENABLED`). `workflows/retryPolicy.ts` centraliza retries
  (motivado por 429 da Meta). **`workflows/wearableActivity.ts` não tem binding
  no wrangler.toml — módulo órfão.**
- **6 DOs** (`wrangler.toml:152-174`): `OrganizationState` (hub realtime por
  org), `PatientAgentSql`/`ClinicAgentSql` (Agents SDK, SQLite),
  `AssessmentLiveSession`, `VoiceScribeAgent` (ditado Nova-3 pt-BR),
  `EvolutionCollaborationSql` (y-partyserver/Yjs). Histórico de migrations
  v1–v14 documenta a saga KV→SQLite (classes KV órfãs já deletadas).

### WebSockets e SSE
- `GET /api/realtime` → `OrganizationState` (token JWT em query; upgrade tratado
  **antes** do middleware Hono — `index.ts:474-504,567-570`).
- `GET /api/sessions/:id/collaboration` → `EvolutionCollaborationSql` via
  `getServerByName` (`index.ts:592-601`); auth JWT+org+RBAC; snapshot Yjs em
  `sessions.observacao_ydoc`.
- `/agents/*` → `routeAgentRequest` do Agents SDK (`index.ts:563`), inclui o WS
  do VoiceScribeAgent (ditado) e chat dos agentes.
- SSE: chat IA (`routes/ai/ai-chat.ts:234`) e agentes educacionais
  (`routes/ai-agents.ts:109`).

## 5. Órfãos, duplicados e achados

**Módulos de rota nunca montados (23 endpoints órfãos):**
`routes/analytics/ml.ts` (registerMlAnalyticsRoutes nunca chamado),
`routes/analytics/mlPrediction.ts`, `routes/analytics/digital-twin.ts`,
`routes/ml/patientRisk.ts`, `routes/ai/knowledge.ts`, `routes/ai/ragClinical.ts`,
`routes/ai/usage.ts`, `routes/admin/observability.ts` (+`admin/index.ts`).

**Cases de cron mortos** (schedule ausente de `[triggers].crons`):
`0 10 * * *` (prewarm 2), `10 10 * * 1` (AutoRAG sync — a schedule existe só no
Workflow KnowledgeSync, então `syncAutoRAGContent` via cron **nunca roda**),
`0 13 * * *` (placeholder anti-churn), `0 15 * * *` (**RTM Clinical Alerts —
funcionalidade implementada que nunca executa**; `cron.ts:250-270`).

**Mounts duplicados em `index.ts`:** `/api/ai-clinical-search` (linhas 289 e
395), `/api/clinic-metrics` (380 e 402), `/api/groups` (384 e 403) — inócuos mas
redundantes. `analyticsRoutes` é montado de propósito em `/api/analytics` e
`/api/insights` (361-362). As rotas de `financial-analytics.ts` respondem em
dois prefixos (`/api/financial-analytics/*` e `/api/financial/*`) porque a
função register é chamada nos dois routers (`financial-analytics.ts:1320` e
`financial.ts:849`).

**Riscos de auth encontrados (endpoints sem `requireAuth`):**
- `POST /api/agents/{soap-review,tutor/chat,simulator/chat,simulator/evaluate,charts/generate}`
  (`routes/ai-agents.ts:58-172`) — endpoints de IA públicos, consumo de Workers
  AI sem autenticação nem rate limit.
- `GET/POST /api/whatsapp/admin/{webhook-register,webhook-status,test-send}`
  (`routes/whatsapp.ts:1106-1204`) — operações administrativas da WABA sem auth.
- `GET /api/calendar/feed/:patientId.ics` (`routes/calendar.ts:12`) — feed
  webcal por design público, mas enumerável por patientId (dados de agenda).
- Vários GETs de conteúdo (wiki, templates, protocols, exercises/:id) são
  públicos — aparentemente intencional (biblioteca), vale confirmar.

**Sem consumidor no front (amostragem):** `/api/autocomplete`, `/api/search`,
`/api/lgpd`, `/api/ai-config`, `/api/agent-memory`, `/api/cloudflare-analytics`,
`/api/wger`, `/api/admin/dlq`, `/api/admin/seed-templates` — montados e
funcionais, mas nenhuma referência em `src/` ou `apps/web`. `fcm-tokens` e
`patient/assistant` são consumidos pelo `apps/patient-app`.

## 6. Integrações externas (resumo; detalhes no CSV)

- **Meta WhatsApp Cloud API (Graph v25)** — coração do CRM. Entrada:
  `/api/whatsapp/webhook` (verify token + HMAC `WHATSAPP_APP_SECRET`) → fila
  inbound (retries 5 + DLQ + dedup). Saída: templates e mensagens via
  `graph.facebook.com/v25.0` com `WHATSAPP_ACCESS_TOKEN`. Falhas de envio caem
  no retryPolicy dos Workflows (429 da Meta). Mídia baixada de
  `lookaside.fbsbx.com`.
- **Instagram Messaging** — mesmo app Meta; webhook próprio, concierge auto-reply
  no cron `*/15`, refresh de token quinzenal (`cron.ts:283-298`).
- **Neon** — Postgres via Hyperdrive (id `12b9fef...`), Auth JWT/JWKS e webhook
  `user.created` assinado com EdDSA validado contra o JWKS
  (`routes/webhooks.ts:1-60`).
- **Cloudflare** (maior superfície de lock-in): Workers AI/AI Gateway (registry
  `lib/workersAi.ts`; Deepgram nova-3/aura-2 mediados pela CF), Stream (webhook
  HMAC + anti-replay), Turnstile, Analytics Engine SQL (SLO,
  `lib/sloReport.ts:6`), GraphQL analytics, AutoRAG sync via REST
  (`routes/aiSearch.ts:708`), R2 SQL/Iceberg (`R2_SQL_TOKEN`), Browser Rendering.
- **Resend** — e-mail transacional (`lib/email.ts`), best-effort sem retry.
- **Google** — Calendar OAuth (`lib/googleCalendar/client.ts:7,29`); Gemini
  premium desligado por flag (`GOOGLE_AI_PREMIUM_ENABLED=false`); Maps com key
  vazia em prod.
- **Z.AI (GLM-5.2)** — provider OpenAI-compatible para `/evidence/summarize`
  (`lib/ai/providers/zai.ts:27`).
- **NFS-e SP** — emissão direta SOAP com **mTLS binding** (`NFSE_SP_CERT`,
  `wrangler.toml:367-369`) + assinatura XML (`lib/nfseXmlSigner.ts`), com modo
  sandbox (`NFSE_SANDBOX`); Focus NFe permanece como legado.
- **Stripe** — implementação fetch própria (`lib/payments/StripeService.ts`),
  **sem webhook de confirmação de pagamento** — estado de pagamento depende de
  polling/uso pontual; risco de inconsistência se for ativado de verdade.
- **Twilio** — fallback WhatsApp standby (`lib/messaging/WhatsAppService.ts:27`).
- **Wearables** — OAuth Strava/Oura/Google Fit com callbacks públicos
  (`routes/wearables.ts:264-418`); Garmin parcial.
- **Evidence** — PubMed E-utils (`lib/evidence/ncbiClient.ts:3`), Europe PMC,
  OpenAlex; queries PT→EN.
- **Observabilidade/alertas** — Axiom (`lib/axiom.ts:54`, waitUntil), ntfy.sh
  (`lib/monitor.ts:20`), Expo push (`lib/push.ts:30`), Web Push VAPID
  (`lib/webpush.ts`).
- **Telemedicina** — Jitsi público por roomCode (`routes/telemedicine.ts:10` —
  sala `meet.jit.si` sem senha, atenção à privacidade) e LiveKit com JWT gerado
  manualmente (`routes/telemedicine.ts:365-407`, URL default placeholder).
- **Inngest** — removido; `lib/inngest-client.ts` hoje só repassa eventos à
  BACKGROUND_QUEUE (nome residual).
