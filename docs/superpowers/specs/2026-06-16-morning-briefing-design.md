# Morning Briefing — Design

**Data:** 2026-06-16
**Status:** Aprovado para planejamento
**Relacionado:** plano antigravity Fase 2.3

## Objetivo
`GET /api/briefing` retorna o resumo do dia da organização (agenda de hoje, faltas de ontem,
pacientes inativos) para alimentar o dashboard Morning Briefing. Org/RLS-safe, PT-BR.

## Não-objetivos (YAGNI)
- Cron/dispatch (email/WhatsApp às 6h) — follow-on (reusa `case "0 9 * * *"` + Resend).
- Insight via IA — follow-on opcional.
- UI — fatia seguinte.

## Arquitetura
- **Agregador puro** `apps/api/src/lib/briefing/buildBriefing.ts`: `buildBriefing(raw)` →
  `{ date, appointmentsToday[], countsByStatus, noShowsYesterday, inactivePatients, summary }`.
  Sem I/O — unit-testável.
- **Query layer** `apps/api/src/lib/briefing/queries.ts`: `gatherBriefingData(sql, orgId)` usa
  `getRawSql` (org-scoped):
  - hoje: `appointments WHERE date = CURRENT_DATE AND organization_id=$1` (id, start_time, status, patient_id)
  - faltas ontem: `count(*) WHERE date = CURRENT_DATE - 1 AND status LIKE 'faltou%'`
  - inativos: `count(*)` de `patients` ativos sem sessão há ≥30 dias
- **Rota** `apps/api/src/routes/briefing.ts`: `GET /` (requireAuth + rateLimit) →
  `getBriefing(env, user)` → `buildBriefing(gatherBriefingData(...))`.

## Contratos (verificados)
- `appointments`: `date`, `start_time`, `status` (faltas = `faltou%`, concluído = `atendido`), `organization_id`.
- `patients`: `status` (`ativo`), `organization_id`, `id`.
- `sessions`: `patient_id`, `date`, `organization_id`.

## Testes
- `buildBriefing`: dados crus → estrutura + summary (contagens, status agrupados).
- `gatherBriefingData`: `getRawSql` mockado (3 queries) → raw montado.
- rota: `getBriefing` exportado, com sql mockado.

## Critérios de sucesso
- `GET /api/briefing` (JWT) retorna agenda de hoje + faltas ontem + inativos, org-scoped.
- Unit tests verdes; tsc/oxlint limpos.

## Follow-ons
Cron 6h + dispatch (email/WhatsApp); insight IA (runAi); dashboard UI; KPIs financeiros.
