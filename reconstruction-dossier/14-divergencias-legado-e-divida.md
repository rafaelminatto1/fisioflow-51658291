# 14 — Divergências, Legado e Dívida Técnica (AS-IS)

> Consolidação de contradições, código morto, órfãos e dívida. Toda linha aqui é rastreável a uma evidência. Nada foi corrigido — este é um registro.

## A. Contradições documentação × realidade

| # | Divergência | Realidade (evidência) |
|---|---|---|
| C1 | `ARCHITECTURE.md` diz frontend em Cloudflare **Pages** | Deploy real = **Workers Assets** (`wrangler.toml:1-6`, DOC-002) |
| C2 | `packages/db` diz ser "single source of truth" | Drizzle cobre **23/303** tabelas; resto é SQL cru + Data API (SRC-003) |
| C3 | `wrangler.toml` declara 12 Workflows | Só **10** existem na conta; faltam `nfse-emission`, `patient-discharge` (CF-006) |
| C4 | `MIGRATIONS_STATUS.md` como verdade de migrations | Sem ledger no banco; tabela do MD corrompida perto de 0118/0130; gap 0041-0048 do path extinto (DOC-001) |
| C5 | Projeto Neon `fisioflow-production` (nome) | NÃO é o prod real; o prod é `purple-union-72678311`/"minatto" (DB-011) |
| C6 | README como descrição do sistema | É marketing; subestima drasticamente o tamanho real |
| C7 | wrangler configura custom domains `api-pro`/`api-paciente` para a API | **Runtime**: o frontend web de produção consome `fisioflow-api.rafalegollas.workers.dev` (subdomínio workers.dev), não o custom domain (RUN-003). Expõe o subdomínio workers.dev (bypassa WAF/zona do domínio próprio); corrigir `VITE_API_URL` da web na reconstrução |

## B. RLS inerte (dívida de segurança estrutural)

- 339 policies `org_isolation_*`/`app.org_id` existem, mas o Hyperdrive de produção conecta como **`neondb_owner` (BYPASSRLS)** — RLS não é aplicado no caminho principal (DB-009, CF-002).
- A role correta `app_runtime` (criada em `0057_rls_complete.sql`) só é usada no Hyperdrive de **staging**.
- Isolamento efetivo depende de `WHERE organization_id` manual em cada query → um esquecimento vaza dados entre orgs.
- 43 tabelas com `rowsecurity=false`; 33 delas possuem policy cadastrada que não é aplicada enquanto RLS estiver desligado. Em sentido inverso, 28 tabelas têm RLS ligado mas nenhuma policy inventariada.

## C. Buracos de autenticação/autorização (agente APIs + RBAC)

| # | Endpoint/superfície | Problema |
|---|---|---|
| A1 | `POST /api/agents/*` (5 endpoints IA, `ai-agents.ts:58-172`) | **sem autenticação** |
| A2 | `GET/POST /api/whatsapp/admin/*` (`whatsapp.ts:1106-1204`) | **sem autenticação** |
| A3 | `GET /api/calendar/feed/:patientId.ics` | enumerável por patientId (sem token) |
| A4 | OTP portal paciente (`patientPortal.ts:499-538`) | sem rate limit/Turnstile, OTP logado, envio WA stub |
| A5 | Financeiro/CRM/Marketing/Relatórios/Prontuário na API | só `requireAuth`+org, **sem checagem de papel** (regra "fisio não vê financeiro" é só menu escondido) |
| A6 | `POST /api/organizations` e convites (`invitations.ts:22`) | qualquer autenticado cria org/convite com qualquer papel; `/use/:token` não valida e-mail |
| A7 | Fallback `DEFAULT_ORG_ID`+`viewer` (`auth.ts:227-241`) + auto-sync profile por e-mail (`auth.ts:156-188`) | risco de account takeover se e-mail não verificado |
| A8 | MFA (`mfa_settings`, UI completa) | login **nunca consulta**; backup codes com `Math.random()` |
| A9 | `/settings` (`src/routes/core.tsx:355`) | sem `ProtectedRoute` |
| A10 | Booking público (`publicBooking.ts:117`) | fallback retorna **todos** os slots se schema não bate |
| A11 | Stripe | sem webhook de confirmação de pagamento |
| A12 | Jitsi telemedicina | sala pública sem senha |

## D. Duplicidade PT/EN no schema (dívida de modelo)

Pares convivendo de gerações diferentes: `salas`×`rooms`, `transacoes`×`transactions`, `pagamentos`×`payments`, `centros_custo`×`cost_centers`, `empresas_parceiras`×`partner_companies`, `fornecedores`×`suppliers`, `precadastros`/`precadastro_tokens`×`pre_registrations`/`pre_registration_tokens`, trilho WhatsApp `wa_*`×`whatsapp_*`, `financial_accounts`×`contas_financeiras`. Enum `appointment_status` = 17 valores EN+PT (DB-007). Enums `role`×`user_role` divergentes.

## E. Código morto / órfão

- **8 tabelas sem referência no código** (DB-006): asset_annotations, empresas_parceiras, force_sessions, group_class_schedules, group_sessions, group_waitlist, precadastro_tokens, push_tokens.
- **8 módulos de rota nunca montados**: analytics/ml, analytics/mlPrediction, analytics/digital-twin, ml/patientRisk, ai/knowledge, ai/ragClinical, ai/usage, admin/observability.
- **4 cron cases mortos** (schedules fora de `[triggers].crons`): `0 10` (AutoRAG sync nunca roda), `10 10 seg`, `0 13`, `0 15` (**RTM Clinical Alerts implementado mas nunca executa**).
- **1 módulo de workflow órfão**: `workflows/wearableActivity.ts` (sem binding).
- **Endpoints**: 23 órfãos + duplicados (`/api/ai-clinical-search`, `/api/clinic-metrics`, `/api/groups` montados 2×; `financial-analytics` em 2 prefixos).
- **Secrets órfãos**: `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` (Inngest removido jun/2026); role Postgres `inngest`.
- **Recursos CF órfãos/suspeitos**: KV `CONFIG_KV`/`SESSION_KV`, R2 `fisioflow-files`, Worker `fisioflow-mcp`, secret `DATABASE_URL` no `fisioflow-web`.
- **Mobile legado**: `apps/mobile-ios` (scaffold morto, fora do workspace), `android/`+`capacitor.config.ts` (Capacitor dormente), `codemagic.yaml` (Xcode 16.4 não compila SDK 55), `eas.json` raiz obsoleto, 5 dos 6 workflows mobile.
- **App workspace fantasma**: `functions` listado no `pnpm-workspace.yaml` mas **inexiste no disco**; `apps/vinext-poc` e `packages/db-utils` só têm node_modules.

## F. Dívida operacional

- Migrations aplicadas manualmente sem ledger → drift.
- User de runtime = owner (BYPASSRLS).
- Segundo database `gestao-saude` no branch de produção (DB-005).
- Conta Cloudflare compartilhada com Workers de outros projetos (api-worker, auth-worker, activity-lab-*, gestao-saude) — poluição e risco de confusão.
- Sentry provavelmente mudo nos IPAs iOS (DSN ausente do build); config de URL conflitante no app pro (perfil testflight × `lib/config.ts`).

## G. Problemas a NÃO reproduzir na reconstrução

1. RLS decorativo — ativar de verdade com role não-owner.
2. Duplicidade PT/EN — schema único desde o início.
3. Auth em 3 trilhos divergentes — unificar.
4. Endpoints sem auth — gate por padrão (deny-by-default).
5. Migrations sem ledger — ferramenta com histórico no banco.
6. Dados sensíveis no repo — nunca versionar CSV/dumps/screenshots de produção.
7. Múltiplos projetos/databases misturados — isolamento por ambiente.
8. Rotas/tabelas/workflows órfãos acumulados — deadcode gate no CI.
