# 09 — Infraestrutura e Operações (AS-IS)

> Fontes: conta Cloudflare `32156f9a72a32d1ece28ab74bcd398fb` via MCP (leitura) [CF-001..008], `wrangler.toml` raiz e `apps/api/wrangler.toml` [SRC], Neon via MCP/CLI [DB-*], `.github/workflows/` [SRC]. Inventários tabulares: `inventories/cloudflare-resources.csv` e `inventories/neon-resources.csv`.

## Visão consolidada

```
Browser (moocafisio.com.br) ──► Worker fisioflow-web (Workers Assets, asset-worker.ts)
App iOS Pro  ──► api-pro.moocafisio.com.br ─┐
App iOS Pac  ──► api-paciente.moocafisio.com.br ─┤► Worker fisioflow-api (Hono, smart placement)
Web (fetch)  ──► api-pro.moocafisio.com.br ─┘        │
                                                     ├─ Hyperdrive (cache OFF) ─► Neon PG17 sa-east-1 (purple-union-72678311, branch production, db neondb)
                                                     ├─ Neon Data API (PostgREST, RLS jwt.sub) — consumido pelo frontend
                                                     ├─ R2: media / exams / clinical-docs (+archive, media-dr)
                                                     ├─ D1: fisioflow-db (rate-limit/audit) + fisioflow-edge-cache
                                                     ├─ KV: FISIOFLOW_CONFIG
                                                     ├─ Queues: background-tasks, whatsapp-inbound (+2 DLQ)
                                                     ├─ 12 Workflows declarados (10 deployados)
                                                     ├─ 6 Durable Objects (colaboração Yjs, agents, voice scribe, org state)
                                                     ├─ Workers AI + AI Gateway (fisioflow-gateway) + Vectorize + 2× AI Search + Browser Rendering + Stream + Pipelines + Analytics Engine
                                                     └─ mTLS cert NFS-e SP
Auth: Neon Auth (JWT/JWKS em ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1) — schema neon_auth
```

## Web

- **Workers Assets, NÃO Pages** — `wrangler.toml:1-6` é explícito; `ARCHITECTURE.md` está desatualizado ao citar Pages [contradição registrada em 14].
- Worker `fisioflow-web` com `asset-worker.ts`; `run_worker_first=false` (estáticos não passam pelo worker); cache via `_headers` (assets imutáveis).
- ⚠️ Secret `DATABASE_URL` existe no `fisioflow-web` [CF-008] — suspeito de órfão (asset worker não deveria acessar banco); investigar/remover.

## API

- `fisioflow-api`: Hono, `compatibility_date 2026-06-06`, `nodejs_compat`, **smart placement**, custom domains `api-pro` e `api-paciente` (mesmo Worker, 2 domínios — o app paciente usa host próprio).
- Observabilidade nativa: logs head sampling 10%, traces 5%; Axiom (org `activity-dbyc`, dataset `fisioflow-logs`); monitor por cron → ntfy `fisioflow-mon-rafael-prod`; Grafana OTLP (secret) e Sentry no frontend (lazy).
- 43 secrets (nomes em `env-and-bindings.csv`). Órfãos detectados: `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` (Inngest removido jun/2026). Ausência notável: **nenhuma chave Deepgram** apesar do ditado Nova-3 — verificar como o VoiceScribeAgent autentica (pergunta em aberto QA-INF-01).

## Banco (resumo; detalhe em 08)

- Prod real: projeto Neon `purple-union-72678311` (sa-east-1), branch `production` protegido, PITR 7 dias, compute fixo 0.25CU/suspend 0 (sempre ligado).
- Conexão de prod **exclusivamente via Hyperdrive** (`fisioflow-neon`, caching disabled, host direto sem `-pooler`, user `neondb_owner`); staging usa `app_runtime` + pooler + caching 300s. Não há secrets de conexão direta no Worker (removidos na rotação de jul/2026).
- ⚠️ Riscos: user de runtime prod = owner com bypassrls (RLS inerte); segundo database `gestao-saude` no mesmo branch; projeto homônimo enganoso `fisioflow-production` (us-east-1) que NÃO é o prod.

## Filas e processamento assíncrono

- `fisioflow-background-tasks` (batch 10, retries 3 → `fisioflow-tasks-dlq` sem consumer) e `fisioflow-whatsapp-inbound` (batch 5, retries 5 → DLQ com consumer de revisão + tabela `wa_dlq_messages`).
- 12 Workflows declarados no wrangler; **só 10 existem na conta** — `nfse-emission` e `patient-discharge` ausentes (nunca deployados ou removidos) [CF-006, divergência]. `wiki-sync` (diário 9h) e `knowledge-sync` (semanal) têm schedules próprios.
- 14 cron triggers no `fisioflow-api` (lista no CSV); handlers de cron devem ser DB-free no tick */5 (gotcha de teste que bloqueia deploy).

## Tempo real

- Durable Objects: `EvolutionCollaborationSql` (Yjs/y-partyserver, colaboração na evolução), `OrganizationState` (WS de org/inbox), `VoiceScribeAgent` (ditado), `PatientAgentSql`/`ClinicAgentSql` (Agents SDK), `AssessmentLiveSession`. Histórico de migrações KV→SQLite v6→v14 documentado no próprio wrangler (lição: Agents SDK/YServer exigem SQLite DO).

## IA

- Workers AI (binding `AI`) com registry central `apps/api/src/lib/workersAi.ts` + AI Gateway `fisioflow-gateway` (spend limits por author/model); Vectorize `fisioflow-knowledge-base` (bge-m3 1024d); AI Search `fisioflow-rag` + `fisioflow-rag-paciente` (isolamento de conteúdo do paciente); Browser Rendering; worker auxiliar `fisioflow-ai-gateway` (router LLM próprio, apps/ai-gateway). Agent Memory beta ainda bloqueado (comentário no wrangler).

## CI/CD

Workflows GitHub (`.github/workflows/`): `production.yml` (push na main → Quality Gate → deploy api+web → smoke; deploy manual proibido por convenção), `staging.yml`, `ci.yml`, `e2e.yml`, `db-backup.yml`, `neon-cleanup.yml`, `codeql.yml`, `security-audit.yml`, `claude.yml`/`claude-code-review.yml`, e 6 workflows mobile dos quais só `ios-build.yml` é o trilho real (ver 12).

## Ambientes

- Produção: `fisioflow-api`/`fisioflow-web` + domínios custom.
- Staging: `fisioflow-api-staging`/`fisioflow-web-staging` + Hyperdrive staging + KV staging + buckets `-staging` (fila staging). Sem domínio custom staging identificado.
- Dev: `wrangler dev` + `.dev.vars` (nomes no CSV) + localhost:5173.

## Recursos declarados × existentes (gaps)

| Item | Situação |
|---|---|
| Workflows nfse-emission / patient-discharge | declarados no código, ausentes na conta |
| KV CONFIG_KV / SESSION_KV / SESSION_KV_preview | existem na conta, sem binding no wrangler FisioFlow (órfãos ou de outro projeto) |
| R2 fisioflow-files | existe na conta, sem binding no wrangler da API — verificar uso via S3 API (R2_ACCESS_KEY secrets) |
| Worker fisioflow-mcp (05/2026) | provável legado do fisioflow-mcp-server |
| Secret DATABASE_URL no fisioflow-web | suspeito órfão |
| Secrets INNGEST_* | órfãos confirmados |
| agent_memory | comentado no wrangler (beta não liberado) |
| Workers api-worker/auth-worker/scheduled-worker/background-worker/gestao-saude/activity-lab-* | mesma conta, fora do escopo FisioFlow — poluição de conta a considerar na reconstrução |

## Backup e DR

- Neon PITR 7d + branch de backup manual (abr/2026) + `db-backup.yml` (verificar destino/retention — pergunta QA-INF-02).
- R2 `fisioflow-media-dr` como réplica de mídia; sem evidência de DR testado (não verificado).
