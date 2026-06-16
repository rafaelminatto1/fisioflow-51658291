# Agenda (`/agenda`) — Documentação técnica

> **LEIA ISTO ANTES de investigar bugs ou mexer em qualquer coisa da Agenda.**
> Este documento existe para que humanos e LLMs entendam rápido como a Agenda
> funciona de ponta a ponta (frontend → API → banco → infra) e não percam tempo
> re-descobrindo as armadilhas já conhecidas.

---

## 1. Visão geral

A Agenda viva é um **FullCalendar** (não os componentes `CalendarAppointmentCard` /
`DayView` / `VirtualWeekGrid`, que são código morto). Suporta visões Dia / Semana /
Mês, drag-and-drop para reagendar, edição por modal e mudança de status inline.

## 2. Mapa de arquivos

### Frontend
| Camada | Arquivo |
|---|---|
| Página (rota `/agenda`) | `src/pages/Schedule.tsx` |
| Calendário (FullCalendar) | `src/components/schedule/ScheduleCalendar.tsx` |
| Conteúdo do card | `src/components/schedule/ScheduleEventContent.tsx` |
| Dados da página + query | `src/hooks/useSchedulePage.ts` → query key **`["schedule-appointments", date, view, ...filters]`** |
| Handlers (drag, modal, status, delete) | `src/hooks/useScheduleHandlers.ts` |
| Mutations + optimistic updates | `src/hooks/appointments/useAppointmentsMutations.ts` |
| Reschedule wrapper | `src/hooks/appointments/useAppointments.ts` (`useRescheduleAppointment` → `useUpdateAppointment`) |
| Mapeamento de campos otimistas | `src/hooks/appointmentOptimistic.ts` (`parseUpdatesToAppointment`) |
| Invalidação de cache | `src/utils/cacheInvalidation.ts` (`invalidateAppointmentsComprehensive`) |
| Normalização de status (UI) | `src/components/schedule/shared/appointment-status.ts` |
| Service (chama a API) | `src/services/appointmentService.ts` |
| Realtime (WebSocket) | `src/contexts/RealtimeContext.tsx` (escuta `APPOINTMENT_UPDATED`) |
| Realtime (poll 15s) | `src/hooks/useRealtimeAppointments.ts` (`/last-updated`) |

### Backend (Cloudflare Worker — Hono)
| Item | Arquivo |
|---|---|
| Rotas REST | `apps/api/src/routes/appointments.ts` (`GET /`, `GET /:id`, `POST /`, `PATCH/PUT /:id`, `POST /:id/cancel`, `DELETE /:id`) |
| Helpers puros | `apps/api/src/routes/appointmentHelpers.ts` (`normalizeStatus`, `calculateEndTime`, `enforceCapacity`, etc.) |
| Conexão DB | `apps/api/src/lib/db.ts` (`createDb`) |
| Schema Drizzle | `packages/db/src/schema/appointments.ts` (colunas reais: `date`, `start_time`, `end_time`, `status` varchar) |

### Infra
- **Neon Postgres** via **Hyperdrive** (id `12b9fefcfbc04074a63342a9212e1b4f`, config `fisioflow-neon`).

## 3. Fluxo de uma alteração (drag / modal / status)

1. UI dispara `useScheduleHandlers` → mutation em `useAppointmentsMutations.ts`.
2. `onMutate` faz **optimistic update** no cache `["schedule-appointments"]` (e em
   `appointments_v2` / `["appointments","period"]`). O card se move/atualiza na hora.
3. `mutationFn` → `AppointmentService.updateAppointment` → `PATCH/PUT /api/appointments/:id`.
   - O service envia **camelCase E snake_case** (`date`+`appointment_date`,
     `start_time`+`appointment_time`); o worker aceita ambos.
4. Worker persiste via Drizzle (`appointments.date` / `startTime` / `status`) e
   retorna a linha atualizada (`.returning()`).
5. `onSuccess` faz `mergeAppointmentIntoCaches` (injeta a resposta do servidor) e
   depois `invalidateAppointmentsComprehensive` → **refetch** do `GET /api/appointments`.
6. O refetch precisa devolver dado **fresco**; senão o card "volta" para o valor antigo.

> O toast de sucesso é gerado no cliente assim que o `PUT` retorna 200 — **toast de
> sucesso não prova que a leitura seguinte virá fresca.** Sempre valide com reload.

## 4. ⚠️ Armadilhas conhecidas (causas reais de bug)

### 4.1. Cache de query do Hyperdrive (CAUSA RAIZ do bug "card volta ao lugar antigo")
**Sintoma:** você arrasta/edita/muda status, o toast diz "sucesso", mas em ~1s o card
volta para a posição/status anterior (vale para drag-and-drop, modal e status).

**Causa:** o **Hyperdrive estava com cache de query LIGADO** (`max_age=300s`). O `PUT`
persiste de verdade (logs mostram `200`), mas o `GET /api/appointments` seguinte é
servido **do cache do Hyperdrive** com a lista ANTIGA por até 5 min, sobrescrevendo o
optimistic update.

**O `Cache-Control: no-store` do worker NÃO resolve** — ele afeta o cache HTTP do
navegador, não o cache de query do Hyperdrive (camada do banco).

**Correção (config, não código):** manter o cache do Hyperdrive **desativado**:
```bash
# Verificar
wrangler hyperdrive get 12b9fefcfbc04074a63342a9212e1b4f
# Esperado: caching: { disabled: true }

# Desativar (se reaparecer ligado)
wrangler hyperdrive update 12b9fefcfbc04074a63342a9212e1b4f --caching-disabled
```
Dados clínicos não podem ficar stale → o cache de query deve ficar **sempre disabled**.
Histórico: foi re-ativado em 14/jun/2026 e re-desativado em 16/jun/2026.

### 4.2. Flicker no drag-and-drop
Já tratado. Duas causas históricas: (a) **query-key mismatch** entre quem escreve e
quem lê o optimistic update; (b) uso de `resetQueries`/`refetchQueries` em massa em
`cacheInvalidation.ts`, que zerava a query ativa (status → pending) e fazia o
`Schedule.tsx` trocar o FullCalendar pelo skeleton. **NUNCA** usar `resetQueries` na
invalidação da agenda — use `invalidateQueries({ type: "all" })` (refetch em background
mantendo os dados na tela).

### 4.3. Três query keys diferentes
Appointments vivem em chaves distintas: `["schedule-appointments", ...]` (a agenda),
`["appointments_v2"]` e `["appointments","period",...]`. Qualquer optimistic update /
invalidação precisa cobrir as três (ver `mergeAppointmentIntoCaches` e
`invalidateAppointmentsComprehensive`), senão a UI fica inconsistente.

### 4.4. Status é varchar, normalizado em dois lugares
O backend normaliza em `appointmentHelpers.ts:normalizeStatus`; o frontend em
`appointment-status.ts:normalizeStatus`. Ao adicionar um status novo, atualize os
**dois** + o conjunto `VALID_STATUSES` do worker, ou o valor pode cair no fallback
`"agendado"`.

## 5. Como validar uma alteração na Agenda

1. Abrir `https://moocafisio.com.br/agenda`.
2. Mudar status (ex.: "Agendado" → "Não atendido") **ou** arrastar um card.
3. Aguardar > 2s (passar a janela do refetch) e **dar reload com cache ignorado**.
4. O valor deve **permanecer**. Se voltar ao anterior → suspeitar do item 4.1
   (cache do Hyperdrive) antes de qualquer mudança de código.

Para evidência de backend: logs do worker `fisioflow-api` (Cloudflare Observability),
filtrar `PUT /api/appointments` e a mensagem `[DEBUG APPT UPDATE]`.
