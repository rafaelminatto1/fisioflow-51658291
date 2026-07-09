# Tasks — Tarefas: integrações + paridade

Status: ⏳ pendente · 🔨 em andamento · ✅ feito

## Onda 1 — P1 backend

- [x] T001 Migration 0140 (+down): `profiles.phone`, `tarefa_comments`,
      `tarefa_templates`, `tarefas.recurrence` + `recurrence_parent_id`,
      `tarefa_notification_log`, índices + RLS org.
- [x] T002 `lib/tarefaNotifications.ts` + testes: notificação in-app ao atribuir
      (POST e PATCH), WhatsApp gated p/ URGENTE (template `tarefa_urgente_equipe`
      em AUTOMATION_TEMPLATES).
- [x] T003 Rotas de comentários `GET/POST/DELETE /:id/comments` + notificação de
      @menção + testes.
- [x] T004 `POST /:id/duplicate` + testes.
- [x] T005 `lib/tarefaRecurrence.ts` (computeNextDueDate) + hook no PATCH
      (CONCLUIDO → cria próxima instância, dedup) + testes.
- [x] T006 Rotas `GET/POST/DELETE /templates` (tarefa_templates) + testes.
- [x] T007 `POST /bulk` estendido (prioridade, responsavel_id, column_id) + testes.
- [x] T008 Cron `0 12`: WhatsApp URGENTE vencendo hoje (dedup log) — não quebrar
      processDueDateAutomations.

## Onda 2 — P1 frontend

- [x] T009 `src/lib/tarefasGrouping.ts` (Atrasadas/Hoje/Em breve/Sem data) + testes.
- [x] T010 View "Minhas Tarefas" em TarefasV2.
- [x] T011 Comentários + @menção no TaskDetailModal (hook useTarefaComments).
- [x] T012 Bulk actions bar + duplicar/arquivar reais (substituir console.log).
- [x] T013 Recorrência na criação/edição de tarefa (UI).
- [x] T014 Templates de tarefa (salvar como / criar a partir de) na UI.

## Onda 3 — P2 integrações

- [x] T015 Agenda: tarefas com vencimento no FullCalendar (toggle) + "Criar tarefa"
      no quick view (`linked_entity_type='appointment'`) + link de volta.
- [x] T016 Inbox CRM: botão "Criar tarefa" na conversa + contexto (últimas msgs) na
      tarefa vinculada.
- [x] T017 `GET /api/patients/:id/activity-timeline` + painel no perfil do paciente.
- [x] T018 Cron: sessão sem evolução >24h → tarefa (dedup por sessão).
- [x] T019 Cron: pagamento em atraso → tarefa de cobrança (dedup por pagamento).
- [x] T020 Morning Briefing inclui tarefas (hoje/atrasadas/aguardando ciente).

## Onda 4 — P3 avançado

- [x] T021 IA: sugestão de prioridade no create + resumo semanal do board.
- [x] T022 Google Calendar sync de tarefas com vencimento.
- [x] T023 Gamificação: pontos p/ conclusão no prazo (leaderboard).
- [x] T024 Workload view por membro.
- [x] T025 Dependências: bloquear conclusão com blocked_by aberta; WIP limit no kanban.
- [x] T026 Views salvas por usuário + subtarefas na UI (parent_id).
- [x] T027 Relatórios burndown/velocity/CFD na view Insights.
- [x] T028 Automações: triggers "parada há X dias" e atribuição; action WhatsApp.
