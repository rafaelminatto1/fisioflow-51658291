# CRM·WhatsApp — Upgrades (inovações de mercado)

Baseado em pesquisa (changelog Meta + players de saúde/fisio 2025-2026) cruzada com o FisioFlow.

## Status

| # | Feature | Status |
|---|---|---|
| 0 | **Motor de lembretes configurável** (regra 5h + exceções por horário) + **endereço só na 1ª sessão** + **painel** | ✅ Entregue |
| 1 | Speed-to-lead: SLA + escalonamento se humano não assume | ✅ Entregue (cron */5 + config) |
| 2 | Mensagens interativas (reply buttons / list / **Flows** de agendamento) | 🟡 Botões: templates submetidos + handler de clique pronto; aguarda aprovação Meta. Flows = futuro |
| 3 | Lembrete acionável Confirmar/Remarcar + reoferta de slot | 🟡 Lembrete com botões pronto (config `useButtons`); Confirmar/Remarcar tratados; aguarda template aprovado. Reoferta de slot = futuro |
| 4 | Janela de evasão "sessão 3" + tratamento como série | ⏳ |
| 5 | Loop de adesão ao HEP com "feito" em 1 toque | 🟡 Handler de botão pronto (`maybeHandleExerciseAdherence`) + template submetido; aguarda aprovação Meta |
| 6 | Captura de origem CTWA (`referral`) + Welcome Sequence | ⏳ |
| 7 | Pagamento no chat (Pix) — diferencial Brasil | ⏳ |
| 8 | Score de no-show/dormência + "próxima melhor ação" por IA | 🟡 Parcial: temperatura heurística no card (quente/morno/frio); score IA = futuro |

## P1 — Lembretes (ENTREGUE)

### Regra
- Padrão: enviar `defaultHoursBefore` (5h) antes da sessão.
- Exceções (faixa de horário da sessão → quando enviar):
  - 07h–08h → 19h da véspera
  - 09h–10h → 07h do mesmo dia
  - 11h–12h → 08h do mesmo dia
  - demais → regra das 5h.
- Endereço da clínica só na **primeira sessão/avaliação** do paciente.
- Tudo editável num **painel** (`/crm-whatsapp/configuracoes` → aba Lembretes).

### Implementação
- Lógica pura + testes: `apps/api/src/lib/reminderScheduling.ts` (+ `__tests__`). `computeReminderSendAt`, `resolveReminderConfig`.
- Config persistida em `organizations.settings.crm_whatsapp.reminders`.
- Scheduler no cron `*/15 * * * *`: `dispatchScheduledReminders` (apps/api/src/cron.ts).
- Dedup atômico: tabela `appointment_reminder_log` (migration `0126`).
- Endereço 1ª visita: detecta ausência de agendamento anterior; envia texto best-effort.
- API: `GET/PATCH /api/whatsapp/inbox/crm-settings` expõem `reminders`.
- Front: aba "Lembretes" com preview client-side de horários.

### Acceptance
- Sessão 07/08h → lembrete 19h véspera; 09/10h → 07h; 11/12h → 08h; 14h → 09h (5h antes). ✅ (testes)
- Nunca envia 2x o mesmo lembrete (dedup). ✅
- Endereço só aparece no 1º atendimento. ✅
- Admin edita faixas/horas/endereço no painel sem deploy. ✅

## Backlog (P2/P3) — resumo acionável
- **#1** Reaproveitar `notifyOrganization`; marcar `first_human_reply_at`; alertar se não houver resposta humana em N min após inbound de lead.
- **#2** Usar `whatsapp-interactive.ts` (`sendReplyButtons`/`sendFlowMessage`); Flow "Book an Appointment" → grava em `appointments`.
- **#3** Estender `dispatchScheduledReminders` com camada 2h (endereço/como chegar) + escalonamento T-4h se não confirmado; reofertar slot cancelado.
- **#4** Detectar pacote (`treatment_cycles`) em risco na sessão 3; reativação em 24h via `reengagementWorkflow`.
- **#5** Reply button "✅ Fiz hoje" no `lembrete_exercicios` → alimenta `HEPComplianceDashboard`.
- **#6** Capturar `msg.referral` (CTWA) no `whatsapp-webhook.ts` → `wa_conversations.metadata.source/campaign`.
- **#7** WhatsApp Payments BR (Pix) pós-confirmação; integra com NFS-e existente.
- **#8** Job que pontua no-show/dormência por conversa (via `runAi`) → card do CRM.
