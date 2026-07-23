# 02 — Inventário do Sistema (Fase 1)

> Auditoria somente-leitura em `/home/rafael/Documents/fisioflow/fisioflow-51658291`
> Commit: `9b5c76f1069e5bc6bbab22397e69028d314cc3be` (branch `main`) — 2026-07-13
> Manifesto JSON: `inventories/system-manifest.json` · Rotas: `inventories/ui-routes.csv` · Testes: `inventories/tests.csv` · Env/bindings: `inventories/env-and-bindings.csv`

---

## 1. Workspaces e pacotes pnpm

`pnpm-workspace.yaml` declara: `apps/*` (com exclusão explícita `!apps/mobile-ios`), `packages/*` e `functions` — **`functions/` não existe no disco** (resquício de Cloudflare Pages Functions; referência morta no workspace). `nodeLinker: hoisted`.

### Ativos (produção)

| Pacote | Path | Propósito | Evidência |
|---|---|---|---|
| `fisioflow-monorepo` | `/` | Raiz turbo/pnpm; scripts de dev/build/test/deploy | `package.json` |
| `fisioflow-web` | `apps/web` + **`src/` na raiz** | Dashboard web (React 19 + Vite 8). `apps/web` é só a casca de build (index.html + vite.config + asset-worker); o código de produto vive em `src/` na raiz | ver §2 |
| `@fisioflow/api` | `apps/api` | API Cloudflare Workers (Hono) — Hyperdrive/Neon, R2×3, D1×2, KV, Queues×3, 12 Workflows, 6 Durable Objects, Vectorize, AI Search×2, Pipelines, Stream, 14 crons | `apps/api/wrangler.toml` |
| `@fisioflow/ai-gateway` | `apps/ai-gateway` | Worker "Intelligent Router for LLMs" + Analytics Engine `fisioflow_ai_usage` | `apps/ai-gateway/wrangler.jsonc:3` |
| `@fisioflow/mcp-server` | `apps/mcp-server` | Worker MCP server (DO `FisioFlowMCP`, tools + testes) | `apps/mcp-server/wrangler.jsonc:2-8` |
| `fisioflow-patient-ios` | `apps/patient-app` | App mobile do paciente (Expo 55 / RN 0.83.6, expo-router, EAS) | `apps/patient-app/package.json` |
| `@fisioflow/professional-app` | `apps/professional-app` | App mobile do profissional (Expo 55 / RN 0.83.6; IPA via CI `ios-build.yml`, nunca local) | `apps/professional-app/package.json` |
| `@fisioflow/db` | `packages/db` | Schema Drizzle compartilhado — "single source of truth" front + workers | `packages/db/package.json` |
| `@fisioflow/evolution-editor-schema` | `packages/evolution-editor-schema` | Schema TipTap compartilhado cliente ↔ DO de colaboração (Yjs→HTML sem DOM) | descrição no `package.json` |
| `@fisioflow/shared-api` | `packages/shared-api` | Tipos/cliente de API compartilhados | `package.json` |
| `@fisioflow/core`, `@fisioflow/ui`, `@fisioflow/config` | `packages/*` | Cascas mínimas (build = `echo "no build"`, sem testes) — ativos mas de baixo conteúdo | `packages/*/package.json` |

### Legados / protótipos / mortos

| Item | Classificação | Justificativa |
|---|---|---|
| `apps/vinext-poc` | **morto** | Só `node_modules` residual, sem `package.json` (POC Vite+ de jun/2026, não adotado) |
| `apps/mobile-ios` | **morto** | Excluído do workspace (`!apps/mobile-ios`); só `App.js`/`index.js` Expo bare mínimo |
| `apps/jules-bot` + `packages/jules` | **legado/experimento** | Bot de review GitHub (Hono + Octokit + Gemini); último commit 2026-06-11; fora do fluxo de deploy prod |
| `functions/` | **morto** | Não existe no disco; ainda listado em `pnpm-workspace.yaml:5` |
| `workers/` | **legado** | Sobrou apenas `workers/migrations/0083_backfill_exercise_media.sql`; é o path antigo pré-monorepo por onde as migrations 0041–0048 foram aplicadas (citado em `MIGRATIONS_STATUS.md`) |
| `packages/db-utils` | **morto** | Só `node_modules` residual, sem `package.json` |
| `android/` + `capacitor.config.ts` | **legado/protótipo** | Shell Capacitor (webDir `apps/web/dist`, appId `com.moocafisio.fisioflow`); último commit 2026-04-25; os apps mobile vivos são Expo (`patient-app`/`professional-app`) |
| `migrate-pages.ts`/`.js` | **morto** | Codemod ts-morph one-off (MainLayout → PageLayout), já executado (`migrate-pages.ts:1-14`) |
| `design-system/` | **legado** | Só `fisioflow-wiki/MASTER.md`; o DS vivo é `src/index.css` + tokens (restyle jun/2026) |
| `_design-system-export/` | **legado** | Export estático de DS (css/fontes/ui_kits/preview), maio/2026 |
| `TESTES-APAGAR/` | **morto** | Diretório vazio com nome literal "apagar" |
| `backups/` | **morto e sensível** | Dumps SQL de produção de 2026-05-15 (ver §8) |
| `scratch/` | **morto** | Scripts one-off de análise de backup/exercícios (`analyze_backup.cjs`, `check_*.cjs`) |
| `docker/` | **morto** | `docker/macos-docker/` — macOS virtualizado para build iOS local; substituído pelo workflow `ios-build.yml` |
| `drizzle/` (raiz) | **legado** | Ver §5 |

## 2. Entry points reais (confirmado com evidência)

O app vivo é o **dashboard em `src/` na raiz**; `apps/web` é uma casca fina:

- `wrangler.toml:3-6` (raiz): Worker `fisioflow-web`, `main = "apps/web/src/asset-worker.ts"`, `assets = ./apps/web/dist` — frontend servido por **Workers Assets** (não Pages), domínios `moocafisio.com.br`/`www`.
- `apps/web/index.html:432`: `<script type="module" src="./src/main.tsx">`.
- `apps/web/src/main.tsx:1`: **conteúdo integral = `import "../../../src/main";`** → encadeia para `src/main.tsx` da raiz.
- `src/main.tsx`: inicialização real (polyfill Temporal, `createRoot`, `App.tsx`, service worker, chunk-error handling).
- `src/App.tsx:61`: `<RouterProvider router={router} />`; router definido em `src/routes/router.tsx:39` via `createBrowserRouter(createRoutesFromElements(...))` compondo 13 módulos de rota (`src/routes/{core,admin,ai,...}.tsx`, 2.378 linhas somadas).
- **Framework-mode inativo**: `src/routes.ts`, `src/entry.client.tsx`, `src/entry.server.tsx`, `src/root.tsx` existem (e `apps/web/src/routes.ts:1` re-exporta `../../../src/routes`), mas nada os liga ao boot — confirmando a memória `reference_routing_dual_state`.

## 3. Dependências principais (dos package.json)

| Lib | Versão | Onde |
|---|---|---|
| React / ReactDOM | **19.2.0** (pin via override em `pnpm-workspace.yaml`) | raiz, web, mobile |
| Vite | **8.1.3** | raiz / apps/web |
| Hono | **^4.12.24** (override global `^4.12.14`) | apps/api, ai-gateway, jules-bot |
| Drizzle ORM / drizzle-kit | **^0.45.2 / ^0.31.10** | raiz, api, packages/db |
| pg | ^8.20.0 (api ^8.13.3) | api via Hyperdrive |
| TipTap | **3.23.4** (`@tiptap/core`) | raiz/web/api/evolution-editor-schema |
| Tailwind | **^4.3.0** (v4) | raiz/web |
| wrangler | **4.100.0** | todos os workers |
| TypeScript | **^6.0.3** (mobile ~5.9) | geral |
| React Router | ^7.15.1 (`react-router-dom`) | dashboard |
| TanStack Query | ^5.101.0 | dashboard/mobile |
| Zod | ^4.4.3 (packages/core ainda em zod 3) | geral |
| Expo / React Native | **Expo ~55.0.23 / RN 0.83.6** (patient + professional); `apps/web` ainda carrega expo ^54/RN 0.81.5 como dep (react-native-web) | mobile |
| Vitest / Playwright | ^4.1.8 / ^1.58.2 | testes |
| Lint/fmt | oxlint + oxfmt (não ESLint como primário) | raiz |

## 4. Build/Deploy

- **`wrangler.toml` (raiz)** — Worker `fisioflow-web`: assets estáticos + `asset-worker.ts`; envs `staging`/`production`; comentário explícito "NOT Cloudflare Pages".
- **`apps/api/wrangler.toml`** — Worker `fisioflow-api`: `compatibility_date 2026-06-06`, `nodejs_compat`, smart placement; rotas `api-pro`/`api-paciente.moocafisio.com.br`; Hyperdrive `12b9fefcfbc04074a63342a9212e1b4f`; 3 buckets R2; Stream; KV; 2 D1; Analytics Engine; Vectorize; 2 AI Search; Pipelines; 12 Workflows; 6 DOs (`OrganizationState`, `PatientAgentSql`, `AssessmentLiveSession`, `ClinicAgentSql`, `VoiceScribeAgent`, `EvolutionCollaborationSql`); 3 filas (background, whatsapp-inbound, whatsapp-dlq); **14 crons** (`apps/api/wrangler.toml:528-543`); Agent Memory comentado (beta não liberado).
- **`apps/ai-gateway/wrangler.jsonc`** — `fisioflow-ai-gateway` + Analytics Engine.
- **`apps/mcp-server/wrangler.jsonc`** — `fisioflow-mcp-server` + DO `FisioFlowMCP`.
- **`apps/jules-bot/wrangler.toml`** — `jules-bot` (legado).
- **`turbo.json`** — tasks build/dev/lint/type-check/test com `dependsOn ^build`.
- **`.github/workflows/`** (16): `production.yml` (**auto-deploy no push da main**: quality gate → deploy api+web → smoke), `staging.yml`, `ci.yml`, `e2e.yml`, `db-backup.yml`, `neon-cleanup.yml`, `codeql.yml`, `security-audit.yml`, `claude.yml` + `claude-code-review.yml`, `ios-build.yml`, `eas-dev-build.yml`, `eas-professional-build{,-local}.yml`, `mobile-android.yml`, `mobile-ios.yml`.
- Config extra: `biome.json` e `eslint.config.js` presentes mas o lint canônico é `oxlint` (script `lint` da raiz); `codemagic.yaml`/`eas.json` para mobile.

## 5. Duas origens de migrations (divergência)

1. **`apps/api/migrations/` — trilho operacional (fonte da verdade).** 180 arquivos, numeração manual sequencial `0032` → `0140` (+ `.down.sql`), última: `0140_tarefas_integracoes.sql`. `MIGRATIONS_STATUS.md` (atualizado 2026-06-25) rastreia por migration o status Staging/Prod/Down e diz na abertura: *"migrations manuais de feature — distinto do `/drizzle/` gerenciado pelo Drizzle Kit"*. Pontos do status: gap 0041–0048 aplicado do path antigo `workers/migrations/`; maioria ✅ em prod (várias sem `.down`); pendências marcadas ⏳ (ex.: `0069`, `0100`); a tabela tem linhas com formatação quebrada perto de `0118`/`0130` (o próprio doc está parcialmente corrompido). Migrations ≥0131 (0132–0140) não constam do status mas sabidamente aplicadas (0139/0140 confirmadas em memória de projeto).
2. **`drizzle/` na raiz — trilho drizzle-kit abandonado.** 24 `.sql` com dupla numeração conflitante (`0000_nebulous_ironclad.sql` **e** `0000_overjoyed_gorgon.sql`, idem 0001–0003), um `9999_add_accountability_to_tarefas.sql`, `apply_migration.sql` e `meta/` de snapshots. **Não é mais o `out` do drizzle-kit**: `drizzle.config.ts:12-13` aponta `schema: ./packages/db/src/schema/*` e `out: ./packages/db/migrations` (que contém apenas 2 sql + meta).

Ou seja, há **três** diretórios de migrations no repo (`apps/api/migrations` ativo, `drizzle/` morto, `packages/db/migrations` quase vazio) + o vestigial `workers/migrations/0083`. Para reconstrução, vale apenas `apps/api/migrations/` + o schema Drizzle em `packages/db/src/schema/`.

## 6. Feature flags

**Por organização (coluna `organizations.settings`, JSON no Postgres):**
- `settings.dictation_enabled` — ditado de evolução (Nova-3); hook `src/hooks/useDictationEnabled.ts`.
- `settings.crm_whatsapp.automations_enabled` — gate mestre das automações WhatsApp/cron (default OFF; `apps/api/src/queue.ts`, `whatsapp-inbox.ts`).
- `settings.auto_sync_enabled` — sync automático (ZenFisio/integração).
- `webchatAutoReply` / `webchatReplyDelaySeconds` — concierge do webchat (card na UI `CrmWhatsAppSettings.tsx`).
- Editor de blocos da evolução: opt-in por org (memória plataforma IA jun/2026).

**Por ambiente (Worker `[vars]`/secrets):** `GOOGLE_AI_PREMIUM_ENABLED`, `AI_GATEWAY_ENABLED`, `AI_ROUTER_ENABLED`, `ML_RISK_SCORING_ENABLED`, `RAG_CLINICAL_ENABLED`, `AUTOMATION_EXECUTION_ENABLED`, `MORNING_BRIEFING_ENABLED`, `NFSE_SANDBOX`, `IMAGE_TRANSFORMATIONS`, `VITE_STREAM_UPLOAD_ENABLED`.

**Infra de flags no front:** `src/lib/featureFlags/` — três camadas documentadas no barrel (`index.ts`): Remote Config Manager (primário, KV/`useRemoteConfig`), Statsig (secundário opcional) e env vars `VITE_FEATURE_*` (fallback, `envFlags.ts`: `new_dashboard`, `ai_transcription`, `ai_chatbot`, `ai_exercise_suggestions`, `digital_prescription`, `pain_map_v2`, `soap_records_v2`, `advanced_analytics`, `patient_reports_v2`, `whatsapp_notifications`, `google_calendar_sync`, `maintenance_mode`, `beta_features`).

## 7. Documentação — classificação

### Raiz (~36 .md)
| Arquivo | Classe |
|---|---|
| `CLAUDE.md` | **AS-IS confiável** (convenções vigentes) |
| `ARCHITECTURE.md` | Majoritariamente AS-IS, **com erro pontual**: diz "Cloudflare Pages" para o frontend, mas o deploy real é Workers Assets (`wrangler.toml:1`) |
| `BUSINESS_RULES.md`, `RUNBOOK_INCIDENTS.md`, `SECURITY.md`, `LGPD_RETENTION_POLICY.md`, `TESTS.md`, `BACKLOG.md`, `DESIGN.md` | AS-IS com defasagem leve (revisar datas) |
| `README.md` | **Marketing/desatualizado** (tom promocional, não técnico) |
| `DESIGN_SYSTEM.md` | Parcialmente desatualizado (restyle jun/2026 vive em `src/index.css`) |
| `PLANO_IMPLEMENTACAO_2026.md`, `ROADMAP_FISIOFLOW_2026.md`, `NEXT_PHASE_PLAN.md`, `QUICKSTART_21DIAS_SPRINT_ROADMAP.md`, `TASKS_ROADMAP_2026.md`, `TASKS_NPS.md`, `ROADMAP_TECNICO_GAPS_SEMANA1-4.md`, `fisioflow-phase2.md`, `medicaments-feature.md` | **Visão futura/plano** |
| `ANALISE_COMPETITIVA_GAPS_2026.md`, `MATRIZ_COMPETITIVA_DETALHADA_11PLAYERS.md`, `EXECUTIVE_BRIEF_GAPS_1PAGE.md`, `RESUMO_EXECUTIVO_2PAGINAS.md`, `SUMARIO_FINAL_ANALISE.md`, `INDICE_ANALISE_COMPLETA.md`, `LEIA-ME_GUIA_NAVEGACAO.md`, `CHECKLIST_APRESENTACAO_60MIN.md` | Análise competitiva/apresentação (jul/2026) — não descreve código |
| `AUDITORIA_PRODUCAO_2026-06-19.md` | Snapshot AS-IS datado (jun/2026) |
| `IMPLEMENTATION_SUMMARY.md`, `PLAN.md`, `manual_actions.md`, `agenda-settings-rebranding.md`, `agenda-settings-revamp.md`, `claudehermes.md`, `GEMINI.md` | Notas one-off/desatualizadas (resumos de sessões de agente) |

### Diretórios
- `docs/` (~36 itens + subdirs `adr/`, `architecture/`, `database/`, `security/`, `operations/`, `whatsapp/`, `ml/`, `plans/`...): mistura — ADRs e `AGENDA.md`/`OBSERVABILITY_DASHBOARD.md` tendem a AS-IS; `AI_ROADMAP_2026.md`, `IMPROVEMENT_PLAN.md`, `PERF_PLAN_2026.md`, `cloudflare-implementation-plan.md`, `FISIOFLOW_TECH_EVOLUTION_2026.md`, `TODO.md`, `TASKS_IA_FISIOBRAIN.md` = plano/visão futura.
- `docs2026/` (3): `PLATAFORMA_IA_AUTOMACAO_2026.md` = **AS-IS confiável** (doc de entrega dos PRs #136–183); `AUDITORIA_CRM_TRANSVERSAL_2026.md` = snapshot AS-IS; `ai-soap-refactor-plan.md` = plano (SOAP já foi removido — parcialmente obsoleto).
- `specs/` (28 entradas): specs Spec-Kit por feature. As das features entregues (ex.: `tarefas-integracoes`, `voice-scribe-v2-agents-sdk`, `retorno-medico-envio`, `platform-modernization-may-2026`, `matar-soap`, `omnichannel-crm`) = registro histórico AS-IS do que foi construído; `clinic-live-board` = **parado por decisão de produto**; `cloudflare-platform-roadmap`, `roadmap-pos-s8.md` = visão futura; `ditado-evolucao` = ativo com gate F1 pendente.
- `clinical_docs/`: só `README.md` (placeholder — o conteúdo real vive no bucket R2 `fisioflow-clinical-docs`).

## 8. Arquivos potencialmente sensíveis na raiz (caminho + risco; conteúdo NÃO copiado)

| Caminho | Tipo de risco |
|---|---|
| `Pacientes - Activity Fisioterapia - 6a35aff1a2cd6.csv` (~147 KB) | **Dados pessoais de pacientes reais (LGPD)** em texto plano no repo |
| `backups/prod-mooca-fisio-before-clean-20260515-*.dump` (2), `backups/cleanup-prod-mooca-fisio-20260515.sql` | Dump completo de banco de produção — dados clínicos/pessoais |
| `secrets/orthanc_username.txt`, `secrets/orthanc_password.txt` | Credenciais em texto plano (servidor DICOM Orthanc) |
| `whatsapp_phone_number_id` (arquivo na raiz) | Identificador de infra Meta solto no repo |
| `build.ipa` (~19,6 MB) | Binário de app assinado commitado |
| `*.png` de produção: `dashboard_production.png`, `patients_production.png`, `crm_whatsapp_production.png`, `financial_production.png`, `evolucao_clinica_production.png`, `avaliacao_inicial_production.png`, `schedule_production.png`, `auth_snapshot.png`, `agenda_modal.png`, `evolution_snapshot.png`, `screenshot_*.png`, `production_exercises_page.png` | Screenshots de produção podem expor nomes de pacientes/finanças |
| `2026-05-15-112905-...txt`, `2026-05-20-...txt`, `24-06-2026...txt`, `oie2026-06-22-...txt`, `fisioterapeuta-na-pagina-d.txt`, `inteligencia276-...txt` | Transcrições de sessões de agente — podem conter segredos/dados citados |
| `com schema real" --no-verify --no-gpg-sign 2>&1` (arquivo com nome de comando git) | Lixo de shell redirect; conteúdo de log potencialmente sensível |
| `broken_exercises.json`, `6a35aff1a2cd6.csv` (listado via glob) | Dados operacionais exportados |
| `.env`, `.env.local`, `.env.production`, `.env.cloudflare.local`, `apps/api/.dev.vars` | Arquivos de env com valores reais presentes no working tree (nomes inventariados em `env-and-bindings.csv`; memória registra que a senha Neon vazada já foi rotacionada) |

---

## Contagens-resumo
- **Workspaces/dirs classificados:** 27 entradas no manifest (10 ativos, 9 legados, 8 mortos).
- **Rotas UI:** 224 rotas ativas extraídas (`createBrowserRouter`) + 6 arquivos de framework-mode inativo.
- **Testes:** 442 arquivos (139 api, 135 e2e Playwright, 167 unit, 1 integration; ~2.629 `it/test`).
- **Migrations:** 180 arquivos em `apps/api/migrations` (até 0140) vs 24 sql legados em `drizzle/` + 2 em `packages/db/migrations`.
- **Bindings/vars/secrets:** ~120 nomes `env.*` consumidos pela API; 38 bindings Cloudflare; 16 `[vars]`; restante secrets.
- **Flags:** 3 flags por-org em `settings.*`, ~10 flags por env no Worker, 13 `VITE_FEATURE_*` no front.
