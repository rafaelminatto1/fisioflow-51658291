# Appointments Hooks

Este diretório contém todos os hooks relacionados a agendamentos e agenda no FisioFlow.

## Estrutura

```
src/hooks/appointments/
├── index.ts          # Barrel export de todos os hooks
├── README.md         # Esta documentação
└── (hooks originais permanecem em src/hooks/)
```

## Hooks Disponíveis

### Core Hooks

| Hook                      | Descrição                      | Arquivo Original                       |
| ------------------------- | ------------------------------ | -------------------------------------- |
| `useAppointments`         | Hook principal de agendamentos | `src/hooks/useAppointments.tsx`        |
| `useAppointmentsByPeriod` | Agendamentos por período       | `src/hooks/useAppointmentsByPeriod.ts` |
| `useAppointmentActions`   | Ações CRUD de agendamentos     | `src/hooks/useAppointmentActions.ts`   |
| `useAppointmentData`      | Dados de agendamento           | `src/hooks/useAppointmentData.ts`      |
| `useFilteredAppointments` | Agendamentos com filtros       | `src/hooks/useFilteredAppointments.ts` |

### Schedule Hooks

| Hook                         | Descrição                   | Arquivo Original                          |
| ---------------------------- | --------------------------- | ----------------------------------------- |
| `useScheduleHandlers`        | Handlers da página Agenda   | `src/hooks/useScheduleHandlers.ts`        |
| `useScheduleState`           | Estado da agenda (URL sync) | `src/hooks/useScheduleState.ts`           |
| `usePrefetchAdjacentPeriods` | Prefetch de períodos        | `src/hooks/usePrefetchAdjacentPeriods.ts` |
| `useAvailableTimeSlots`      | Horários disponíveis        | `src/hooks/useAvailableTimeSlots.ts`      |

### Calendar Hooks

| Hook                        | Descrição                    | Arquivo Original                                  |
| --------------------------- | ---------------------------- | ------------------------------------------------- |
| `useAppointmentGroups`      | Agrupamento de agendamentos  | `src/hooks/calendar/useAppointmentGroups.ts`      |
| `useAppointmentPositioning` | Posicionamento no calendário | `src/hooks/calendar/useAppointmentPositioning.ts` |
| `useDayAppointments`        | Agendamentos do dia          | `src/hooks/calendar/useAppointmentGroups.ts`      |
| `useAppointmentOverlap`     | Detecção de sobreposição     | `src/hooks/calendar/useAppointmentGroups.ts`      |

### Recurring Appointments

| Hook                       | Descrição              | Arquivo Original                        |
| -------------------------- | ---------------------- | --------------------------------------- |
| `useRecurringSeries`       | Séries recorrentes     | `src/hooks/useRecurringAppointments.ts` |
| `useCreateRecurringSeries` | Criar série recorrente | `src/hooks/useRecurringAppointments.ts` |
| `useCancelRecurringSeries` | Cancelar série         | `src/hooks/useRecurringAppointments.ts` |

### Realtime & Optimistic

| Hook                       | Descrição                  | Arquivo Original                       |
| -------------------------- | -------------------------- | -------------------------------------- |
| `useRealtimeAppointments`  | Atualizações em tempo real | `src/hooks/useRealtimeAppointments.ts` |
| `useAppointmentOptimistic` | Updates otimistas          | `src/hooks/appointmentOptimistic.ts`   |

### Waitlist

| Hook               | Descrição         | Arquivo Original           |
| ------------------ | ----------------- | -------------------------- |
| `useWaitlist`      | Lista de espera   | `src/hooks/useWaitlist.ts` |
| `useAddToWaitlist` | Adicionar à lista | `src/hooks/useWaitlist.ts` |
| `useOfferSlot`     | Oferecer horário  | `src/hooks/useWaitlist.ts` |

## Como Usar

### Importação Recomendada

```typescript
// Para code-splitting otimizado, importe do submódulo:
import { useAppointments, useScheduleHandlers } from "@/hooks/appointments";

// Para conveniência, pode importar do barrel principal:
import { useAppointments } from "@/hooks";
```

### Exemplo de Uso

```typescript
import { useFilteredAppointments, useScheduleHandlers } from "@/hooks/appointments";

function MyScheduleComponent() {
  const { currentDate, viewType } = useScheduleState();

  const { data: appointments, isLoading } = useFilteredAppointments(
    { viewType, date: currentDate, organizationId },
    { status: "confirmed" },
  );

  const { actions, modals } = useScheduleHandlers(currentDate, refetch);

  // ...
}
```

## Manutenção

### Adicionando Novo Hook

1. Crie o hook em `src/hooks/useNovoHook.ts`
2. Adicione o export em `src/hooks/appointments/index.ts`
3. Atualize esta documentação

### Consolidando Hooks

Se encontrar hooks duplicados:

1. Verifique quais componentes usam cada versão
2. Crie uma versão unificada mantendo a API compatível
3. Atualize os imports nos componentes
4. Marque o hook antigo como deprecated
5. Remova após migração completa

## Veja Também

- [Componentes de Schedule](../../components/schedule/README.md)
- [Tipos de Appointment](../../types/appointment.ts)
- [API de Appointments](../../api/v2/appointments.ts)
