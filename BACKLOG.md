# Backlog — FisioFlow

> Última revisão: 2026-04-28  
> Ciclo atual: Estabilização da Fundação (Fases 1–6)  
> Revisão quinzenal (bi-weekly)

---

## Itens concluídos neste ciclo (Fases 1–5)

| Item | Fase | Entregável |
|---|---|---|
| CI/CD com gates obrigatórios | 1 | `.github/workflows/ci.yml` + `security-audit.yml` |
| Validador de migrations no CI | 1 | `scripts/check-migrations.sh` |
| PR template com checklists | 1 | `.github/PULL_REQUEST_TEMPLATE.md` |
| Status de todas as migrations | 2 | `apps/api/migrations/MIGRATIONS_STATUS.md` |
| Scripts down para 0054–0057 | 2 | `.down.sql` para as 4 migrations recentes |
| Unit tests de API (RBAC) | 3 | `patients.test.ts`, `sessions.test.ts` |
| Smoke tests e2e | 3 | `e2e/smoke.spec.ts` (5 cenários @smoke) |
| Health readiness endpoint | 4 | `GET /api/health/ready` |
| CodeQL SAST no CI | 4 | `.github/workflows/codeql.yml` |
| Runbook de incidentes | 4 | `RUNBOOK_INCIDENTS.md` |
| Playbook de rotação de segredos | 4 | `PLAYBOOK_SECRETS_ROTATION.md` |
| Dashboard de observabilidade | 4 | `docs/OBSERVABILITY_DASHBOARD.md` |
| Design System com 25 componentes | 5 | `DESIGN_SYSTEM.md` (tokens + catálogo) |
| Artefatos revisados e atualizados | 6 | `MIGRACOES.md`, `TESTS.md`, `OBSERVABILITY.md`, `SECURITY.md` |
| Launch checklist | 6 | `LAUNCH_CHECKLIST.md` |

---

## Próximo ciclo — Prioridade Alta

> Ações manuais pendentes deste ciclo

- [ ] **Configurar 3 alertas no Cloudflare** (erro rate, latência, health check) — ver `docs/OBSERVABILITY_DASHBOARD.md`
- [ ] **Configurar GitHub Secrets de staging** (`STAGING_TEST_USER_EMAIL`, `STAGING_TEST_USER_PASSWORD`, `STAGING_BASE_URL`)
- [ ] **Baselining de SLOs** — executar Queries #1 e #4 do dashboard por 14 dias e ajustar thresholds

---

## Próximo ciclo — Prioridade Média (features clínicas)

| Item | Impacto | Dependência |
|---|---|---|
| E2E — Fluxo de cadastro de paciente | Alto | Secrets de staging configurados |
| E2E — Fluxo de agendamento | Alto | Idem |
| E2E — Fluxo de evolução SOAP | Alto | Idem |
| Agendamento pelo Paciente | Médio | RBAC de paciente estendido |
| Patient App (React Native/Expo) | Médio | Decisão D6 pendente |
| Offline sync (offlineSync.ts) | Baixo | `apiPost/apiPatch/apiDelete` são placeholders |

---

## Próximo ciclo — Prioridade Baixa

- [ ] ARCHITECTURE.md — diagrama de componentes e fluxos críticos
- [ ] Storybook para catálogo interativo de componentes DS
- [ ] Rotação de segredos programada (D, Q1 2026 → Q2 2026)
- [ ] Housekeeping: remover arquivos `update_batch_*.sql` extras de `apps/api/migrations/`

---

## Decisões abertas (do TECHNICAL_PLAN.md)

| # | Decisão | Impacto se não resolvida |
|---|---|---|
| D3 | Cadência de release (semanal / quinzenal) | Planejamento de sprints |
| D5 | Budget mensal máximo (Neon + Cloudflare) | Alertas de custo |
| D6 | Patient App entra neste ciclo? | Escopo de DS e e2e |
| D7 | Canal de comunicação de incidentes (Slack / WhatsApp) | `RUNBOOK_INCIDENTS.md` seção "Contatos" |
| D8 | Contrato de SLA com clientes beta | SLOs de latência e disponibilidade |
| D9 | Política de retenção de logs clínicos | LGPD / compliance |
| D10 | Estratégia de disaster recovery multi-região | Neon branching + R2 cross-region |

---

## Rastreamento

Cada item de próximo ciclo deve ter ao abrir PR/issue:
- Épico / feature
- Critérios de aceitação
- Owner
- Data prevista
- Dependências identificadas
