# Schedule Components

Este diretório contém todos os componentes relacionados à agenda do FisioFlow.

## Estrutura de Diretórios

```
src/components/schedule/
├── index.ts                    # Barrel export principal
├── README.md                   # Esta documentação
│
├── settings/                   # Configurações da agenda
│   ├── BlockedTimesManager.tsx
│   ├── BusinessHoursManager.tsx
│   ├── CalendarViewPresets.tsx
│   ├── CancellationRulesManager.tsx
│   ├── CardSizeManager.tsx
│   ├── NotificationSettingsManager.tsx
│   ├── StatusColorManager.tsx
│   └── StatusColorSettingsModal.tsx
│
├── shared/                     # Utilitários compartilhados
│   ├── appointment-status.ts
│   ├── capacity.ts
│   ├── index.ts
│   └── utils.ts
│
├── skeletons/                  # Componentes de loading
│   ├── AppointmentCardSkeleton.tsx
│   ├── AppointmentListSkeleton.tsx
│   ├── CalendarSkeleton.tsx
│   ├── CalendarSkeletonEnhanced.tsx
│   └── index.ts
│
├── virtualization/             # Componentes de virtualização
│   ├── VirtualWeekGrid.tsx
│   └── index.ts
│
├── virtualized/                # Lista virtualizada
│   ├── VirtualizedAppointmentList.tsx
│   ├── VirtualizedCalendarGrid.tsx
│   └── index.ts
│
└── __tests__/                  # Testes
    └── ...
```

## Componentes Principais

### Visualização de Calendário

| Componente               | Descrição                                                 |
| ------------------------ | --------------------------------------------------------- |
| `CalendarView`           | Componente principal que renderiza a visualização correta |
| `CalendarDayView`        | Visualização diária                                       |
| `CalendarWeekViewDndKit` | Visualização semanal com drag-and-drop                    |
| `CalendarMonthView`      | Visualização mensal                                       |
| `ScheduleGrid`           | Grid de horários                                          |

### Cards de Agendamento

| Componente                 | Descrição                            |
| -------------------------- | ------------------------------------ |
| `AppointmentCard`          | Card de agendamento padrão           |
| `SwipeableAppointmentCard` | Card com swipe actions (mobile)      |
| `CalendarAppointmentCard`  | Card para visualização de calendário |
| `DraggableAppointment`     | Card arrastável para reagendamento   |

### Modais

| Componente                   | Descrição                              |
| ---------------------------- | -------------------------------------- |
| `AppointmentModal`           | Modal de criação/edição de agendamento |
| `AppointmentModalRefactored` | Versão refatorada do modal             |
| `AppointmentQuickEditModal`  | Edição rápida inline                   |
| `AppointmentQuickView`       | Visualização rápida                    |
| `RecurringAppointmentModal`  | Modal de agendamento recorrente        |
| `RescheduleConfirmDialog`    | Confirmação de reagendamento           |
| `PaymentRegistrationModal`   | Registro de pagamento                  |

### Lista de Espera

| Componente               | Descrição                    |
| ------------------------ | ---------------------------- |
| `WaitlistHorizontal`     | Lista de espera horizontal   |
| `WaitlistIndicator`      | Indicador de lista de espera |
| `WaitlistNotification`   | Notificação de vaga          |
| `WaitlistQuickAdd`       | Adição rápida à lista        |
| `WaitlistQuickViewModal` | Visualização rápida          |
| `WaitlistSidebar`        | Sidebar de lista de espera   |

### UI Components

| Componente          | Descrição                      |
| ------------------- | ------------------------------ |
| `MiniCalendar`      | Calendário mini para navegação |
| `WeekNavigation`    | Navegação por semana           |
| `ScheduleHeader`    | Cabeçalho da agenda            |
| `ScheduleToolbar`   | Toolbar com filtros            |
| `QuickFilters`      | Filtros rápidos                |
| `AdvancedFilters`   | Filtros avançados              |
| `AppointmentSearch` | Busca de agendamentos          |
| `BulkActionsBar`    | Barra de ações em massa        |

### Performance

| Componente                   | Descrição                           |
| ---------------------------- | ----------------------------------- |
| `VirtualizedAppointmentList` | Lista virtualizada para performance |
| `VirtualizedDayView`         | Visualização diária virtualizada    |
| `VirtualizedWeekView`        | Visualização semanal virtualizada   |
| `LazyAppointmentModal`       | Modal com lazy loading              |
| `OptimizedImageLoader`       | Carregamento otimizado de imagens   |
| `BackgroundSync`             | Sincronização em background         |

### Skeletons

| Componente                 | Descrição              |
| -------------------------- | ---------------------- |
| `CalendarSkeleton`         | Skeleton do calendário |
| `CalendarSkeletonEnhanced` | Skeleton aprimorado    |
| `AppointmentCardSkeleton`  | Skeleton do card       |
| `AppointmentListSkeleton`  | Skeleton da lista      |

## Como Usar

### Importação

```typescript
// Recomendado: importar do barrel export
import { CalendarView, AppointmentModal, AppointmentCard } from "@/components/schedule";

// Ou importar diretamente (não recomendado)
import { CalendarView } from "@/components/schedule/CalendarView";
```

### Exemplo de Uso

```typescript
import { CalendarView, AppointmentModal, useScheduleState } from '@/components/schedule';
import { useFilteredAppointments } from '@/hooks/appointments';

function SchedulePage() {
  const { currentDate, viewType, setViewType } = useScheduleState();
  const { data: appointments } = useFilteredAppointments({
    viewType,
    date: currentDate
  });

  return (
    <CalendarView
      appointments={appointments}
      currentDate={currentDate}
      viewType={viewType}
      onViewTypeChange={setViewType}
    />
  );
}
```

## Padrões de Código

### Nomenclatura

- **Componentes**: PascalCase (ex: `AppointmentCard`)
- **Arquivos**: PascalCase para componentes (ex: `AppointmentCard.tsx`)
- **Utilitários**: camelCase (ex: `appointment-status.ts`)

### Estrutura do Componente

```typescript
/**
 * Descrição breve do componente
 *
 * @description Descrição detalhada se necessário
 * @example
 * <ComponentName prop="value" />
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ComponentNameProps {
  /** Descrição da prop */
  prop: string;
}

export function ComponentName({ prop }: ComponentNameProps) {
  // Implementação
}
```

## Manutenção

### Adicionando Novo Componente

1. Crie o arquivo em `src/components/schedule/NomeComponente.tsx`
2. Adicione o export em `src/components/schedule/index.ts`
3. Se for um componente grande, considere criar uma subpasta
4. Atualize esta documentação

### Componentes Deprecados

- `AppointmentModal.tsx` - Usar `AppointmentModalRefactored.tsx`
- `AppointmentModalTest.tsx` - Apenas para testes

## Veja Também

- [Hooks de Appointments](../../hooks/appointments/README.md)
- [Tipos de Appointment](../../types/appointment.ts)
- [Página Schedule](../../pages/Schedule.tsx)
