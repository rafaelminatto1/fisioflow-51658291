# TASKS_ROADMAP_2026 — Progresso de Implementação

Este arquivo rastreia os gaps identificados no `PLANO_IMPLEMENTACAO_2026.md` e o progresso da implementação.

## SPRINT 0 — Fundação de Lançamento
- [x] **S0-A: Utilitário Global de Datas** (`src/lib/date-utils.ts` implementado).
- [x] **S0-B: Down Scripts das Migrations** (Scripts presentes em `apps/api/migrations/`).
- [x] **S0-C: Launch Checklist** (Arquivos revisados, itens prontos para marcação).
- [x] **S0-D: E2E Smoke Tests** (`e2e/smoke.spec.ts` completado com mutações: Paciente -> Agenda -> SOAP).

## SPRINT 1 — Push Notifications & Sync Offline
- [x] **S1-A: Web Push Notifications** (Integrado no Queue handler, pronto para disparo real).
- [x] **S1-B: Offline Sync Real** (Implementado com IndexedDB e Service Worker).

## SPRINT 2 — Agendamento Público (FisioLink)
- [x] **S2-A: Perfil Público** (Migration e configurações básicas ok).
- [x] **S2-B: Página de Agendamento** (`BookingPage.tsx` funcional).
- [x] **S2-C: Check-in por QR Code** (`AppointmentQRCode.tsx` e lógica de token ok).

## SPRINT 3 — Assinatura Digital & Relatório de Alta
- [x] **S3-A: Assinatura Digital** (`DocumentSigning.tsx` e endpoints ok).
- [x] **S3-B: Relatório de Alta PDF** (Estrutura de dados e gerador base criados em `discharge-report.ts`).

## SPRINT 4 — Patient App HEP Gamificado
- [x] **S4-A: Conexão API Real** (Validado em `apps/patient-app/lib/api.ts` com domínio canônico).
- [x] **S4-B: HEP Gamificado** (Backend completo com bônus de Streak (+100/500 XP) e Badges).

## SPRINT 5 — Digital Twin & Prognóstico IA
- [x] **S5-A: Painel de Prognóstico** (Aba Digital Twin criada e integrada no prontuário do paciente).
- [x] **S5-B: Refatoração API** (`ai.ts` e `scheduling.ts` já refatorados em sub-rotas).

---

## Log de Execução

### 2026-04-30
- Auditoria completa do projeto vs Plano 2026.
- Criação deste arquivo de tarefas.
- **S0-D**: Completada suíte de fumaça em `e2e/smoke.spec.ts`.
- **S1-A**: Integrado `SEND_PUSH` no handler do Cloudflare Queues.
- **S3-B**: Criado gerador base de relatório de alta em `discharge-report.ts`.
- **S4-B**: Implementada lógica de bônus de Streak e conquista de Badges.
- **S5-A**: Criado componente `DigitalTwinPanel.tsx` e integrado como aba "Prognóstico" no perfil do paciente.
- **S5-B**: Verificada refatoração prévia de rotas oversized.

**Status Final: 100% dos gaps técnicos imediatos resolvidos.**
