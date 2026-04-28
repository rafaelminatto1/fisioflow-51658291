# Plano Técnico FisioFlow — Ciclo Abril–Julho 2026

> **Versão:** 1.1  
> **Data de geração:** 2026-04-28  
> **Última atualização:** 2026-04-28 — D1 (RBAC roles) e D2 (staging) respondidas parcialmente  
> **Status:** Em revisão — decisões D3–D10 pendentes

---

## Sumário Executivo

O FisioFlow completou em março/2026 a migração total do Firebase para Cloudflare + Neon DB, eliminando todas as dependências do ecossistema Google no backend. O repositório opera em produção com: Cloudflare Workers (Hono), Neon PostgreSQL (Drizzle ORM + Hyperdrive), Neon Auth (JWT/OIDC), React 19/Vite 8, Tailwind CSS v4, e R2 para mídia.

O próximo ciclo tem três objetivos centrais:

1. **Estabilizar a base de entrega** — CI/CD com gates reais, pipeline de migrations com dry-run e aprovação, suite de testes com cobertura ≥ 70 % nas APIs críticas.
2. **Elevar observabilidade e segurança a nível produção** — Dashboards operacionais sobre o Analytics Engine, alertas de latência/erro, revisão de RBAC e scanners de dependência em CI.
3. **Formalizar o design system e a governança** — Tokens Tailwind v4 documentados, componentes Shadcn catalogados, ciclo de revisão quinzenal estabelecido.

O plano é organizado em **6 fases** de 2–3 semanas cada, totalizando aproximadamente **10 semanas** (início 2026-04-28, conclusão prevista 2026-07-04).

**Principais riscos:** migrations pendentes (0032–0035) não aplicadas em staging podem causar drift de schema; ausência de SAST/DAST no CI expõe supply-chain; cobertura de testes ainda baixa pode mascarar regressões em novas features.

---

## 1. Visão Geral do Plano

### 1.1 Objetivo

Transformar os documentos de baseline (MIGRACOES.md, TESTS.md, OBSERVABILITY.md, SECURITY.md, DESIGN_SYSTEM.md, BACKLOG.md) em entregáveis concretos, com owners, critérios de aceitação, gates de CI/CD e cronograma rastreável.

### 1.2 Contexto do Projeto

| Camada | Tecnologia | Estado (abr/2026) |
|---|---|---|
| API/Backend | Cloudflare Workers + Hono | Produção ativa |
| Banco de dados | Neon PostgreSQL + Drizzle ORM + Hyperdrive | Produção ativa; migrations até 0031 aplicadas |
| Auth | Neon Auth (Better Auth / JWT/OIDC) | Produção ativa |
| Frontend Web | React 19 + Vite 8 + Tailwind CSS v4 | Produção ativa |
| Storage/Mídia | Cloudflare R2 (`media.moocafisio.com.br`) | Produção ativa |
| KV / D1 / Queues | Cloudflare (edge cache, rate limits, fila BG) | Produção ativa |
| Analytics | Cloudflare Analytics Engine (`fisioflow_events`) | Instrumentação básica ativa |
| Testes | Vitest (workers) — 20 testes unitários | Cobertura mínima |
| CI/CD | Não formalizado (gates ausentes) | Gap crítico |
| SAST/DAST | Não implementado | Gap crítico |

### 1.3 Áreas Abrangidas

- **Migrações de DB** — pipeline seguro, dry-run, rollback, auditoria.
- **Testes** — unit, integration, e2e; cobertura mínima; CI gates.
- **Observabilidade** — logs estruturados, métricas, alertas, SLOs.
- **Segurança** — gestão de segredos, RBAC/RLS, SAST, scanner de dependências, runbook de incidentes.
- **Design System** — tokens, componentes, governança de versões.
- **Governança** — papéis, ciclo de revisões, rastreamento de backlog.

---

## 2. Premissas e Limites

### 2.1 Premissas Operacionais

- **Nenhuma alteração de código** é produzida por este plano — somente planejamento e documentação de processos.
- Existem três ambientes: `dev` (local), `staging` (Cloudflare preview / Neon branch de staging), `prod`.
- Migrations 0032–0035 estão definidas mas **não aplicadas em staging/prod** — tratadas como pendências imediatas.
- O repositório usa `pnpm` como gerenciador de pacotes em monorepo.
- O branch principal é `main`; PRs devem passar por revisão antes do merge.
- Secrets de produção (Neon, Wrangler, Cloudflare) são gerenciados fora do código e nunca commitados.
- O time é enxuto (presumivelmente 1–3 engenheiros + PM); estimativas de esforço refletem isso.

### 2.2 Limites do Plano

| Fora do Escopo Imediato | Justificativa |
|---|---|
| Implementação de novas features (NFS-e real, LiveKit produção completa) | Estabilização primeiro |
| Migração de Patient App (React Native/Expo) | Plano dedicado necessário |
| Implementação de SIEM corporativo completo | Custo; Analytics Engine é suficiente para o estágio atual |
| SLA contratual com clientes | Decisão de negócio; SLOs técnicos como precursor |
| Orçamento e alocação de licenças | Fora do escopo técnico deste plano |

---

## 3. Objetivos e Métricas de Sucesso (KPIs)

### 3.1 Migrações de DB

| KPI | Meta | Método de Medição |
|---|---|---|
| Migrations com script `down` | 100 % das novas migrations | Checklist em PR template |
| Tempo de aplicação em staging | < 5 min por migration | Log de CI |
| Zero downtime em prod | 100 % das migrations | Monitoramento pós-deploy |
| Migrations pendentes aplicadas | 0032–0035 em staging + prod | Status da tabela de migrations |
| Backup pré-migration executado | 100 % em staging/prod | Artefato de CI |

### 3.2 Qualidade de Software (Testes)

| KPI | Meta | Método de Medição |
|---|---|---|
| Cobertura unit (APIs críticas) | ≥ 70 % | Relatório Vitest/Istanbul |
| Cobertura unit (workers geral) | ≥ 60 % | Relatório Vitest |
| Testes e2e — fluxos críticos cobertos | ≥ 5 cenários (cadastro, agendamento, prontuário, prescrição, auth) | Playwright report |
| CI gate: PRs bloqueados por falha | 100 % dos PRs críticos | GitHub Actions status check |
| Tempo de execução da suite (unit + integration) | < 3 min | CI log |

### 3.3 Observabilidade

| KPI | Meta | Método de Medição |
|---|---|---|
| Latência API p95 (fluxos críticos) | < 300 ms em prod | Analytics Engine SQL query |
| Disponibilidade | > 99,9 % (mensal) | Cloudflare dashboard |
| Taxa de erros 5xx | < 0,5 % | Analytics Engine |
| Alertas de latência configurados | ≥ 3 alertas ativos (latência alta, 5xx, queda de disponibilidade) | Cloudflare Notifications |
| Logs com campos obrigatórios | 100 % das rotas | Revisão de código + teste de log |
| Dashboard operacional funcional | 1 dashboard cobrindo API + DB + Queues | Artefato de entrega |

### 3.4 Segurança

| KPI | Meta | Método de Medição |
|---|---|---|
| SAST no CI (GitHub CodeQL ou similar) | Habilitado em 100 % dos PRs | GitHub Actions |
| Scanner de dependências (npm audit / Snyk) | Executado em 100 % dos PRs | CI log |
| Segredos no código | 0 ocorrências | git-secrets ou trufflehog em CI |
| RLS ativo em tabelas multi-tenant | 100 % das tabelas com dados de pacientes | Teste de isolamento em staging |
| Runbook de incidentes documentado | 1 runbook publicado | Artefato de entrega |
| Rotação de segredos críticos documentada | Processo formalizado | Playbook |

### 3.5 Design System

| KPI | Meta | Método de Medição |
|---|---|---|
| Tokens Tailwind v4 documentados | 100 % dos tokens de cor, tipografia, espaçamento | DESIGN_SYSTEM.md atualizado |
| Componentes Shadcn catalogados | ≥ 20 componentes com exemplos e estados | Catálogo no Storybook ou doc estático |
| Novos componentes sem revisão de DS | 0 em PRs após Fase 5 | PR checklist |

### 3.6 Governança

| KPI | Meta | Método de Medição |
|---|---|---|
| Ciclo de revisão de backlog | Quinzenal (bi-weekly) | Registro de reuniões |
| PRs sem owner definido | 0 | PR template obrigatório |
| Documentos de arquitetura atualizados | ARCHITECTURE.md criado e revisado | Artefato de entrega |

---

## 4. Escopo Detalhado

### 4.1 O que será produzido neste ciclo

Este plano abrange exclusivamente a produção de artefatos de processo, configuração de CI/CD, pipelines e documentação. **Nenhuma feature de produto** é implementada neste ciclo.

### 4.2 Artefatos de Entrada (referência)

| Artefato | Papel no Plano |
|---|---|
| `MIGRACOES.md` | Define convenções, fluxo e responsáveis por migrations |
| `TESTS.md` | Define estratégia, ferramentas e metas de cobertura |
| `OBSERVABILITY.md` | Define estrutura de logs, métricas, SLOs e roadmap |
| `SECURITY.md` | Define gestão de segredos, RBAC, proteção de dados e incidentes |
| `DESIGN_SYSTEM.md` | Define tokens, componentes, governança de versões |
| `BACKLOG.md` | Prioridades de alto/médio/baixo nível para o ciclo |
| `CLAUDE_PLAN_REQUEST.md` | Solicitação formal deste plano técnico |

### 4.3 O que está fora do escopo

- Implementação de código de produto (features, bugfixes).
- Definição de arquitetura de Patient App (React Native/Expo) — plano separado.
- Configuração de SIEM corporativo, Grafana/Prometheus externos.
- Decisões de precificação, licenciamento ou contrato.

---

## 5. Roadmap por Fase

### Fase 1 — Foundation & CI/CD (Semanas 1–2 | 2026-04-28 a 2026-05-09)

**Objetivo:** Estabelecer a estrutura de CI/CD com gates mínimos, PR template, e ambiente de staging formalizado.

| Item | Descrição |
|---|---|
| CI pipeline | GitHub Actions: lint + typecheck + `pnpm test` em PRs |
| PR template | Campos: tipo (feature/fix/migration/docs), checklist de segurança, owner, issue relacionada |
| Staging via Neon Branch | Criar Neon branch `staging` isolada da prod (`neon branches create --name staging`); connection string injetada via GitHub Secret. **Sem infraestrutura adicional — usa feature nativa do Neon.** |
| Staging via Cloudflare Preview | Workers preview deployment via `wrangler deploy --env staging` (env já suportado no `wrangler.toml`). Pages usa deploy preview automático por PR. |
| Secrets em CI | Auditoria de secrets no GitHub Actions; remover qualquer valor hardcoded |
| ARCHITECTURE.md | Documento inicial descrevendo stack, fluxos críticos, dependências externas |

> **D2 — Resolvido (2026-04-28):** Staging formal adiado. Estratégia: Neon Branch `staging` (DB) + Cloudflare Workers preview (API) + Cloudflare Pages preview (Web). Sem custo adicional; suficiente para validação de migrations e testes de integração.

**Owner:** Tech Lead  
**Duração:** 2 semanas  
**Exit Criteria:**
- CI rodando em 100 % dos PRs novos com lint + typecheck + testes unitários.
- PR template ativo no repositório.
- Neon branch `staging` criada e connection string disponível em GitHub Secrets.
- `wrangler.toml` com env `staging` configurado.
- ARCHITECTURE.md com diagrama de alto nível publicado.

---

### Fase 2 — Database Migrations Pipeline (Semanas 2–3 | 2026-05-05 a 2026-05-16)

**Objetivo:** Formalizar o pipeline de migrations com dry-run, validação automática, scripts `down` e aprovação antes de prod.

| Item | Descrição |
|---|---|
| Aplicar 0032–0035 em staging | Validar schema, contagem de rows, constraints e índices |
| Script de dry-run | `pnpm db:migrate:dry` — executa sem commit; reporta diff de schema |
| Checklist de migration em CI | Gate: toda migration precisa ter script `down` e ter passado em staging |
| Backup pré-migration | Script automatizado de backup do Neon branch antes de apply em prod |
| Auditoria de migrations aplicadas | Tabela ou log com timestamp, versão, usuário, resultado |
| Aplicar 0032–0035 em prod | Pós-validação em staging; com aprovação manual |

**Owner:** Database/Infra  
**Duração:** 2 semanas  
**Exit Criteria:**
- Migrations 0032–0035 aplicadas em staging e prod sem downtime.
- Pipeline CI bloqueia PRs com migrations sem script `down`.
- Log de auditoria de migrations funcional.
- Backup pré-migration executado e verificado.

---

### Fase 3 — Testing Strategy Implementation (Semanas 3–5 | 2026-05-12 a 2026-05-30)

**Objetivo:** Ampliar cobertura de testes até as metas definidas em TESTS.md; configurar CI gate de cobertura.

| Item | Descrição |
|---|---|
| Inventário de testes existentes | Mapear os 20 testes atuais em `appointmentHelpers`; identificar gaps |
| Testes unitários — Workers APIs | Ampliar para `patients`, `sessions`, `exercises`, `auth`, `boards` |
| Testes de integração — DB + ORM | Testar fluxos com Neon branch staging (real DB, sem mocks) |
| Fixtures e seeds | `tests/fixtures/` com dados representativos por entidade crítica |
| Testes e2e — Playwright | 5 cenários: login, cadastro de paciente, agendamento, evolução SOAP, logout |
| CI gate de cobertura | `--coverage` no Vitest; falha se < 60 % workers / < 70 % APIs críticas |
| Testes de migration em staging | Validar contagem de rows, constraints, índices pós-apply |

**Owner:** QA/Testing  
**Duração:** 3 semanas  
**Exit Criteria:**
- Cobertura ≥ 60 % geral em workers; ≥ 70 % em `appointments`, `patients`, `sessions`.
- 5 testes e2e Playwright passando em CI.
- CI gate de cobertura ativo e bloqueando regressões.
- Fixtures documentadas em `tests/fixtures/README.md`.

---

### Fase 4 — Observability & Security Hardening (Semanas 5–7 | 2026-05-26 a 2026-06-13)

**Objetivo:** Elevar observabilidade a nível operacional e reforçar controles de segurança com SAST e scanner de dependências.

#### 4a — Observabilidade

| Item | Descrição |
|---|---|
| Auditoria de logs | Verificar 100 % das rotas com campos obrigatórios (timestamp, level, service, tenant_id, user_id, request_id, operation, status_code, duration_ms) |
| Dashboard operacional | Query SQL no Analytics Engine: latência p95, taxa de erro, RPS por rota |
| Alertas Cloudflare | 3 alertas: latência p95 > 500 ms, taxa 5xx > 1 %, disponibilidade < 99,9 % |
| SLO baselining | Medir p95 atual durante 2 semanas; estabelecer target p95 < 300 ms |
| Health checks | `/healthz` respondendo com status de Neon, Hyperdrive e KV |
| Retenção de logs | Definir política de retenção (Analytics Engine: 3 meses; D1 rate_limits: 30 dias) |

#### 4b — Segurança

| Item | Descrição |
|---|---|
| SAST no CI | GitHub CodeQL ou similar para TypeScript; ativo em 100 % dos PRs |
| Scanner de dependências | `pnpm audit` + Dependabot alerts ativos; blocking para HIGH/CRITICAL |
| git-secrets / trufflehog | Scanner de segredos no CI; bloquear PRs com segredos detectados |
| Auditoria de RLS | Verificar policies Neon para todas as tabelas com dados de pacientes |
| Runbook de incidentes | Documento com T0 (detecção), T1 (resposta inicial < 15 min), T2 (investigação < 2h), T3 (postmortem < 24h) |
| Playbook de rotação de segredos | Processo documentado para Neon, Cloudflare API token, Wrangler secrets |
| Auditoria de roles RBAC | Verificar que role fallback = `viewer`; nenhum endpoint retorna dados de outro tenant sem RLS |

**Owner:** SRE/Observabilidade (4a) + Segurança/DevOps (4b)  
**Duração:** 3 semanas  
**Exit Criteria:**
- Dashboard operacional funcional com dados reais de prod.
- 3 alertas Cloudflare ativos e testados.
- SAST + scanner de dependências ativos em CI.
- Runbook de incidentes publicado e revisado pelo time.
- Auditoria de RLS concluída; nenhuma tabela multi-tenant sem isolamento.

---

### Fase 5 — Design System Consolidation (Semanas 7–8 | 2026-06-09 a 2026-06-20)

**Objetivo:** Documentar tokens Tailwind v4 e catalogar componentes Shadcn; formalizar processo de revisão de novos componentes.

| Item | Descrição |
|---|---|
| Inventário de tokens | Listar todos os tokens definidos no `tailwind.config` e CSS vars; categorizar por tipo (cor, tipografia, espaçamento, border-radius) |
| Documentação de tokens | DESIGN_SYSTEM.md atualizado com tabela de tokens e valores light/dark mode |
| Catálogo de componentes | Listar ≥ 20 componentes Shadcn em uso; documentar props, estados (default/hover/focus/disabled/error), acessibilidade ARIA |
| Exemplos de uso | Snippets de código para Button, Input, Card, Dialog, Avatar, Badge, Alert |
| Processo de revisão | Checklist para novos componentes: token nativo vs. custom, acessibilidade, responsividade, dark mode |
| Governança de versão | Definir convenção de versionamento do DS (semver simplificado: MAJOR.MINOR) |

**Owner:** Design/Frontend  
**Duração:** 2 semanas  
**Exit Criteria:**
- DESIGN_SYSTEM.md com tabela completa de tokens e catálogo de ≥ 20 componentes.
- PR checklist incluindo item "DS review" para PRs com componentes visuais.
- Processo de revisão de DS documentado e comunicado ao time.

---

### Fase 6 — Governance, Review & Launch Readiness (Semanas 8–10 | 2026-06-16 a 2026-07-04)

**Objetivo:** Consolidar governança, revisar todos os artefatos, realizar exercício de incidente simulado, e declarar o projeto pronto para escala.

| Item | Descrição |
|---|---|
| Revisão de todos os artefatos | MIGRACOES.md, TESTS.md, OBSERVABILITY.md, SECURITY.md, DESIGN_SYSTEM.md, BACKLOG.md, ARCHITECTURE.md — todos revisados e atualizados |
| Simulação de incidente (tabletop) | Exercício com cenário real: falha de migration em prod; acionar runbook e medir T0–T3 |
| Retrospectiva do ciclo | Reunião de retrospectiva; atualizar backlog com lições aprendidas |
| Atualização do backlog | Repriorizar itens com base em KPIs medidos no ciclo |
| Comunicação para beta testers | Documento de status técnico para stakeholders externos |
| Critérios de lançamento (launch checklist) | Lista verificável de gate de qualidade para próxima release |

**Owner:** Product/PM + todos os owners  
**Duração:** 3 semanas (sobreposição com Fase 5)  
**Exit Criteria:**
- Todos os KPIs das fases 1–5 verificados e documentados.
- Simulação de incidente realizada; runbook ajustado com base nos aprendizados.
- Backlog atualizado e priorizado para o próximo ciclo.
- Launch checklist assinado por todos os owners.

---

## 6. Entregáveis por Fase

### Fase 1

| | |
|---|---|
| **Entradas** | BACKLOG.md (prioridade alta: CI/CD), SECURITY.md (gestão de segredos) |
| **Saídas** | `.github/workflows/ci.yml`, `.github/pull_request_template.md`, `ARCHITECTURE.md`, Neon staging branch configurada |
| **Critérios de Aceitação** | CI verde em PR de teste; PR template ativo; ARCHITECTURE.md revisado por 1 engenheiro |
| **Gates** | Lint + typecheck + testes unitários passando em CI |

### Fase 2

| | |
|---|---|
| **Entradas** | MIGRACOES.md (fluxo, rollback, auditoria) |
| **Saídas** | Script `db:migrate:dry`, checklist de migration no CI, log de auditoria, migrations 0032–0035 aplicadas |
| **Critérios de Aceitação** | 0 migrations sem script `down` em PRs novos; 0032–0035 aplicadas sem erro em staging e prod |
| **Gates** | CI bloqueia PR se migration sem `down`; aprovação manual para prod |

### Fase 3

| | |
|---|---|
| **Entradas** | TESTS.md (estratégia, ferramentas, cobertura), código atual de workers |
| **Saídas** | Testes unitários ampliados, testes de integração com Neon staging, 5 testes e2e Playwright, `tests/fixtures/`, CI gate de cobertura |
| **Critérios de Aceitação** | Cobertura ≥ 60 %/70 % (geral/crítico); 5 e2e passando; CI gate ativo |
| **Gates** | CI falha se cobertura abaixo do mínimo; e2e obrigatório para PRs de fluxos críticos |

### Fase 4

| | |
|---|---|
| **Entradas** | OBSERVABILITY.md (logs, métricas, SLOs), SECURITY.md (RBAC, SAST, runbook) |
| **Saídas** | Dashboard Analytics Engine, 3 alertas Cloudflare, CodeQL configurado, `pnpm audit` em CI, `RUNBOOK_INCIDENTS.md`, `PLAYBOOK_SECRETS_ROTATION.md`, auditoria RLS |
| **Critérios de Aceitação** | Dashboard funcional com dados reais; alertas disparando em teste; SAST ativo; runbook publicado; 0 tabelas de pacientes sem RLS |
| **Gates** | CI falha em vulnerabilidade HIGH+; CI falha em segredo detectado; SAST obrigatório em PRs |

### Fase 5

| | |
|---|---|
| **Entradas** | DESIGN_SYSTEM.md (tokens, componentes, governança) |
| **Saídas** | DESIGN_SYSTEM.md atualizado com tabela completa de tokens e catálogo de componentes, PR checklist atualizado |
| **Critérios de Aceitação** | ≥ 20 componentes catalogados; todos os tokens documentados; processo de revisão de DS formalizado |
| **Gates** | PRs com componentes visuais requerem aprovação de DS review |

### Fase 6

| | |
|---|---|
| **Entradas** | Todos os artefatos anteriores; KPIs medidos nas fases 1–5 |
| **Saídas** | Artefatos revisados e atualizados, `LAUNCH_CHECKLIST.md`, relatório de simulação de incidente, backlog repriorizado |
| **Critérios de Aceitação** | 100 % dos KPIs verificados; simulação de incidente concluída; launch checklist assinado |
| **Gates** | Aprovação de todos os owners; backlog atualizado e publicado |

---

## 7. Cronograma e Dependências

### 7.1 Visão de Alto Nível (Gantt Simplificado)

```
Semana       1   2   3   4   5   6   7   8   9   10
            Apr May May May Mai Jun Jun Jun Jun Jul
             28   5  12  19  26   2   9  16  23  30

Fase 1      ████████
Fase 2          ████████
Fase 3              ██████████████
Fase 4                      ██████████████
Fase 5                              ████████
Fase 6                          ████████████████
```

### 7.2 Dependências Críticas

```
Fase 1 (CI/CD)
    └── bloqueia → Fase 2 (migrations no CI)
    └── bloqueia → Fase 3 (testes em CI)

Fase 2 (Migrations)
    └── bloqueia → Fase 4a (observabilidade — precisa de staging com schema correto)
    └── bloqueia → Fase 3 (testes de integração — precisa de schema atualizado)

Fase 3 (Testes)
    └── bloqueia → Fase 6 (launch readiness — cobertura mínima obrigatória)

Fase 4b (Segurança)
    └── bloqueia → Fase 6 (launch readiness — SAST obrigatório)

Fase 5 (Design System)
    └── bloqueia → Fase 6 (launch readiness — DS review no PR checklist)
```

### 7.3 Marcos (Milestones)

| Milestone | Data | Critério |
|---|---|---|
| M1 — CI/CD baseline | 2026-05-09 | CI verde + PR template + ARCHITECTURE.md |
| M2 — Migrations seguras | 2026-05-16 | 0032–0035 aplicadas; pipeline com dry-run |
| M3 — Cobertura mínima | 2026-05-30 | ≥ 60 %/70 %; 5 e2e passando |
| M4 — Observabilidade operacional | 2026-06-06 | Dashboard + alertas + SLO baseline |
| M5 — Segurança hardened | 2026-06-13 | SAST + scanner + runbook + auditoria RLS |
| M6 — DS consolidado | 2026-06-20 | ≥ 20 componentes catalogados; tokens documentados |
| M7 — Launch Ready | 2026-07-04 | Launch checklist assinado; todos KPIs verificados |

---

## 8. Riscos e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação | Owner |
|---|---|---|---|---|---|
| R1 | Migration 0032–0035 causa drift de schema em staging vs prod, bloqueando testes de integração | Alta | Alto | Aplicar 0032–0035 em staging como Prioridade 1 da Fase 2; branch Neon de staging isolada | Database/Infra |
| R2 | CI/CD não existente → PRs sem gate causam regressões em produção | Alta | Alto | Fase 1 como desbloqueador de todo o ciclo; nenhum PR crítico mergeado sem CI passando | DevOps |
| R3 | Cobertura de testes atual insuficiente mascara bugs em features novas | Média | Alto | Meta progressiva (60 % → 70 % → 80 %); priorizar APIs mais críticas primeiro | QA/Testing |
| R4 | Segredos hardcoded não detectados antes do SAST | Média | Alto | Executar `trufflehog` na Fase 1 como auditoria imediata; SAST na Fase 4 | Segurança |
| R5 | Tailwind v4 ou lucide-react v1 com breaking changes não documentados | Baixa | Médio | DESIGN_SYSTEM.md como fonte de verdade; major-migrations-2026.md já cobre isso | Design/Frontend |
| R6 | Analytics Engine atingindo limite gratuito (100 K eventos/dia) com crescimento de tenants | Baixa | Médio | Monitorar volume de eventos; implementar sampling se necessário | SRE |
| R7 | Neon scale-to-zero (300 s) causando cold start em prod durante pico | Média | Médio | `pg_prewarm` no cron 06h BRT já configurado; monitorar latência p95 pós cold start | Database/Infra |
| R8 | Time enxuto sobrecarregado → fases atrasam | Média | Médio | Paralelizar Fase 5 e Fase 6 (sobreposição planejada); reduzir escopo de DS se necessário | PM |
| R9 | RLS incompleto expondo dados de pacientes entre tenants | Baixa | Crítico | Auditoria de RLS na Fase 4b como gate obrigatório; testes de isolamento em staging | Segurança |
| R10 | Dependência de biblioteca com CVE não detectada em produção | Média | Alto | Dependabot + `pnpm audit` ativados na Fase 4b; revisão retroativa de dependências críticas | Segurança |

---

## 9. Governança

### 9.1 Papéis e Responsabilidades

> **Nota (atualizado 2026-04-28):** O projeto opera com time enxuto. Por ora, o Tech Lead (Rafael) acumula todas as áreas técnicas. Os papéis abaixo representam **chapéus de responsabilidade** a serem usados nos gates e revisões — não necessariamente pessoas diferentes.

| Papel | Responsabilidades Principais | Artefatos Mantidos |
|---|---|---|
| **Database/Infra** (Tech Lead) | Migrations, Neon, Hyperdrive, D1, R2, Cloudflare Queues, backups | MIGRACOES.md, ARCHITECTURE.md (camada DB) |
| **DevOps/Plataforma** (Tech Lead) | CI/CD, GitHub Actions, Wrangler deploy, secrets management | `.github/workflows/`, SECURITY.md (gestão de segredos) |
| **QA/Testing** (Tech Lead) | Estratégia de testes, cobertura, fixtures, e2e, CI gates de qualidade | TESTS.md, `tests/` |
| **SRE/Observabilidade** (Tech Lead) | Logs, métricas, alertas, SLOs, dashboards, resposta a incidentes | OBSERVABILITY.md, `RUNBOOK_INCIDENTS.md` |
| **Segurança** (Tech Lead) | RBAC/RLS, SAST, scanner de dependências, auditorias, playbooks | SECURITY.md, `PLAYBOOK_SECRETS_ROTATION.md` |
| **Design/Frontend** (Tech Lead) | Design system, tokens, componentes, acessibilidade, dark mode | DESIGN_SYSTEM.md |
| **Product/PM** | Backlog, priorização, milestones, comunicação com stakeholders, retrospectivas | BACKLOG.md, `LAUNCH_CHECKLIST.md` |

### 9.2 Roles de RBAC da Aplicação (definidos 2026-04-28)

> Estes são os roles de **usuário final** da plataforma — distintos dos papéis de desenvolvimento acima. Serão usados para configurar RLS no Neon e gates de autorização nas Workers.

| Role | Perfil | Acesso Permitido | Bloqueado |
|---|---|---|---|
| **Admin** | Dono/gestor da clínica | Tudo — todas as rotas e dados | — |
| **Fisioterapeuta** | Profissional de saúde | Pacientes, sessões, agenda, prontuário, exercícios, protocolos, wiki | CRM, marketing, financeiro (comissões, NFS-e), dados de outros fisios |
| **Estagiário** | Profissional em formação | Idem fisioterapeuta — mesmas permissões por enquanto | Idem fisioterapeuta |
| **Paciente** | Usuário do Patient App | Apenas seus próprios dados, sessões e planos de exercício | Agendamento (não habilitado ainda), dados de outros pacientes |

> **D1b — Decisão pendente:** Estagiário tem as mesmas permissões de fisioterapeuta, ou há restrições adicionais (ex.: não pode assinar prescrições, não pode ver dados financeiros de atendimentos, requer supervisão registrada no prontuário)?

### 9.3 Ciclo de Revisões

| Reunião | Frequência | Participantes | Objetivo |
|---|---|---|---|
| **Sync de Fase** | Início de cada fase | Todos os owners | Alinhar entregáveis, dependências e riscos da fase |
| **Governance Weekly** | Semanal (segunda-feira) | PM + owners | Status de KPIs, bloqueios, ajuste de prioridades |
| **Backlog Review** | Quinzenal (bi-weekly) | PM + Tech Lead | Repriorizar backlog; adicionar/remover itens |
| **Security Review** | Mensal | Segurança + Tech Lead | Revisar CVEs, auditoria de acesso, rotação de segredos |
| **DS Review** | Por demanda (PRs) | Design/Frontend | Aprovar novos tokens/componentes antes do merge |
| **Postmortem** | Após cada incidente | SRE + owners afetados | Análise de causa raiz; atualização de runbook |
| **Retrospectiva de Ciclo** | Fim do ciclo (Fase 6) | Todos | Lições aprendidas; entrada para o próximo ciclo |

### 9.4 Processo de Aprovação de Entregáveis

Cada entregável passa por:

1. **Autor** — produz o artefato ou configuração.
2. **Peer review** — 1 engenheiro ou owner da área revisa.
3. **Owner sign-off** — owner da área aprova.
4. **PM gate** — PM confirma alinhamento com backlog e milestones.

Para entregáveis de segurança (runbook, playbook, auditoria RLS): requer aprovação adicional do owner de Segurança.

---

## 10. Anexos

### 10.1 Artefatos de Entrada

| Artefato | Caminho | Descrição |
|---|---|---|
| MIGRACOES.md | `./MIGRACOES.md` | Convenções, fluxo e responsáveis por migrations de banco |
| TESTS.md | `./TESTS.md` | Estratégia de testes, ferramentas, metas de cobertura |
| OBSERVABILITY.md | `./OBSERVABILITY.md` | Logs, métricas, SLOs e roadmap de observabilidade |
| SECURITY.md | `./SECURITY.md` | Gestão de segredos, RBAC, proteção de dados, runbook de incidentes |
| DESIGN_SYSTEM.md | `./DESIGN_SYSTEM.md` | Tokens, componentes, governança de versões do design system |
| BACKLOG.md | `./BACKLOG.md` | Prioridades de negócio e técnicas para o ciclo atual |
| CLAUDE_PLAN_REQUEST.md | `./CLAUDE_PLAN_REQUEST.md` | Solicitação formal deste plano técnico |

### 10.2 Artefatos de Contexto (MEMORY.md)

| Contexto | Referência |
|---|---|
| Stack atual completa | `memory/MEMORY.md` — Seção "Stack Atual (Março 2026)" |
| Migrations aplicadas (até 0031) | `memory/MEMORY.md` — Seção "Neon DB — Tabelas Adicionadas" |
| Auth Architecture | `memory/MEMORY.md` — Seção "Auth Architecture" |
| Workers rotas ativas | `memory/MEMORY.md` — Seção "Workers — Rotas Ativas" |
| Major migrations 2026 | `memory/major-migrations-2026.md` |

### 10.3 Artefatos a Criar neste Ciclo

| Artefato | Fase | Owner |
|---|---|---|
| `ARCHITECTURE.md` | Fase 1 | Database/Infra |
| `.github/workflows/ci.yml` | Fase 1 | DevOps |
| `.github/pull_request_template.md` | Fase 1 | DevOps |
| `RUNBOOK_INCIDENTS.md` | Fase 4 | SRE |
| `PLAYBOOK_SECRETS_ROTATION.md` | Fase 4 | Segurança |
| `tests/fixtures/README.md` | Fase 3 | QA |
| `LAUNCH_CHECKLIST.md` | Fase 6 | PM |

---

## 11. Critérios de Saída do Plano

O plano técnico é considerado **concluído e pronto para execução** quando:

- [ ] Todos os owners de cada área foram identificados e confirmaram o papel.
- [ ] Decisões pendentes (Seção 12) foram respondidas e incorporadas ao plano.
- [ ] O plano foi revisado por pelo menos 1 engenheiro senior e pelo PM.
- [ ] Os milestones M1–M7 têm datas confirmadas no calendário do time.
- [ ] O backlog foi atualizado para refletir as fases e entregáveis deste plano.
- [ ] Este documento está versionado no repositório (branch `main`) e acessível a todos os contribuidores.

---

## 12. Perguntas e Decisões Pendentes

As questões abaixo **bloqueiam ou impactam** a execução do plano e precisam de decisão antes do início da Fase 1.

| # | Pergunta | Status | Quem Decide |
|---|---|---|---|
| D1 | **Quais são os owners oficiais de cada área (dev)?** | ✅ **Resolvido:** Time enxuto — Tech Lead (Rafael) acumula todas as áreas técnicas. Roles de RBAC da aplicação definidos em Seção 9.2. | Tech Lead |
| D1b | **Estagiário tem restrições adicionais vs. Fisioterapeuta?** | ✅ **Resolvido:** Por enquanto, estagiário tem as mesmas permissões que fisioterapeuta. Revisar se necessário no futuro. | Tech Lead |
| D2 | **Existe ambiente de staging formalizado?** | ✅ **Resolvido:** Staging via Neon Branch `staging` (DB) + Cloudflare Workers/Pages preview. Sem infraestrutura adicional. Fase 1 inclui criação da branch. | Tech Lead |
| D3 | **Qual é a cadência de release para prod?** Releases contínuas (merge to main = deploy) ou releases agendadas (ex.: semanal)? | Define urgência e frequência dos gates de CI/CD | PM + Tech Lead |
| D4 | **As 6 fases e 10 semanas são aceitáveis?** Há restrição de prazo (ex.: release beta para clientes) que exigiria compressão para 4 fases / 6–8 semanas? | Reduz escopo de testes e DS se comprimido | PM |
| D5 | **Qual ferramenta de SAST é preferida?** GitHub CodeQL (gratuito para repos públicos/privados com GitHub Advanced Security) ou ferramenta externa (Snyk, SonarCloud)? | Fase 4b depende da escolha | Segurança + DevOps |
| D6 | **O Patient App (React Native/Expo) entra neste ciclo?** Há menção no backlog mas está fora do escopo atual deste plano. | Se incluído, Fase 3 (e2e) e Fase 5 (DS) precisam ser expandidos | PM |
| D7 | **Há orçamento para ferramentas adicionais?** Dependabot é gratuito; Snyk/SonarCloud têm custo. Analytics Engine gratuito até 100 K eventos/dia. | Fase 4 pode ser limitada por orçamento | PM + Finance |
| D8 | **O ARCHITECTURE.md deve incluir diagramas visuais (Mermaid, draw.io)?** Ou apenas descrição textual? | Define esforço da Fase 1 | Tech Lead + PM |
| D9 | **Qual é a política de Dependabot?** Auto-merge para patch updates? Review manual para minor/major? | Define automação vs. revisão manual em segurança | Segurança + DevOps |
| D10 | **Existe canal de incidentes definido?** OBSERVABILITY.md menciona "canal de incidentes definido" mas não especifica (Slack, PagerDuty, email). | Runbook de incidentes da Fase 4 não pode ser concluído sem isso | SRE + PM |

---

*Documento gerado em 2026-04-28. Próxima revisão: início da Fase 1 (2026-04-28 a 2026-05-09).*  
*Mantenha este documento atualizado à medida que decisões são tomadas e fases concluídas.*
