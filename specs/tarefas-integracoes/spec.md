# Tarefas — Integrações com o FisioFlow + paridade Jira/Asana/Monday

Escopo definido a partir da auditoria da página `/tarefas` (Jul/2026) cruzada com pesquisa
de mercado (Jira, Asana, Monday.com, HubSpot, Pipedrive, Salesforce). O usuário aprovou
implementar as seções "Integrações com o resto do FisioFlow" e "Features de sistemas de
tarefas" na íntegra.

## Contexto (brownfield)

O que **já existe** e deve ser reaproveitado (não reconstruir):

- `tarefas` (tabela + rotas em `apps/api/src/routes/tarefas.ts`): CRUD, `POST /bulk`,
  `GET /by-entity/:type/:entityId`, `linked_entity_type/linked_entity_id`, motor de
  automações por board (`board_automations`) com cron diário de vencimento.
- Tipo `Tarefa` (`src/types/tarefas.ts`) já declara comments/mentions/watchers/
  time_tracking/custom_fields — mas são **type-only** (sem backend/UI).
- Tabela `notifications` (in-app) + infra WhatsApp Meta em prod (templates aprovados,
  `phone_number_id` em `organizations.settings`).
- FullCalendar na `/agenda` + quick view de appointment; ClinicAgent DO com
  `runMorningBriefing`; integração Google Calendar; `useLeaderboard`; IA via `runAi`
  (registry `workersAi.ts`).
- Stubs na UI: `onDuplicateTask`/`onArchiveTask` são `console.log`; `selectedTasks`
  existe sem barra de bulk actions; `board_columns.wip_limit` existe sem enforcement;
  `parent_id` existe sem UI de subtarefas.

## User Stories

### P1 — Quick wins (fiação já existe)

**US-01 — Notificação ao atribuir responsável (+ WhatsApp p/ URGENTE)**
Como membro da equipe, quando alguém me atribui uma tarefa, quero ser notificado
in-app; se a tarefa for URGENTE, quero também receber WhatsApp.
- AC1: POST/PATCH que define/troca `responsavel_id` cria linha em `notifications`
  para o novo responsável (não notifica quem atribuiu a si mesmo).
- AC2: Tarefa URGENTE atribuída → template WhatsApp aprovado enviado ao telefone do
  membro (se cadastrado), com dedup (não reenviar na mesma atribuição).
- AC3: Cron de vencimento notifica responsável de tarefa URGENTE vencendo hoje via
  WhatsApp (dedup por tarefa+dia).

**US-02 — Comentários com @menção**
Como membro, quero comentar em tarefas e mencionar colegas com @, notificando-os.
- AC1: `POST/GET/DELETE /api/tarefas/:id/comments`; comentário persiste autor,
  texto e menções.
- AC2: @menção cria `notifications` para cada mencionado.
- AC3: TaskDetailModal exibe thread de comentários com autocomplete de @ (membros da org).

**US-03 — Minhas Tarefas (Hoje / Em breve / Atrasadas)**
Como membro, quero uma visão "Minhas Tarefas" agrupada por urgência, padrão Asana.
- AC1: Filtro/visão que mostra só tarefas onde sou responsável ou assignee.
- AC2: Grupos: Atrasadas (vencimento < hoje, não concluídas), Hoje, Em breve (7 dias),
  Sem data.
- AC3: Acessível como view na página `/tarefas` (sem rota nova).

**US-04 — Agenda ↔ Tarefas**
Como fisio/admin, quero ver tarefas com vencimento no calendário e criar tarefa a
partir do quick view de um agendamento.
- AC1: Tarefas com `data_vencimento` aparecem na `/agenda` (FullCalendar) como eventos
  all-day/background distintos, toggle on/off.
- AC2: Quick view do appointment tem ação "Criar tarefa" que pré-vincula
  `linked_entity_type='appointment'`.
- AC3: Tarefa vinculada a appointment mostra link de volta para a agenda.

**US-05 — Bulk actions + duplicar/arquivar de verdade**
Como admin, quero selecionar várias tarefas e agir em lote; duplicar/arquivar devem
funcionar (hoje são `console.log`).
- AC1: Barra de bulk actions aparece quando `selectedTasks` > 0: mover status,
  atribuir responsável, prioridade, arquivar, excluir (usa `POST /bulk`).
- AC2: "Duplicar" cria cópia (titulo + " (cópia)", mesmos campos, sem acknowledgments).
- AC3: "Arquivar" muda status para ARQUIVADO via PATCH.

**US-06 — Tarefas recorrentes**
Como admin, quero tarefas que se recriam (diária/semanal/quinzenal/mensal) ao estilo
Asana/Monday.
- AC1: Campo de recorrência simples (freq + intervalo + dia) na criação/edição.
- AC2: Ao concluir tarefa recorrente (ou via cron diário), a próxima instância é criada
  com novo vencimento; dedup garante 1 instância aberta por série.
- AC3: Encerrar a série para de gerar instâncias.

**US-07 — Templates de tarefa**
Como admin, quero salvar tarefa como template (com checklist) e criar a partir dele.
- AC1: "Salvar como template" a partir de uma tarefa; templates por organização.
- AC2: "Nova tarefa a partir de template" preenche titulo/descrição/checklists/tipo/
  prioridade/tags.
- AC3: CRUD de templates (listar/excluir).

### P2 — Integrações transversais

**US-08 — Inbox CRM → tarefa com contexto**
Como atendente, quero criar tarefa de uma conversa do WhatsApp/Instagram e, na tarefa,
ver as últimas mensagens da conversa.
- AC1: Botão "Criar tarefa" na conversa do inbox, pré-vinculando
  `linked_entity_type='conversation'` (+ lead/patient se resolvido).
- AC2: TaskDetailModal de tarefa vinculada a conversa mostra últimas ~5 mensagens e
  link "Abrir conversa".

**US-09 — Timeline de atividades no paciente**
Como fisio, quero uma timeline unificada no perfil do paciente: tarefas + sessões +
agendamentos + mensagens WhatsApp (padrão Salesforce/Pipedrive).
- AC1: `GET /api/patients/:id/activity-timeline` agrega os 4 tipos ordenados por data.
- AC2: Aba/painel no perfil do paciente renderiza a timeline com ícone por tipo.

**US-10 — Pendências clínicas → tarefas automáticas**
Como admin clínico, quero que sessões realizadas sem evolução virem tarefa para o fisio.
- AC1: Cron diário detecta sessões concluídas há >24h sem `observacao` e cria tarefa
  vinculada (dedup por sessão).
- AC2: Tarefa criada com responsável = fisio da sessão, prioridade ALTA.

**US-11 — Financeiro → tarefa de cobrança**
Como admin, quero tarefa automática quando pagamento está em atraso.
- AC1: Cron detecta pagamentos vencidos há >N dias e cria tarefa de cobrança vinculada
  ao paciente (dedup por pagamento).

**US-12 — Morning Briefing com tarefas**
Como admin, quero que o briefing matinal do ClinicAgent inclua tarefas do dia,
atrasadas e aguardando ciente.
- AC1: `runMorningBriefing` consulta tarefas (vencem hoje / atrasadas / aguardando
  acknowledgment) e as inclui no texto do briefing.

### P3 — Avançado

**US-13 — IA nas tarefas**
- AC1: Ao criar tarefa, sugestão de prioridade via `runAi` (opt-in, botão "Sugerir").
- AC2: Resumo semanal do board por IA (endpoint + botão em Insights).

**US-14 — Google Calendar sync de tarefas** — tarefas com vencimento sincronizam para
o Google Calendar do responsável (reusa integração existente).

**US-15 — Gamificação** — concluir tarefa no prazo gera pontos no `useLeaderboard`.

**US-16 — Workload view** — visão de carga por membro (contagem/estimativa de tarefas
abertas por responsável), padrão Monday.

**US-17 — Dependências visíveis + WIP limit**
- AC1: Concluir tarefa com `blocked_by` aberta exige confirmação/erro.
- AC2: Coluna com `wip_limit` atingido: aviso visual e bloqueio de drop no kanban.

**US-18 — Views salvas + subtarefas na UI**
- AC1: Salvar combinação de filtros como view nomeada (por usuário).
- AC2: TaskDetailModal permite criar/listar subtarefas (`parent_id`).

**US-19 — Relatórios burndown/velocity/CFD** — SQL agregado + gráficos na view Insights.

**US-20 — Automações expandidas** — novos triggers no motor de board: "parada há X
dias", trigger por atribuição; nova action "enviar WhatsApp".

## Fora de escopo

- Task queues estilo HubSpot (seção 5 do relatório, não aprovada).
- Time tracking UI, custom fields UI (type-only continuam).
- Sprints/épicos formais estilo Jira.

## Constitution Check

- I (Spec-driven): este documento + plan.md + tasks.md. ✅
- III (LGPD): timeline do paciente respeita RBAC existente (fisios sem CRM não veem
  mensagens — timeline filtra por permissão); WhatsApp só para membros da equipe com
  telefone cadastrado e opt-in implícito de trabalho. ✅
- IV (Test-first): cada task de backend nasce com teste Vitest; lógica pura isolada
  (recorrência, agrupamento Minhas Tarefas). ✅
- V (Observability): logs `console.error` best-effort nos envios WhatsApp/notificações,
  nunca quebrando o request principal. ✅
