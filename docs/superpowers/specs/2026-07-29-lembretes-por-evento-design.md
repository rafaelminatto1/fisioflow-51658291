# Lembretes de sessão por evento (event-scheduled) — Design

**Data:** 2026-07-29
**Autor:** Rafael + Claude
**Status:** Aprovado (aguardando review do spec)

## Problema

Os lembretes de sessão são enviados por um **poll no cron `*/15`**
(`dispatchScheduledReminders` em `apps/api/src/cron.ts`), que a cada 15 min
consulta o banco em busca de agendamentos com lembrete "vencendo" (janela de
20 min). Esse poll **mantém o Neon (purple-union) aceso a noite toda**, impedindo
o scale-to-zero e gerando custo de compute mesmo fora do expediente
(Seg-Sex 7h-21h, Sáb 7h-13h, Dom fechado).

Não dá para simplesmente desligar o `*/15` de madrugada: o horário de cada
lembrete é **configurável** (ex.: banda "5h antes"), então um agendamento das 7h
com lembrete às 2h deixaria de ser enviado.

## Objetivo

Trocar o poll por **agendamento por evento**: cada agendamento programa o próprio
lembrete para disparar no horário exato, sem polling. O banco passa a acordar só
quando um lembrete realmente precisa sair (poucas vezes/noite) em vez de a cada
15 min. Com isso, o `*/15` sobra apenas com concierge/leads/campanhas, que podem
ser gateados ao horário de funcionamento → **banco dorme de madrugada**.

Métrica de sucesso: nenhum lembrete deixa de ser enviado (paridade com hoje) e o
compute noturno do purple-union cai substancialmente.

## Mecanismo (já existe, dormente)

`AppointmentReminderWorkflow` (`apps/api/src/workflows/appointmentReminder.ts`)
já está bindado (`WORKFLOW_APPOINTMENT_REMINDER`) e usa `step.sleepUntil` — mas
**nunca é disparado**. Vamos ligá-lo e adaptá-lo ao modelo de config atual.

## Arquitetura

### 1. Disparo (trigger)
- **Criar agendamento** (`POST /appointments`, `appointments.ts`): após o INSERT
  bem-sucedido, `env.WORKFLOW_APPOINTMENT_REMINDER.create({ id, params })` com
  `id = "reminder-<appointmentId>"` (determinístico → idempotente).
- **Reagendar** (`PUT /appointments/:id` quando muda `date`/`start_time`):
  `terminate()` o workflow antigo (por id) e cria um novo com o novo horário.
- **Cancelar/excluir** (`DELETE`, cancel, status → cancelado/faltou): `terminate()`
  o workflow.
- Helpers em um módulo novo `apps/api/src/lib/reminderWorkflow.ts`:
  `scheduleReminder(env, appt)`, `cancelReminder(env, appointmentId)`,
  `rescheduleReminder(env, appt)` — todos best-effort (try/catch + log; falha ao
  agendar lembrete não pode derrubar a criação do agendamento).

### 2. Params do workflow (sem tocar o banco no envio)
Capturados na criação, para que os passos de envio **não leiam o banco**:
`{ appointmentId, organizationId, patientPhone, patientName, therapistName,
apptDateStr, apptTimeStr, sendAtMs, templateName }`.
- `sendAtMs` = `computeReminderSendAt(apptDateStr, apptTimeStr, resolveReminderConfig(orgCfg)).getTime()`
  calculado na criação (a config da org é lida uma vez, na criação).

### 3. Workflow (adaptado)
- Um único `step.sleepUntil("wait-reminder", new Date(sendAtMs))` (o modelo de
  config produz **um** `sendAt`; removemos os estágios fixos D-3/D-1/D-0).
- Se `sendAtMs` já passou na criação (agendamento de última hora), pula o sleep e
  envia imediatamente (ou não envia, se já passou do horário da consulta).
- `step.do("recheck-status")`: **uma query indexada** por `appointmentId`
  confirmando que o agendamento ainda existe e está ativo (não cancelado/faltou/
  concluído/remarcado p/ outro horário). Se não estiver, encerra sem enviar.
  Rede de segurança caso um `terminate()` tenha falhado. Acorda o banco **só no
  momento do envio** (poucas vezes/noite), não a cada 15 min.
- `step.do("send-reminder", { retries })`: envia via Meta
  (`lembrete_consulta_botoes`, o template APROVADO na WABA) usando os `params`.
- Idempotência: o `id` determinístico garante uma instância por agendamento.
  Reagendamento faz terminate+create (novo horário). Não precisa de
  `appointment_reminder_log` no novo caminho.

### 4. Aposentar o poll
Depois de validado, remover `dispatchScheduledReminders` do `case "*/15"`.
O `*/15` fica com concierge IG + SLA leads + CRM scan + IG backfill; e o
`15 * * * *` com campanhas.

### 5. Gate por horário (a economia)
Novo helper `isWithinBusinessHours(now)` (TZ America/Sao_Paulo):
Seg-Sex 7-21h, Sáb 7-13h, Dom nunca. Gatear os casos `*/15` e `15 * * * *`
para pular o trabalho de banco fora do horário. `*/5` (health, DB-free) fica.
Warm-up leve às **6h30 BRT** Seg-Sáb (novo cron `30 9 * * 1-6` em UTC, BRT=UTC-3)
que faz `SELECT 1` para acordar o banco antes da abertura (7h) e evitar
cold-start no primeiro acesso.

## Migração segura (sem furar lembrete)

1. **Fase 1 (paralelo):** deploy do trigger no create/update/cancel + workflow
   adaptado. O poll `dispatchScheduledReminders` **continua rodando**. Para não
   duplicar, o poll continua usando `appointment_reminder_log` (dedup) e o
   workflow, ao enviar, também grava o mesmo log com `ON CONFLICT DO NOTHING`
   **apenas nesta fase de transição** — quem gravar primeiro envia. (Exceção ao
   "sem DB no envio": só durante a transição; removido na Fase 3.)
2. **Backfill único (DECIDIDO: endpoint admin manual):** `POST /appointments/reminders/backfill`
   (protegido por admin) que cria workflows para todos os agendamentos futuros
   existentes (mesmo `id` determinístico → idempotente, não duplica). Aciono
   **uma vez** durante o rollout — sem cron one-shot (evita risco de re-rodar a
   cada deploy).
3. **Fase 2 (validação):** confirmar via logs/observability que os envios estão
   saindo pelo workflow (blob `/workflow/appointment-reminder`).
4. **Fase 3 (corte):** remover `dispatchScheduledReminders` do cron e o dedup-log
   do workflow; gatear os crons por horário. Deploy final.

Rollback: reverter o commit da Fase 3 reativa o poll; os workflows já criados
continuam funcionando (dedup evita duplicar).

## Error handling
- `scheduleReminder`/`cancelReminder` são best-effort: try/catch + `console.warn`;
  nunca propagam erro para a rota de agendamento.
- `terminate()` de workflow inexistente é tolerado (try/catch).
- Envio Meta: `step.do` com `apiRetries()` (retry nativo do Workflow).
- Agendamento criado no passado / sendAt vencido: não envia (log e encerra).

## Testes
- **Unit:** `computeReminderSendAt` já testado; adicionar testes de
  `scheduleReminder`/`cancelReminder`/`rescheduleReminder` (mock do binding
  Workflow) e de `isWithinBusinessHours` (bordas 7h/21h/13h, domingo, TZ).
- **Workflow:** teste do passo de envio com Meta mockado (paridade de template e
  payload com o poll atual).
- **Regressão:** garantir que o poll (Fase 1) e o workflow não duplicam (dedup).

## Comportamentos preservados (paridade com o poll atual)
- Template `lembrete_consulta_botoes` (único aprovado na WABA) e mesmo payload.
- Timing dirigido pela config da org (`resolveReminderConfig`: bands por faixa de
  hora + `defaultHoursBefore`), via `computeReminderSendAt`.
- Só envia para paciente com `phone` preenchido; pula status
  cancelado/faltou/concluído/remarcado (agora no `recheck-status`).
- Sem envio duplicado (id determinístico + dedup-log só na transição).
- `reminders.enabled=false` na org → não agenda.

## Fora de escopo
- Não mexer em outros crons (birthdays, briefing, campanhas de reengajamento).
- Não alterar o modelo de config de lembrete (bands) — apenas consumi-lo.
- Não migrar Gestão-Saúde (red-hall).

## Impacto de custo esperado
Banco purple-union deixa de ser mantido aceso pelo poll de 15 min → dorme
~10h/noite + tarde de sábado + domingo. Economia estimada adicional ~$10-20/mês
(sobre o que já foi capturado desligando os projetos órfãos).
