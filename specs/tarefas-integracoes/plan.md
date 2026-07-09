# Plan — Tarefas: integrações + paridade Jira/Asana/Monday

## Technical context

- Rotas: `apps/api/src/routes/tarefas.ts` (Hono). CRUD + `/bulk` + `/by-entity` +
  `executeAutomations` (board_automations). POST/PATCH não notificam atribuição.
- Notificações in-app: tabela `notifications` (INSERT direto, ver action
  `send_notification` em tarefas.ts:120).
- WhatsApp: fila `env.BACKGROUND_QUEUE` (`SEND_WHATSAPP`) p/ pacientes; para equipe
  usar `sendAutomationTemplate` (`lib/whatsappAutomations.ts`) — gate
  `settings.crm_whatsapp.automations_enabled`, template registrado via
  `AUTOMATION_TEMPLATES` (novo key `tarefa_urgente_equipe`). **Nunca** hardcodar
  template não aprovado fora do gate (ver gap de templates Jul/2026).
- `profiles` NÃO tem telefone → migration adiciona `profiles.phone`.
- Cron: `apps/api/src/cron.ts` — vencimento de tarefas já roda em `"0 12 * * *"`
  (BRT 09h) via `processDueDateAutomations`; novos jobs entram no mesmo case.
- Migration seguinte: **0140** (+ `.down.sql`, contém DROPs).
- Front: `src/pages/TarefasV2.tsx` (views kanban/table/timeline/insights),
  `src/components/tarefas/v2/*`, hooks `src/hooks/useTarefas.ts`.
- Agenda: FullCalendar em `/agenda`; quick view de appointment existente.
- IA: `runAi` + registry `workersAi.ts` (padrão do IA no inbox CRM).

## Decisões

1. **WhatsApp p/ equipe é opt-in duplo**: exige `automations_enabled` + template
   `tarefa_urgente_equipe` aprovado na Meta + telefone no perfil do membro. Sem
   qualquer um deles → só notificação in-app (nunca falha o request).
2. **Comentários em tabela própria** (`tarefa_comments`), não no JSONB do tipo
   `Tarefa` — concorrência e paginação. Menções = `mentions TEXT[]` (user_ids).
3. **Recorrência minimalista**: `tarefas.recurrence JSONB`
   `{freq: 'daily'|'weekly'|'biweekly'|'monthly', interval?: number}` +
   `recurrence_parent_id`. Próxima instância criada **ao concluir** a atual
   (PATCH → CONCLUIDO). Lógica pura em `lib/tarefaRecurrence.ts` com testes.
4. **Templates de tarefa em tabela** (`tarefa_templates`) com checklists JSONB.
5. **Duplicar** = endpoint servidor `POST /api/tarefas/:id/duplicate` (cópia fiel
   sem acknowledgments/comments). **Arquivar** = PATCH status ARQUIVADO (já suportado).
6. **Timeline do paciente** = endpoint agregador (UNION de tarefas, sessions,
   appointments, wa_messages) com corte RBAC: mensagens só p/ roles com acesso a CRM.
7. **Minhas Tarefas** = view client-side nova em TarefasV2 (dados já vêm do GET /);
   agrupamento puro testável em `src/lib/tarefasGrouping.ts`.
8. **Agenda** = eventos derivados de tarefas com `data_vencimento` (allDay),
   toggle persistido em localStorage; criação via quick view com
   `linked_entity_type='appointment'`.
9. **Dedup de jobs automáticos** pelo padrão existente: `SELECT 1 FROM tarefas
   WHERE linked_entity_type/... ` antes do INSERT (como o cron de reativação);
   WhatsApp de vencimento dedup em `tarefa_notification_log` (unique tarefa+kind+dia).

## Constitution Check

- I: spec/plan/tasks neste diretório. ✅
- II: mudanças isoladas em API (Worker) + web; sem impacto mobile. ✅
- III: timeline filtra mensagens por RBAC; phone de membro é dado interno da org. ✅
- IV: TDD nas lógicas puras (recorrência, agrupamento, notificação) e rotas
  (Vitest em `apps/api/src/__tests__`/co-located). Entrega em ondas P1→P2→P3. ✅
- V: envios best-effort com `console.error`, nunca bloqueiam a rota; log de
  automação reutilizado (`whatsapp_automation_log`). ✅

## Riscos

- Template `tarefa_urgente_equipe` depende de aprovação Meta (assíncrona) — feature
  degrada p/ in-app até lá (aceitável).
- Cron `"0 12 * * *"` já faz trabalho; novos jobs devem ser try/catch isolados para
  não derrubar `processDueDateAutomations`.
- `cron.test.ts`: tick `*/5` deve permanecer DB-free (gotcha conhecido que bloqueia
  deploys).
