# TASKS_ROADMAP_2026 — Concluído ✅

Este arquivo rastreia o progresso final e a conclusão do `PLANO_IMPLEMENTACAO_2026.md`.

## SPRINT 0 — Fundação de Lançamento
- [x] **S0-A: Utilitário Global de Datas** (`src/lib/date-utils.ts` implementado).
- [x] **S0-B: Down Scripts das Migrations** (Scripts presentes em `apps/api/migrations/`).
- [x] **S0-C: Launch Checklist** (Revisado; pronto para produção).
- [x] **S0-D: E2E Smoke Tests** (Caminho feliz completo: Login -> Paciente -> Agenda -> SOAP).

## SPRINT 1 — Push Notifications & Sync Offline
- [x] **S1-A: Web Push Notifications** (Chaves VAPID geradas; Queue handler configurado).
- [x] **S1-B: Offline Sync Real** (IndexedDB + Service Worker Background Sync).

## SPRINT 2 — Agendamento Público (FisioLink)
- [x] **S2-A: Perfil Público** (Migration e slug setup ok).
- [x] **S2-B: Página de Agendamento** (`BookingPage.tsx` e lógica de slots funcional).
- [x] **S2-C: Check-in por QR Code** (`AppointmentQRCode.tsx` e JWT tokens ok).

## SPRINT 3 — Assinatura Digital & Relatório de Alta
- [x] **S3-A: Assinatura Digital** (`DocumentSigning.tsx` e endpoints públicos ok).
- [x] **S3-B: Relatório de Alta PDF** (Estrutura e gerador em `discharge-report.ts`).

## SPRINT 4 — Patient App HEP Gamificado
- [x] **S4-A: Conexão API Real** (Configurado para `api.moocafisio.com.br`).
- [x] **S4-B: HEP Gamificado** (Bônus de Streak (+100/500 XP) e Badges automáticos).

## SPRINT 5 — Digital Twin & Prognóstico IA
- [x] **S5-A: Painel de Prognóstico** (Aba "Prognóstico" no perfil do paciente com gráficos e insights).
- [x] **S5-B: Refatoração API** (AI e Scheduling modularizados).

## SPRINT 7 — Financeiro Consolidado
- [x] **S7-A/B: Dashboard Unificado** (Unificação de fluxo de caixa, DRE, recibos e NFS-e em lote).

---

## Log Final (2026-04-30)
- Geradas chaves VAPID para notificações.
- Criado `RUNBOOK_INCIDENTS.md` para suporte operacional.
- Implementada lógica de XP por streak no portal do paciente.
- Validada a consolidação financeira do `FinancialCommandCenterPage`.

**Status Final: 100% dos itens do roadmap 2026 implementados ou configurados.**
