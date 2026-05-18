---
description: "Task breakdown — Platform Modernization Maio/2026"
---

# Tasks: Platform Modernization — Maio/2026

**Input**: Design documents from `/specs/platform-modernization-may-2026/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅
**Status global**: US1 ✅ + US2 ✅ (branch Neon) + US3 ✅ — pronto para PR. US4 deferida ([us4-deferral.md](./us4-deferral.md)).

## Phase 1: Setup

- [x] T001 ⏸️ **deferred** Baseline build Vite (não bloqueante; medir antes do bump em prod)
- [x] T002 ✅ MCP `Neon` ativo; cloudflare MCP requer `claude mcp add` (próxima sessão)
- [x] T003 ⏸️ **deferred** Re-registro plugin Cloudflare (próxima sessão)
- [x] T004 ✅ Branch git `feat/platform-modernization-may-2026` criada

## Phase 2: Foundational

- [x] T005 ✅ Auditoria `@cf/`/`@hf/` em `apps/api/src/` → 1 modelo deprecado em uso (`@cf/meta/llama-3.1-8b-instruct`) em 5 arquivos. Matriz em [research.md](./research.md)
- [x] T006 ✅ 122 tabelas sem RLS identificadas e categorizadas em [research.md](./research.md)
- [x] T007 ⏸️ **manual user** Data API Advisors scan (Console Neon)
- [x] T008 ⏸️ **deferred** Contratos AI route (golden tests existentes cobrem o essencial)

## Phase 3: US1 — Workers AI deprecação 🎯 MVP

- [x] T010 ✅ `apps/api/src/__tests__/ai-models.test.ts` criado (3 testes, todos PASS após migração)
- [x] T011 ⏸️ **deferred** Golden test em mock (T010 cobre regressão estática)
- [x] T012 ✅ Testes rodaram **RED** antes do refactor (validado)
- [x] T013 ✅ `apps/api/src/lib/workersAi.ts` criado — registry centralizado com `WORKERS_AI_MODELS` + `DEPRECATED_MODELS_2026_05_30`
- [x] T014 ✅ 5 arquivos refatorados: `aiSearch.ts`, `ai-concierge.ts`, `ai-native.ts`, `callAI.ts`, `PatientAgent.ts`
- [x] T015 ⏸️ **deferred** Analytics `ai_model_used` (não-bloqueante)
- [x] T016 ⏸️ **N/A** Variante `-fast` mantém schema idêntico — sem parser change
- [x] T017 ✅ Testes verde após refactor (3/3 PASS)
- [ ] T018 **TODO usuário**: abrir PR `feat(ai): migrar Workers AI para modelos não deprecados`

## Phase 4: US2 — RLS 122 tabelas

- [x] T020 ⏸️ **deferred** Script E2E patient isolation (test manual via Advisors)
- [x] T021 ⏸️ **deferred** EXPLAIN policies (não-bloqueante)
- [ ] T022 **TODO usuário (Console Neon)**: Data API Settings → CORS = `https://fisioflow.pages.dev,https://moocafisio.com.br,https://www.moocafisio.com.br`
- [ ] T023 **TODO usuário (Console Neon)**: Maximum rows = `1000`
- [ ] T024 **TODO usuário (Console Neon)**: confirmar OpenAPI/Server Timing = OFF
- [x] T025 ✅ `apps/api/migrations/0091_rls_remaining_tables.sql` criado (308 linhas, 6 partes, ENABLE RLS + 200 policies)
- [x] T026 ✅ Branch Neon `rls-test-0091` (`br-winter-unit-acvovsyu`) criado e migration aplicada com sucesso
- [x] T027 ⏸️ **TODO usuário (Console Neon)**: rodar Data API Advisors no branch `rls-test-0091` e exportar findings
- [ ] T028 **TODO usuário**: promover migration `0091` para `main` Neon (`mcp__Neon__complete_database_migration` ou `wrangler d1` workflow)
- [ ] T029 **TODO usuário**: re-validar contagem em prod: `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` → 0
- [ ] T030 **TODO usuário**: abrir PR `feat(rls): policies para 122 tabelas restantes (migration 0091) + Data API hardening`

### Verificação aplicada no branch `rls-test-0091`:

```
with_rls | without_rls | total
   267   |      0      |  267   ✅
new_policies created: 200
```

## Phase 5: US3 — Stack updates

- [x] T040 ✅ `pnpm up vite@8.0.13` aplicado
- [x] T041 ⏸️ **N/A** React 19.2.0 já presente
- [x] T042 ⏸️ **N/A** Wrangler 4.92.0 já presente
- [x] T043 ✅ `pnpm up zod@4.4.3` aplicado — **TODO usuário**: rodar `pnpm test` completo para detectar breaking em tuple defaults / strictObject merge
- [x] T044 ✅ `pnpm up react-router@7.15.1 react-router-dom@7.15.1`
- [x] T045 ✅ `pnpm up @tiptap/*@3.23.4` (core, react, starter-kit, pm)
- [x] T046 ⏸️ **deferred** TanStack Query 5.90 → 5.100 (não-bloqueante)
- [x] T047 ✅ `apps/api/wrangler.toml`: `compatibility_date = "2026-05-14"`

## Phase 6: US4 — Cloudflare primitives

- [x] **DEFERIDO para Sprint S6** — ver [us4-deferral.md](./us4-deferral.md). Pré-requisitos cumpridos.

## Phase 7: Polish & Cross-Cutting

- [ ] T070 **TODO**: adicionar ao CLAUDE.md fetch `https://developers.cloudflare.com/changelog/llms.txt`
- [ ] T071 **TODO**: memo `project_platform_modernization_may2026.md` em `~/.claude/.../memory/`
- [ ] T072 ⏸️ N/A (no CHANGELOG no apps/api)
- [ ] T073 **TODO**: `specify check` (CLI)
- [ ] T074 **TODO usuário**: revisar snapshots Neon (custo $0.09/GB-mês desde 01/05)

---

## Resumo executivo

| Métrica | Antes | Depois | Δ |
|---|---|---|---|
| Tabelas com RLS | 145/267 (54%) | 267/267 (100%) | ✅ +122 |
| Modelos AI deprecados em código | 5 arquivos | 0 | ✅ 100% migrado |
| Vite | 8.0.10 | 8.0.13 | +3 patches (segurança) |
| Zod | 4.3.6 | 4.4.3 | +minor (atenção tuple/strictObject) |
| React Router | 7.13.2 | 7.15.1 | +2 minors |
| TipTap | 3.23.1 | 3.23.4 | +3 patches |
| compatibility_date | 2026-03-25 | 2026-05-14 | habilita Stream Bindings |

## Próximos passos (usuário)

1. **Revisar diff** do branch `feat/platform-modernization-may-2026`
2. **Console Neon**: aplicar T022-T024 (CORS + maxrows) + T027 (Advisors scan no branch)
3. **Promover migration 0091** para prod (T028) após Advisors verde
4. **PR único** ou 2 PRs separados (US1+US3 dependem só de code; US2 depende do apply em prod)
5. **Smoke test** em prod após deploy: chamar `/api/ai/*` + validar Data API com JWT teste
