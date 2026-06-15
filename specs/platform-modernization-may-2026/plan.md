# Implementation Plan: Platform Modernization — Maio/2026

**Branch**: `feat/platform-modernization-may-2026` | **Date**: 2026-05-18 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `specs/platform-modernization-may-2026/spec.md`

## Summary

Modernizar a plataforma em 4 frentes coordenadas, com **2 frentes P1 com deadline duro** (Workers AI 30/05, RLS LGPD) e 2 oportunistas (stack bumps P2, novos primitivos Cloudflare P3). Abordagem: PRs pequenos e independentes, ordenados por risco crescente, com gate por Constitution Check em cada um.

## Technical Context

**Language/Version**: TypeScript 5.8 strict, Node 22+ (Wrangler 4.92 exige); pnpm workspace
**Primary Dependencies**: React 19.2.1 + Vite 8.0.13 + Hono (Worker) + Drizzle ORM + Neon serverless + Cloudflare Agents SDK 0.12.4
**Storage**: Neon Postgres 17 (`purple-union-72678311`, sa-east-1) via Hyperdrive `12b9fefcfbc04074a63342a9212e1b4f`; R2 `fisioflow-media`; KV `FISIOFLOW_CONFIG`; D1 `fisioflow-db` + `fisioflow-edge-cache`; Analytics Engine `fisioflow_events`
**Testing**: Vitest 4.0.18 (web + workers), jest-expo (mobile), Playwright (E2E web)
**Target Platform**: Cloudflare Workers (`compatibility_date = 2026-05-14`), Cloudflare Pages, Expo SDK 55 (mobile não impactado nesta fase)
**Project Type**: Web monorepo (`src/` dashboard, `patient-app/`, `professional-app/`, `apps/api/` Worker)
**Performance Goals**: p95 < 200ms em rotas de AI; build Vite ≥10% mais rápido após 8.0.13
**Constraints**: Zero downtime; RLS sem `FORCE` (Hyperdrive trafega como owner); CORS Data API restrita; PHI nunca em logs/Analytics
**Scale/Scope**: 196 pacientes, 637 appointments, 244 sessions, 267 tabelas Neon (145 com RLS hoje), ~50 rotas Worker

## Constitution Check

_Gate em cada user story; re-verificar após Phase 1._

| Princípio                | US1 (AI)                                   | US2 (RLS)                     | US3 (deps)          | US4 (CF primitives)             |
| ------------------------ | ------------------------------------------ | ----------------------------- | ------------------- | ------------------------------- |
| **I. Spec-Driven**       | ✅ este spec                               | ✅ este spec                  | ✅ este spec        | ✅ este spec                    |
| **II. Multi-plataforma** | ✅ só Worker                               | ✅ só DB                      | ⚠️ ver mobile bumps | ✅ só Worker                    |
| **III. Privacy/LGPD**    | ✅ sem PHI em prompts                      | ✅ **core** desta US          | ✅ neutro           | ✅ Voice history em DO isolado  |
| **IV. Test-First**       | ✅ teste de modelo ativo antes do refactor | ✅ RLS testada em branch Neon | ✅ suite existente  | ✅ teste de upload Stream antes |
| **V. Observability**     | ✅ Analytics Engine traceia model          | ✅ Data API Advisors monitora | ✅ neutro           | ✅ DO observability=enabled     |

**Violations**: Nenhuma identificada que exija seção "Complexity Tracking".

## Project Structure

### Documentation (this feature)

```text
specs/platform-modernization-may-2026/
├── plan.md              # Este arquivo
├── spec.md              # Specification (criada)
├── research.md          # (Phase 0 — opcional, dados já consolidados no spec)
├── data-model.md        # (Phase 1 — RLS policy matrix)
├── contracts/           # (Phase 1 — Worker AI route contracts pós-migração)
└── tasks.md             # (Phase 2 — gerado por /speckit.tasks)
```

### Source Code (repository root)

```text
apps/api/                           # Worker Hono (Cloudflare)
├── src/
│   ├── routes/
│   │   ├── ai.ts                   # ⚠️ US1 — substituir modelos deprecados
│   │   ├── exercise-videos.ts      # 🆕 US4 — usar STREAM binding
│   │   └── ...
│   ├── lib/
│   │   ├── analytics.ts            # adicionar event `ai_model_used`
│   │   └── workersAi.ts            # (criar) helper centralizado p/ modelos
├── migrations/
│   ├── 0033_rls_policies.sql       # já aplicada (145 tabelas)
│   └── 0036_rls_remaining_tables.sql  # 🆕 US2 — 122 tabelas restantes
└── wrangler.toml                   # ⚠️ compatibility_date → 2026-05-14; STREAM binding

src/                                # Dashboard React (Pages)
├── components/evolution/v3-notion/
│   └── NotionEvolutionPanel.tsx    # smoke test US1 (AI sugestões)
├── hooks/
│   └── useVoiceScribe.ts           # 🆕 US4 — migrar para Agents SDK Voice
└── lib/api/workers-client.ts       # type-check após upgrade Hono RPC

package.json                        # ⚠️ US3 — vite 8.0.13, react 19.2.1, etc.
pnpm-lock.yaml                      # regenerar
```

**Structure Decision**: Monorepo existente; **nenhum novo top-level dir**. Toda a modernização cabe em arquivos já presentes + 1 migration nova + 1 helper novo (`workersAi.ts`).

## Phasing

| Fase                   | Conteúdo                                                                                               | Saída                          | Duração   |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------ | --------- |
| **0 — Research**       | Auditoria `grep` modelos deprecados em `ai.ts`; `SELECT` 122 tabelas sem RLS; baseline Vite build time | `research.md` (lista exata)    | 1 dia     |
| **1 — Design**         | Matriz de policy RLS por tabela; mapping modelo deprecado → substituto; testes a adicionar             | `data-model.md` + `contracts/` | 1 dia     |
| **2 — Tasks**          | `/speckit.tasks` gera tasks.md ordenado por US                                                         | `tasks.md`                     | auto      |
| **3 — Implementation** | PRs incrementais (US1 → US2 → US3 → US4 [opt])                                                         | PRs merged em main             | 2 semanas |

## Risks & Mitigations

| Risco                                                     | Severidade | Mitigação                                                                                                        |
| --------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Modelo substituto (Gemma 4) com schema de saída diferente | Alto       | Parser tolerante + golden tests por modelo em `__tests__/ai.test.ts`                                             |
| Policy RLS bloqueia query legítima do Worker              | Alto       | Worker conecta via Hyperdrive como `neondb_owner` → RLS sem FORCE não filtra owner. Validar em branch Neon antes |
| Zod 4.4 breaking em tuple defaults                        | Médio      | Rodar `pnpm test` em PR isolado de Zod; ajustar schemas afetados                                                 |
| Wrangler 4.92 quebra deploy CI                            | Médio      | Testar `wrangler deploy --dry-run` em branch antes                                                               |
| Stream Binding deprecia API key flow sem aviso            | Baixo      | Manter rota antiga até cutover validado                                                                          |
| Branch Neon esgota tempo gratuito                         | Baixo      | Branch curto (~2h) só para validar migration                                                                     |

## Out of Scope (explicitamente)

- Migração Postgres 17 → 18 (deferido Q3/2026 — requer novo project Neon).
- Upgrade Tailwind v4 → v5 (sem v5 estável até hoje).
- Mobile apps (Expo SDK 55, RN 0.83.2, React 19.2.0 já current).
- Refactor de schema Drizzle / arquitetura de pastas.
- Voice Scribe completo (US4 entrega só o esqueleto; experiência completa fica para PRD próprio).
- Workers VPC Hyperdrive (banco é público, não precisa).

## Complexity Tracking

> Nenhuma violação de Constitution Check identificada. Tabela vazia intencionalmente.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _(none)_  | —          | —                                    |
