# Agenda (`/agenda`) — Documentação técnica

> **🛑 LEIA ISTO ANTES de investigar bugs ou alterar QUALQUER coisa da Agenda.**
> Este documento descreve a Agenda de ponta a ponta (UI → React Query → API Worker
> → Postgres → infra Hyperdrive) para que humanos e LLMs entendam rápido e não
> percam tempo re-descobrindo as armadilhas já conhecidas.
>
> **Se o sintoma for "salvei e o card voltou ao lugar/status antigo" → vá direto
> para a §4.1 (cache do Hyperdrive). Não mude código antes disso.**

Última atualização: 22/jun/2026.

> **Configurações da Agenda (`/agenda/settings`)?** → vá para a **§8**.

---

## 1. Visão geral

A Agenda viva é um **FullCalendar** (`@fullcalendar/react`). Suporta:

- Visões **Dia / Semana / Mês**.
- **Drag-and-drop** para reagendar (muda data/hora).
- **Modal** de criação/edição.
- Mudança de **status inline** (popover de detalhes do card).
- Tarefas (all-day) e horários bloqueados, sobrepostos no mesmo calendário.

⚠️ **Código morto — NÃO mexer achando que é a agenda viva:** `CalendarAppointmentCard`,
`DayView`, `VirtualWeekGrid`. A renderização real é só o FullCalendar.

---

## 2. Mapa de arquivos

### Frontend (`src/`)
| Camada | Arquivo | Papel |
|---|---|---|
| Página (rota `/agenda`) | `src/pages/Schedule.tsx` | Orquestra layout, filtros, modais e monta o calendário (lazy). |
| Rota | `src/routes/core.tsx` | `const Schedule = lazy(() => import("@/pages/Schedule"))`. |
| Calendário | `src/components/schedule/ScheduleCalendar.tsx` | Wrapper do FullCalendar; converte appointments → eventos; handlers de drag/click. |
| Conteúdo do card | `src/components/schedule/ScheduleEventContent.tsx` | Render do conteúdo de cada evento. |
| **Dados + query** | `src/hooks/useSchedulePage.ts` | `useSchedulePageData(date, view, filters)`. Query key **`["schedule-appointments", date, view, status, types, therapists, patient]`**. Mapeia `AppointmentRow` (snake) → `Appointment` (camel). |
| Handlers de UI | `src/hooks/useScheduleHandlers.ts` | `handleAppointmentReschedule`, `handleUpdateStatus`, `handleEditAppointment`, `handleDeleteAppointment`, modais. |
| **Mutations** | `src/hooks/appointments/useAppointmentsMutations.ts` | `useCreate/Update/Delete/UpdateStatus` com **optimistic updates** + rollback. |
| Reschedule wrapper | `src/hooks/appointments/useAppointments.ts` | `useRescheduleAppointment` → delega para `useUpdateAppointment` (com `suppressSuccessToast`). |
| Mapeamento otimista | `src/hooks/appointmentOptimistic.ts` | `parseUpdatesToAppointment(updates)`: converte payload da API → `Partial<AppointmentBase>` p/ o cache. |
| Outras query keys | `src/hooks/appointments/useAppointmentsData.ts` (`appointmentKeys`), `src/hooks/useAppointmentsByPeriod.ts` (`appointmentPeriodKeys`). |
| **Invalidação de cache** | `src/utils/cacheInvalidation.ts` | `invalidateAppointmentsComprehensive()` cobre as 3 famílias de keys. |
| Status (UI) | `src/components/schedule/shared/appointment-status.ts` | `normalizeStatus()` + `APPOINTMENT_STATUS_CONFIG` (cores/labels). |
| Service (HTTP) | `src/services/appointmentService.ts` | `AppointmentService.updateAppointment/updateStatus/...` → chama `appointmentsApi`. |
| API client v2 | `src/api/v2/appointments.ts` | `appointmentsApi.list/get/update/...`. |
| Realtime (WebSocket) | `src/contexts/RealtimeContext.tsx` | Conecta `/api/realtime`; ao receber `APPOINTMENT_UPDATED` faz invalidação abrangente. |
| Realtime (poll 15s) | `src/hooks/useRealtimeAppointments.ts` | Poll de `/api/appointments/last-updated`; invalida quando `updated_at` muda. |

### Backend (`apps/api/` — Cloudflare Worker / Hono)
| Item | Arquivo | Notas |
|---|---|---|
| Rotas REST | `apps/api/src/routes/appointments.ts` | `GET /`, `GET /:id`, `GET /last-updated`, `POST /`, `PATCH /:id`, `PUT /:id`, `POST /:id/cancel`, `DELETE /:id`, `POST /:id/qr-token`. |
| Helpers puros | `apps/api/src/routes/appointmentHelpers.ts` | `normalizeStatus`, `normalizeAppointmentType`, `calculateEndTime`, `enforceCapacity`, `countsTowardCapacity`, `VALID_STATUSES`, `STATUS_MAP`. |
| Conexão DB | `apps/api/src/lib/db.ts` | `createDb(env, "read"\|"write")`. **Atenção:** `getUrl()` ignora o modo e usa sempre o Hyperdrive em produção (não há réplica separada). |
| Schema Drizzle | `packages/db/src/schema/appointments.ts` | Colunas reais: `date` (date), `start_time`/`end_time` (time), `status` (**varchar(80)**, não enum), `duration_minutes`, `payment_status`, `deleted_at`. |
| Realtime/broadcast | `apps/api/src/lib/realtime.ts` | `broadcastToOrg(env, orgId, { type: "APPOINTMENT_UPDATED", ... })` (Durable Object). |

### Infra
- **Neon Postgres** (projeto `purple-union-72678311` / endpoint `ep-wandering-bonus-acj4zwvo`, sa-east-1) acessado via **Hyperdrive** `fisioflow-neon` (id `12b9fefcfbc04074a63342a9212e1b4f`).

---

## 3. Fluxo de uma alteração (drag / modal / status)

Sequência para reagendar (drag-and-drop) — modal e status são análogos:

```
Usuário arrasta o card
  └─ ScheduleCalendar → useScheduleHandlers.handleAppointmentReschedule
       └─ useRescheduleAppointment → useUpdateAppointment.mutateAsync
            ├─ onMutate:  cancelQueries + OPTIMISTIC setQueryData nas 3 famílias de keys
            │             (card move IMEDIATAMENTE) + guarda snapshot p/ rollback
            ├─ mutationFn: AppointmentService.updateAppointment
            │              → PATCH/PUT /api/appointments/:id
            │              (envia date+appointment_date, start_time+appointment_time)
            │   └─ Worker: valida capacidade, UPDATE appointments ... RETURNING
            │              responde 200 com a linha nova
            ├─ onSuccess: mergeAppointmentIntoCaches(resposta do servidor)
            │             + invalidateAppointmentsComprehensive() → REFETCH do GET /api/appointments
            │             + toast "sucesso" (no reschedule, o toast é do handler)
            └─ onError:   restaura os snapshots (card volta) + trata conflito de capacidade
```

**Ponto crítico:** o passo de refetch (`onSuccess`) precisa receber dados **frescos**
do `GET /api/appointments`. Se vier stale, sobrescreve o optimistic update e o card
"volta". É exatamente o que o cache do Hyperdrive causa (§4.1).

> O **toast de sucesso é gerado no cliente** assim que o `PUT` retorna 200. Ele
> **NÃO** prova que a próxima leitura virá fresca. Para validar de verdade: recarregue
> a página (cache ignorado) e confira se o valor permaneceu.

### As 3 famílias de query keys (todas precisam ser atualizadas juntas)
1. `["schedule-appointments", date, view, ...filters]` — **a Agenda** (`useSchedulePage`).
2. `appointmentKeys.list(orgId)` = `["appointments_v2", ...]` — `useAppointmentsData`.
3. `appointmentPeriodKeys` = `["appointments", "period", ...]` — `useAppointmentsByPeriod`.

`mergeAppointmentIntoCaches` (em `useAppointmentsMutations.ts`) e
`invalidateAppointmentsComprehensive` (em `cacheInvalidation.ts`) cobrem as três. Se
você criar uma nova leitura de appointments com OUTRA key, lembre de incluí-la nos dois.

---

## 4. ⚠️ Armadilhas conhecidas (causas reais de bug)

### 4.1. Cache de query do Hyperdrive — CAUSA RAIZ do bug "card volta ao lugar antigo"
**Sintoma:** arrasta/edita/muda status → toast "sucesso" → em ~1s o card volta para a
posição/status anterior. Vale para drag-and-drop, modal e status. Some sozinho depois
de alguns minutos (quando o cache expira) e reaparece na próxima alteração.

**Causa:** o **Hyperdrive estava com cache de query LIGADO** (`max_age=300s`,
`stale_while_revalidate=60s`). O `PUT/PATCH` persiste de verdade (logs do worker
mostram `200` + `[DEBUG APPT UPDATE]`), mas o `GET /api/appointments?limit=500`
seguinte é servido **do cache do Hyperdrive** com a lista ANTIGA por até 5 min,
sobrescrevendo o optimistic update.

**Por que não é código e por que `Cache-Control: no-store` não resolve:**
existem 3 camadas de cache distintas — (a) HTTP do navegador, (b) **cache de query do
Hyperdrive** (camada do banco), (c) React Query no cliente. O worker já manda
`Cache-Control: no-store` (camada a) e o React Query é invalidado corretamente
(camada c). O vilão é a **camada b**, que vive **só na config do Hyperdrive na
Cloudflare** — não está no `wrangler.toml`, não há IaC e nenhum deploy a altera.

**Correção (config de infra, não código):** manter o cache **desativado**.
```bash
# Verificar
wrangler hyperdrive get 12b9fefcfbc04074a63342a9212e1b4f
#   Esperado: caching: { disabled: true }

# Desativar (se reaparecer ligado)
wrangler hyperdrive update 12b9fefcfbc04074a63342a9212e1b4f --caching-disabled
```
Dados clínicos não podem ficar stale → cache de query do Hyperdrive **sempre disabled**.

**Histórico/recorrência:** foi ligado manualmente (dashboard) seguindo o doc de custos
`docs/operations/neon-cost-analysis-2026-05-04.md` (Prioridade 3) em ~14/jun/2026,
causou este bug, e foi re-desativado em 16/jun/2026. Aquele doc já tem AVISO no topo
proibindo religar. Se o sintoma voltar, **o primeiro suspeito é este cache.**

### 4.2. Flicker no drag-and-drop (já tratado — não regredir)
Duas causas históricas:
- **query-key mismatch:** quem escreve o optimistic update usa uma key e quem lê usa
  outra → o card pisca/volta até o refetch. Mantenha as 3 famílias em sincronia (§3).
- **`resetQueries`/`refetchQueries` em massa** na invalidação: `resetQueries` zera a
  query ativa (status → `pending`), o que faz `Schedule.tsx` trocar o FullCalendar
  pelo skeleton → a agenda inteira "pisca" a cada mutação. **NUNCA** usar `resetQueries`
  aqui; use `invalidateQueries({ type: "all" })` (refetch em background mantendo os
  dados na tela). Ver comentário em `cacheInvalidation.ts`.

### 4.3. Status é varchar e é normalizado em DOIS lugares
- Backend: `appointmentHelpers.ts:normalizeStatus` + conjunto `VALID_STATUSES`/`STATUS_MAP`.
- Frontend: `appointment-status.ts:normalizeStatus` + `APPOINTMENT_STATUS_CONFIG`.

Valores canônicos atuais: `agendado`, `presenca_confirmada`, `atendido`, `avaliacao`,
`faltou`, `faltou_com_aviso`, `faltou_sem_aviso`, `nao_atendido`,
`nao_atendido_sem_cobranca`, `remarcar`, `cancelado`.

Ao adicionar um status novo, atualize **os dois lados + `VALID_STATUSES`**, senão o
valor cai no fallback `"agendado"` (o servidor salva "agendado" e a UI "reverte").

### 4.4. camelCase vs snake_case no payload
O `AppointmentService.updateAppointment` envia **os dois** (`date`+`appointment_date`,
`start_time`+`appointment_time`); o worker aceita ambos (`body.x ?? body.y`). Ao mexer
no contrato, mantenha essa tolerância ou alinhe as duas pontas de uma vez.

### 4.5. `createDb("read")` não é uma réplica
Em `apps/api/src/lib/db.ts`, `getUrl()` ignora o parâmetro `mode` e usa sempre o
Hyperdrive (produção). Não existe réplica de leitura separada → não procure "lag de
réplica" como causa de stale; o stale vem do cache do Hyperdrive (§4.1).

---

## 5. Playbook de depuração (siga nesta ordem)

1. **Reproduza** e cronometre: o valor volta em ~1s? Some e volta a cada alteração?
   → fortíssimo indício de §4.1 (cache do Hyperdrive).
2. **Cheque a infra ANTES do código:**
   `wrangler hyperdrive get 12b9fefcfbc04074a63342a9212e1b4f` → `caching.disabled`
   deve ser `true`. Se não, desative e re-teste.
3. **Confirme a persistência no backend** (descarta bug de servidor):
   Cloudflare Observability → service `fisioflow-api` → filtrar `PUT /api/appointments`
   e a mensagem `[DEBUG APPT UPDATE]`. Procure o `200` e a linha de Audit.
4. **Confirme o front:** no DevTools, veja se o `GET /api/appointments` do refetch
   traz o valor novo. Se o GET traz **velho** com infra OK → investigar backend/SQL.
   Se traz **novo** mas a UI mostra velho → bug de cache do React Query / merge de keys.
5. Só então mexa em código (mutations, keys, mapeamento).

---

## 6. Como validar uma alteração na Agenda (manual)

1. Abrir `https://moocafisio.com.br/agenda`.
2. Mudar status (ex.: "Agendado" → "Não atendido") **ou** arrastar um card.
3. Aguardar > 2s (passar a janela do refetch) e **dar reload com cache ignorado**.
4. O valor deve **permanecer**. Se voltar ao anterior → §4.1 antes de qualquer código.
5. Reverter o dado de teste, se aplicável.

Validado dessa forma em 16/jun/2026 (status "Agendado"↔"Não atendido" persistiu após
reload) logo após desativar o cache do Hyperdrive.

---

## 7. Referências cruzadas
- `docs/operations/neon-cost-analysis-2026-05-04.md` — AVISO: não religar o cache.
- `docs/operations/RUNBOOK_INCIDENTS.md` — Cenário 3b (agenda reverte alterações).
- `docs/PERF_PLAN_2026.md` — T11 (não usar cache do Hyperdrive como alavanca de perf).
- Memória do projeto: `project_infra_config.md` e `project_agenda_fullcalendar_jun2026.md`.

---

## 8. Configurações da Agenda (`/agenda/settings`)

Página separada da agenda viva. Redesenhada em jun/2026 (PRs #211/#212): **8 abas → 5**
+ faixa de visão geral, com salvamento unificado. Spec/plano em
`docs/superpowers/specs/2026-06-22-agenda-settings-redesign-design.md` e
`docs/superpowers/plans/2026-06-22-agenda-settings-redesign.md`.

### 8.1. Estrutura e arquivos
| Item | Arquivo | Papel |
|---|---|---|
| Página (rota `/agenda/settings`) | `src/pages/ScheduleSettings.tsx` | Shell: faixa de visão geral + nav de 5 abas + SaveBar + guarda de navegação. |
| Navegação + redirects | `src/components/schedule/settings/SettingsNav.tsx`, `tabRedirects.ts` | 5 abas; `resolveTab()` redireciona URLs legadas (`?tab=horarios/status/visual/...`). |
| Faixa de visão geral | `src/components/schedule/settings/OverviewStrip.tsx` | Cards de contagem (dias abertos, regras, tipos, bloqueios). |
| Contrato de save | `types.ts` (`TabSaveHandle`), `useTabDirtyState.ts`, `useRegisterTabHandle.ts`, `SettingsSaveBar.tsx` | Cada aba expõe `{isDirty,isSaving,lastSavedAt,save,discard}`; SaveBar sticky única por aba. |
| Abas | `settings/tabs/{Funcionamento,Atendimentos,Disponibilidade,Politicas,Aparencia}Tab.tsx` | Funcionamento=horários+capacidade; Atendimentos=tipos+status; Disponibilidade=bloqueios; Políticas=cancelamento+no-show+notificações+janela; Aparência=densidade (client-side). |
| Hooks de dados | `useScheduleSettings`, `useScheduleCapacity`, `useStatusConfig`, `useAppointmentTypes`, `useAgendaAppearancePersistence` | Reaproveitados; não reescrever assinatura. |
| Backend | `apps/api/src/routes/scheduling-settings.ts` (montado em `/api/scheduling`) | Upserts `business-hours`, `cancellation-rules`, `notification-settings`, `capacity-config`, `statuses`, `booking-window`, `slot-config`, `no-show-policy`. |

### 8.2. Padrão de salvamento (não regredir)
- Uma SaveBar por aba, controlada por `useRegisterTabHandle` + `useTabDirtyState`.
- O handle deve ser registrado com deps **só de primitivos** (`isDirty/isSaving/lastSavedAt`);
  `save`/`discard` vão por `ref`. Registrar `save` (instável) direto num `useEffect`
  causa **loop infinito de render** ("Maximum update depth exceeded") — testes unitários
  com `registerHandle` mockado NÃO pegam isso; só valida rodando o app logado.
- `discard` = `reset()` sem argumento → **restaura o baseline** (não mantém o draft).

### 8.3. Aparência: configuração por-visão (Semana/Dia/Mês)
`useAgendaAppearance` guarda estado **por-visão** (`global` + overrides `day/week/month`);
só **month** tem preset default (`extra_small`). `effectiveForView` resolve a aparência de
cada visão na ordem `DEFAULT_GLOBAL → global → preset-da-visão → override-do-usuário`.

A `AparenciaTab` tem um **seletor de visão** (Semana/Dia/Mês, default **Semana** — a mais
usada). Cada visão é editada de forma **independente** via setters por-visão
(`setCardSize`/`setHeightScale` ligados à visão ativa por `useAgendaAppearancePersistence(view)`).
O `ScheduleCalendar` consome `useAgendaAppearancePersistence(viewType)`, então **cada visão da
agenda reflete só a sua própria config** — validado em produção (override `day:{cardSize}`
muda o Dia sem afetar Semana/Mês). Botão **"Aplicar a todas"** copia a config atual para as 3
visões (`applyToAllViews`, escreve `global` + limpa overrides); link **"Herdar global"**
(`resetView`) remove o override da visão. Sync ao vivo entre a aba e o calendário via
`StorageEvent` que o `save` do hook-base dispara e o hook escuta.

> ⚠️ **Não-óbvio:** `ViewControls`/`ViewTabButton` recebem `key={activeView}` e cada um chama
> `useAgendaAppearancePersistence(view)` com uma view **fixa** — não condicionar a chamada do
> hook, senão a contagem de hooks muda ao trocar de visão.

### 8.4. "Não salva" → constraint UNIQUE obrigatória
Upsert com `INSERT ... ON CONFLICT (organization_id)` **exige** uma constraint UNIQUE na
coluna do conflito; sem ela o Postgres lança erro e a rota devolve **500 silencioso**
(toda gravação falha). Foi a causa raiz do bug "não salva" em `cancellation_rules` e
`scheduling_notification_settings` (migration 0121 nunca aplicada → corrigido pela **0125**).
Ao criar novo upsert de settings, garanta a constraint UNIQUE correspondente.

### 8.5. Capacidade é "todos os tipos" (backend)
`getIntervalCapacity` (`appointmentHelpers.ts`) faz `MIN(max_patients)` sobre todas as
regras que se sobrepõem, **ignorando `appointment_type_id`**. Por isso a UI de capacidade
não oferece filtro por tipo — não reintroduzir sem antes enforçar por tipo no backend.
