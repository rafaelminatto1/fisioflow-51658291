# Feature Specification: Platform Modernization — Maio/2026

**Feature Branch**: `feat/platform-modernization-may-2026`
**Created**: 2026-05-18
**Status**: Draft
**Input**: Pesquisa de changelogs (Cloudflare, Neon, Vite 8.0.13, React 19.2, Wrangler 4.92, Agents SDK 0.12.4, TipTap, Zod, React Router) cruzada com estado real do projeto (Neon MCP: 145/267 tabelas com RLS).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Manter inferência clínica funcionando após depreciação Workers AI (Priority: P1) 🎯 MVP

**Persona**: Fisioterapeuta usando o **Voice Scribe** e **AI Suggestions** durante evolução.

Em 30/05/2026, 18 modelos Workers AI saem do ar (Llama 3/3.1, Gemma 3, Mistral, Phi-2, Kimi K2.5, etc.). Qualquer rota em `apps/api/src/routes/ai.ts` ou serviço que referencie um modelo deprecado começará a retornar 4xx/5xx, quebrando sugestões clínicas e transcrições.

**Why this priority**: Deadline regulatória externa em 12 dias. Falha derruba feature em produção.

**Independent Test**: `curl` nas rotas `/api/ai/*` retornando 200 com `model: '@cf/...'` atualizado; smoke test em `NotionEvolutionPanel` gera sugestão sem erro.

**Acceptance Scenarios**:

1. **Given** um fisioterapeuta abre uma sessão Observação Livre, **When** clica em "Sugerir hipótese diagnóstica", **Then** o backend retorna sugestão em <3s sem usar modelo deprecado.
2. **Given** uma chamada à rota `/api/ai/transcribe`, **When** o request é processado, **Then** o modelo invocado é um dos: `@cf/zai-org/glm-4.7-flash`, `@cf/google/gemma-4-26b-a4b-it`, `@cf/moonshotai/kimi-k2.6`, `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.

---

### User Story 2 — Bloquear vazamento de PHI via Neon Data API (Priority: P1)

**Persona**: Admin/DPO responsável por LGPD; também atacante hipotético com JWT válido de um paciente.

Hoje, 122 das 267 tabelas em `public` **não têm RLS** (validado via `pg_tables` em 2026-05-18). Como Data API é PostgREST e expõe schema diretamente sobre HTTPS, qualquer cliente com JWT consegue `SELECT *` de tabelas como `sessions`, `medical_requests`, `marketing_exports` se as policies não cobrirem org/paciente.

**Why this priority**: PHI exposto = violação LGPD + perda de confiança. Investimento parcial (145 tabelas) já foi feito.

**Independent Test**: Token JWT de paciente A não consegue ler `sessions` do paciente B; Data API Advisors (novo tab Neon, ~15/05) reporta 0 findings críticos.

**Acceptance Scenarios**:

1. **Given** 122 tabelas listadas sem `rowsecurity=true`, **When** migration `0036_rls_remaining_tables.sql` é aplicada em branch Neon, **Then** `SELECT count(*) FILTER (WHERE rowsecurity)` retorna 267.
2. **Given** token de paciente A, **When** Data API recebe `GET /sessions?patient_id=eq.<B>`, **Then** retorna `[]` (não 401 — política filtra silenciosamente).
3. **Given** Console Neon, **When** Data API Advisors roda scan, **Then** lista de findings P0/P1 fica vazia.
4. **Given** CORS configurado, **When** request vem de origem não autorizada, **Then** browser bloqueia a chamada.

---

### User Story 3 — Compatibility & security patches de stack (Priority: P2)

**Persona**: Engenheiros do time; CI/CD.

Vite 8.0.5 trouxe fixes de path-traversal em sourcemap; Wrangler 4.92 corrige OAuth rotation; Zod 4.4.0 alterou tuple-defaults (breaking); React 19.1→19.2.1 habilita Activity, useEffectEvent e Performance Tracks. Manter versões atrasadas = dívida e exposição.

**Why this priority**: Sem impacto imediato de produção, mas window curto antes de incompatibilidades futuras.

**Independent Test**: `pnpm test` verde, `pnpm build` < tempo anterior, `wrangler deploy --dry-run` sem warnings.

**Acceptance Scenarios**:

1. **Given** lockfile atualizado, **When** CI roda `pnpm install && pnpm test`, **Then** todos os 1.000+ testes passam.
2. **Given** Zod 4.4.3 instalado, **When** schemas com `.default([...])` em tuplas são validados, **Then** comportamento permanece consistente com testes existentes (ou testes foram atualizados explicitamente).

---

### User Story 4 — Aproveitar novos primitivos Cloudflare (Stream Bindings, R2 SQL JOINs, Agents SDK Voice) (Priority: P3)

**Persona**: Engenheiro de plataforma evoluindo features existentes.

- **Stream Bindings** (07/05): elimina API calls autenticadas no upload de `exercise_videos`.
- **R2 SQL JOINs** (14/05): permite arquivar `sessions > 90d` em Iceberg e consultar com JOIN em `patients`/`appointments` sem ETL.
- **Agents SDK v0.12.4 Voice** (13/05): Voice Scribe com history sobrevive a restarts de Durable Object.

**Why this priority**: Refactor opcional, ganho de DX e custo, não bloqueia operação.

**Independent Test**: Upload de vídeo via novo binding completa < tempo anterior; query R2 SQL com JOIN devolve resultado; Voice agent reconecta sem perder transcrição.

**Acceptance Scenarios**:

1. **Given** binding `STREAM` configurado, **When** Worker chama `env.STREAM.upload(url, {meta})`, **Then** vídeo aparece no dashboard Stream sem usar API key.
2. **Given** namespace R2 SQL com `sessions_archive` e `patients`, **When** query usa `INNER JOIN`, **Then** retorna < 5s para 1000 linhas.

---

### Edge Cases

- **Token JWT expirado** durante operação de patient self-read → política deve falhar fechado (sem retornar dados de outro paciente por engano).
- **Tabela sem `organization_id` nem `patient_id`** (ex: `audit_logs`) → policy só para `service_role` ou `admin`.
- **Migration RLS aplicada parcialmente** (branch Neon) e promovida → Hyperdrive não impactado porque conexão usa `neondb_owner` (RLS sem FORCE).
- **Modelo Workers AI substituto com schema de saída diferente** (Gemma 4 retorna estrutura distinta de Llama 3.1) → parser precisa ser tolerante ou condicional por modelo.
- **Zod 4.4 breaking em strictObject merge** → schemas de payload de API que usam `.merge()` podem precisar revisão.
- **Snapshot billing Neon** ($0.09/GB-mês ativo desde 01/05) → revisar quantos snapshots automáticos temos antes de virar custo recorrente.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Sistema MUST substituir todas as referências aos 18 modelos Workers AI deprecados antes de 2026-05-30 23:59 UTC.
- **FR-002**: Sistema MUST habilitar RLS nas 122 tabelas restantes em `public` com policies cobrindo: staff org-scoped, patient self-only, public catalog.
- **FR-003**: Neon Data API MUST ser configurado com CORS allowlist (`https://fisioflow.pages.dev`, `https://moocafisio.com.br`) e Maximum Rows = 1000.
- **FR-004**: Stack MUST ser atualizada para: Vite 8.0.13, Wrangler 4.92, React 19.2.1, Zod 4.4.3, React Router 7.15.1, TipTap 3.23.4.
- **FR-005**: Sistema MUST passar `pnpm test` e Data API Advisors scan (0 findings P0/P1) após cada PR.
- **FR-006**: [P3] Upload de `exercise_videos` MUST migrar para Stream Bindings (binding `STREAM` em `wrangler.toml`, `compatibility_date >= 2026-04-14`).
- **FR-007**: [P3] Pipeline de arquivamento de `sessions > 90d` MUST usar R2 Data Catalog + R2 SQL JOINs.
- **FR-008**: [P3] Voice Scribe MUST migrar para Agents SDK Voice com history persistido em Durable Object.
- **FR-009**: Documentação MUST registrar policies por tabela em `apps/api/migrations/0036_rls_remaining_tables.sql` com comentários `-- Why:` para cada policy não-trivial.
- **FR-010**: Sistema NÃO DEVE migrar para Postgres 18 nesta fase (deferido para Q3/2026).

### Key Entities

- **Workers AI Model Reference**: string `@cf/{org}/{model}-{variant}` usada em `apps/api/src/routes/ai.ts` e helpers. Atributos: modelo, deprecation_date, replacement.
- **RLS Policy**: triplet (tabela, role, predicado SQL). Roles: `authenticated`, `anonymous`. Predicado usa `auth.user_id()` do `pg_session_jwt`.
- **Stack Dependency**: linha em `package.json` com versão pinned. Atributos: name, current, target, breaking_notes.
- **Compatibility Date** (`wrangler.toml`): determina runtime features disponíveis no Worker. Alvo: `2026-05-14` ou superior.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 0 (zero) chamadas Workers AI a modelos da lista de depreciação após 2026-05-30 (verificável via Analytics Engine `SELECT blob1, count() ... WHERE blob1 LIKE '@cf/meta/llama-3%' AND timestamp > '2026-05-30'`).
- **SC-002**: 100% das tabelas em `public` com `rowsecurity = true` (`SELECT count(*) FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity` retorna 0).
- **SC-003**: Data API Advisors com 0 findings P0/P1 e ≤5 P2/P3.
- **SC-004**: Nenhuma regressão em E2E (suite Playwright atual passa após upgrades).
- **SC-005**: Tempo de build Vite reduz ≥10% após 8.0.13 + Rolldown 1.0.1 (medir baseline antes do upgrade).
- **SC-006**: [P3] Upload de vídeo via Stream Binding reduz latência server-side em ≥30% vs API-key (apenas se migração for executada).
- **SC-007**: PRs entregues incrementalmente, com pelo menos 1 deploy intermediário entre US1 e US2 (validação independente).

## Assumptions

- Cluster Neon `purple-union-72678311` (sa-east-1, Postgres 17) continua sendo o único banco; nenhuma migração de provider está planejada nesta janela.
- Hyperdrive permanece conectado via `neondb_owner` (RLS sem `FORCE` não afeta a connection).
- Não há rota pública que dependa explicitamente de modelos depreciados sem fallback — auditoria de `ai.ts` confirmará.
- Equipe pode dedicar ~1 sprint (2 semanas) entre 2026-05-18 e 2026-05-30 para US1+US2; US4 fica para Sprint S6.
- Branch Neon será criado para testar migration RLS antes da promoção a prod (Neon branching é gratuito até X horas/mês).
- Frontend Pages e Worker `fisioflow-api` estão no monorepo atual (`apps/api/` + `src/`); convenções `pnpm` workspace mantidas.
- Não há contrato com clientes externos da Data API (uso apenas first-party) — CORS allowlist restrita é segura.
