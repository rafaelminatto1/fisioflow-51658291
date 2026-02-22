# FisioFlow Agenda - Documentação de Integração

## Visão Geral

Este documento descreve como integrar e utilizar todos os componentes implementados nas 7 fases do projeto de melhorias da agenda do FisioFlow.

---

## Índice

1. [Quick Wins (Fase 1)](#fase-1-quick-wins)
2. [Performance Core (Fase 2)](#fase-2-performance-core)
3. [UX/UI Enhancements (Fase 4)](#fase-4-uxui-enhancements)
4. [Advanced Features (Fase 5)](#fase-5-advanced-features)
5. [Ecosystem Integrations (Fase 6)](#fase-6-ecosystem-integrations)
6. [Innovation Lab (Fase 7)](#fase-7-innovation-lab)
7. [Backend Integration](#backend-integration)

---

## Fase 1: Quick Wins

### QuickFilters

```tsx
import { QuickFilters, type QuickFilterType } from '@/components/schedule';

function SchedulePage() {
  const [activeFilter, setActiveFilter] = useState<QuickFilterType>('all');

  return (
    <QuickFilters
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      showCount={true}
    />
  );
}
```

**Filtros disponíveis**: `today`, `tomorrow`, `thisWeek`, `noShows`, `pendingPayment`, `all`

### PullToRefresh

```tsx
import { PullToRefresh } from '@/components/schedule';

function MobileSchedule() {
  const handleRefresh = async () => {
    await refetchAppointments();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} threshold={80}>
      <YourScheduleContent />
    </PullToRefresh>
  );
}
```

### SwipeNavigation

```tsx
import { SwipeNavigation } from '@/components/schedule';

function CalendarView() {
  const handlePrevious = () => goToPreviousDay();
  const handleNext = () => goToNextDay();

  return (
    <SwipeNavigation
      onPrevious={handlePrevious}
      onNext={handleNext}
      sensitivity={50}
      disabled={isLoading}
      showIndicators={true}
    >
      <DayContent />
    </SwipeNavigation>
  );
}
```

### HapticFeedback

```tsx
import { hapticSuccess, hapticError, useHaptic } from '@/components/schedule';

function AppointmentModal() {
  const { vibrate } = useHaptic();

  const handleSave = () => {
    // Salvar...
    hapticSuccess();
  };

  const handleError = () => {
    hapticError();
  };

  return <Button onClick={handleSave}>Salvar</Button>;
}
```

---

## Fase 2: Performance Core

### VirtualizedAppointmentList

```tsx
import { VirtualizedAppointmentList } from '@/components/schedule';

function AppointmentsList() {
  return (
    <VirtualizedAppointmentList
      appointments={appointments}
      onItemClick={handleClick}
      onEdit={handleEdit}
      selectedAppointmentId={selectedId}
      itemHeight={140}
      overscanCount={5}
    />
  );
}
```

### useReactQueryOptimization

```tsx
import {
  useAppointmentsQuery,
  usePatientsQuery,
  prefetchAppointments,
  useCacheManagement,
} from '@/hooks';

function Dashboard() {
  const { data: appointments, isLoading } = useAppointmentsQuery(
    () => fetchAppointments()
  );

  const { clearCache, invalidateQueries } = useCacheManagement();

  // Prefetch pacientes ao passar mouse
  const prefetchPatients = usePrefetchOnHover(() => fetchPatients());

  return (
    <div>
      <button onMouseEnter={prefetchPatients}>Pacientes</button>
      <button onClick={invalidateQueries}>Atualizar</button>
    </div>
  );
}
```

### PerformanceBudget

```tsx
import { usePerformanceBudget, PerformanceBudgetMonitor } from '@/lib/performance/PerformanceBudget';

function App() {
  const { metrics, violations, score, isHealthy } = usePerformanceBudget();

  return (
    <div>
      <h2>Performance Score: {score}/100</h2>
      {!isHealthy && <div className="warning">Issues detected!</div>}
      {violations.map(v => (
        <div key={v.metric}>{v.metric}: {v.value} > {v.limit}</div>
      ))}
    </div>
  );
}
```

---

## Fase 4: UX/UI Enhancements

### ThemeProvider

```tsx
import { ThemeProvider, useTheme } from '@/components/ui/theme';

function App() {
  return (
    <ThemeProvider defaultPreferences={{ mode: 'system', colorScheme: 'default' }}>
      <YourApp />
    </ThemeProvider>
  );
}

function Settings() {
  const { theme, toggleMode, setFontSize, toggleHighContrast } = useTheme();

  return (
    <div>
      <button onClick={toggleMode}>
        {theme.mode === 'light' ? '🌙' : '☀️'}
      </button>
      <select onChange={(e) => setFontSize(e.target.value)}>
        <option value="sm">Pequeno</option>
        <option value="md">Médio</option>
        <option value="lg">Grande</option>
      </select>
      <button onClick={toggleHighContrast}>
        {theme.highContrast ? '👁️ High Contrast' : 'Normal'}
      </button>
    </div>
  );
}
```

### Accessibility Components

```tsx
import { SkipLinks, LiveRegion, FocusTrap } from '@/components/ui/accessibility';

function AppLayout() {
  return (
    <>
      <SkipLinks />
      <main id="main-content">
        <YourContent />
        <LiveRegion ariaLive="polite">
          {notification && <div>{notification}</div>}
        </LiveRegion>
      </main>
      {isModalOpen && (
        <FocusTrap active={true}>
          <YourModal onClose={closeModal} />
        </FocusTrap>
      )}
    </>
  );
}
```

### Responsive Components

```tsx
import { Show, Hide, Grid, Flex, useIsMobile } from '@/components/responsive';

function ResponsivePage() {
  const isMobile = useIsMobile();

  return (
    <div>
      <Show below="md">
        <MobileContent />
      </Show>
      <Hide below="md">
        <DesktopContent />
      </Hide>

      <Grid cols={{ xs: 1, md: 2, lg: 4 }} gap={4}>
        {items.map(item => <Card key={item.id}>{item}</Card>)}
      </Grid>
    </div>
  );
}
```

---

## Fase 5: Advanced Features

### RecurringAppointment

```tsx
import { RecurringAppointment, RecurringModal } from '@/components/appointments';

function SchedulePage() {
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowRecurringModal(true)}>
        Agendamento Recorrente
      </button>

      <RecurringModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        initialDate={selectedDate}
        onConfirm={(config) => createRecurring(config)}
      />
    </>
  );
}
```

**Tipos de recorrência**: `once`, `daily`, `weekly`, `monthly`, `yearly`

### AppointmentTemplates

```tsx
import { AppointmentTemplates, DEFAULT_TEMPLATES } from '@/components/appointments';

function TemplatesPage() {
  const handleApplyTemplate = (template) => {
    // Preencher formulário com dados do template
    setFormData({
      service: template.service,
      duration: template.duration,
      notes: template.notes,
    });
  };

  return (
    <AppointmentTemplates
      onApplyTemplate={handleApplyTemplate}
      onCreateTemplate={createTemplate}
      onEditTemplate={editTemplate}
      onDeleteTemplate={deleteTemplate}
    />
  );
}
```

### BulkOperations

```tsx
import { BulkOperations, SelectableRow, type BulkAction } from '@/components/appointments';

function AppointmentsList() {
  const handleBulkAction = async (ids: string[], action: BulkAction, data) => {
    switch (action) {
      case 'status':
        await updateStatus(ids, data.status);
        break;
      case 'export':
        await exportToCSV(ids);
        break;
      case 'delete':
        await deleteAppointments(ids);
        break;
    }
  };

  return (
    <BulkOperations
      appointments={appointments}
      onBulkUpdate={handleBulkAction}
      disabled={isLoading}
    >
      {appointments.map(apt => (
        <SelectableRow
          key={apt.id}
          appointment={apt}
          selected={selectedIds.has(apt.id)}
          onToggle={toggleSelection}
        >
          <AppointmentCard {...apt} />
        </SelectableRow>
      ))}
    </BulkOperations>
  );
}
```

---

## Fase 6: Ecosystem Integrations

### CalendarSync

```tsx
import { CalendarSync, type CalendarProvider } from '@/components/integrations';

function Settings() {
  const handleConnect = async (provider: CalendarProvider) => {
    // URL OAuth para cada provider
    const authUrls: Record<CalendarProvider, string> = {
      'google': 'https://accounts.google.com/o/oauth2/v2/auth',
      'icloud': 'https://id.apple.com/auth',
      'outlook': 'https://login.microsoft.com/',
    };

    // Redirecionar para OAuth
    window.location.href = authUrls[provider];
  };

  return (
    <CalendarSync />
  );
}
```

### TelehealthIntegration

```tsx
import { TelehealthIntegration, type TelehealthProvider } from '@/components/integrations';

function TelehealthPage() {
  const handleCreateRoom = async (provider: TelehealthProvider) => {
    // Criar sala de reunião
    const room = await createMeetingRoom({
      provider,
      title: `Consulta - ${patient.name}`,
      duration: 60,
    });

    // Adicionar link ao agendamento
    updateAppointment({
      id: appointment.id,
      meetingLink: room.joinUrl,
      meetingPassword: room.password,
    });
  };

  return (
    <TelehealthIntegration />
  );
}
```

---

## Fase 7: Innovation Lab

### NaturalLanguageScheduler

```tsx
import {
  NaturalLanguageScheduler,
  useNaturalLanguageScheduler,
  type ParsedAppointment,
} from '@/components/ai';

function SmartSchedule() {
  const patientNames = patients.map(p => p.name);
  const { parseInput } = useNaturalLanguageScheduler(patientNames);

  const handleInput = (text: string) => {
    const result = parseInput(text);
    console.log('Parsed:', result);
    // { patientName, date, time, duration, service, notes, confidence }
  };

  const handleConfirm = (appointment: ParsedAppointment) => {
    createAppointment({
      patientId: patients.find(p => p.name === appointment.patientName)?.id,
      startTime: combineDateTime(appointment.date, appointment.time),
      duration: appointment.duration || 60,
      service: appointment.service,
      notes: appointment.notes,
    });
  };

  return (
    <NaturalLanguageScheduler
      onConfirm={handleConfirm}
      patientNames={patientNames}
      placeholder="Ex: Agendar João para amanhã às 14h30, sessão de fisioterapia"
    />
  );
}
```

### VoiceAppointmentAssistant

```tsx
import { VoiceAppointmentAssistant, type VoiceCommand } from '@/components/ai';

function VoicePage() {
  const handleCommand = (command: VoiceCommand) => {
    switch (command.type) {
      case 'create':
        // Extrair params e criar agendamento
        createFromVoice(command.params);
        break;
      case 'list':
        // Mostrar agenda
        navigate('/schedule');
        break;
      case 'cancel':
        // Cancelar agendamento
        cancelAppointment(command.params.appointmentId);
        break;
      case 'reschedule':
        // Reagendar
        reschedule(command.params);
        break;
    }
  };

  return (
    <VoiceAppointmentAssistant
      onCommand={handleCommand}
      patientNames={patients.map(p => p.name)}
      defaultLanguage="pt-BR"
    />
  );
}
```

**Comandos de voz disponíveis**:
- `Agendar [nome] para [data] às [hora]` - Criar agendamento
- `Listar agendamentos` - Mostrar agenda
- `Cancelar [nome]` - Cancelar consulta
- `Reagendar [nome] para [data]` - Mover consulta

### PredictiveAnalytics

```tsx
import {
  PredictiveAnalytics,
  AttendancePredictor,
  SlotRecommender,
  type AttendancePrediction,
  type TimeSlotRecommendation,
} from '@/components/ai';

function AnalyticsDashboard() {
  return (
    <PredictiveAnalytics>
      <AttendancePredictor
        appointments={appointments}
        date={selectedDate}
      />
      <SlotRecommender
        appointments={appointments}
        startDate={weekStart}
        endDate={weekEnd}
      />
    </PredictiveAnalytics>
  );
}
```

**Predições disponíveis**:
- Probabilidade de comparecimento por paciente
- Fatores: histórico no-show, dias desde última consulta, horário preferido
- Recomendações de horários com score de ocupação

---

## Backend Integration

### AI Scheduling Flows

Os flows de IA estão implementados em `functions/src/ai/flows/scheduling.ts`:

```typescript
// Exemplo de uso no frontend
import { useAIScheduling } from '@/hooks';

function SchedulePage() {
  const { suggestOptimalSlot, predictNoShow } = useAIScheduling();

  const handleSuggestSlot = async (patientId: string) => {
    const suggestion = await suggestOptimalSlot({
      patientId,
      preferredDays: ['monday', 'wednesday', 'friday'],
      preferredTime: 'afternoon',
    });

    if (suggestion.success) {
      // Mostrar sugestão
      showSuggestion(suggestion.slot);
    }
  };

  const checkNoShowRisk = async (patientId: string) => {
    const prediction = await predictNoShow({ patientId });

    if (prediction.risk > 0.7) {
      showWarning('Alto risco de não comparecimento');
    }
  };

  return <YourUI />;
}
```

### Firebase AI Logic

Genkit flows configurados em `functions/src/ai/flows/scheduling.ts`:

- `suggestOptimalSlot` - Sugere horário ótimo baseado em histórico
- `predictNoShow` - Prediz probabilidade de no-show
- `optimizeCapacity` - Otimiza capacidade do calendário
- `waitlistPrioritization` - Prioriza lista de espera com IA

---

## Exemplos de Integração Completa

### Página de Agenda com Todos os Recursos

```tsx
import React from 'react';
import {
  // Quick Wins
  QuickFilters,
  PullToRefresh,
  SwipeNavigation,
  HapticFeedback,

  // Performance
  VirtualizedAppointmentList,

  // Advanced
  BulkOperations,

  // AI
  NaturalLanguageScheduler,
  VoiceAppointmentAssistant,

  // UX/UI
  ThemeProvider, useTheme,
  SkipLinks,

  // Responsive
  useIsMobile,

  // Integrations
  CalendarSync,
} from '@/components';

import {
  useAppointmentsQuery,
  prefetchPatients,
} from '@/hooks';

function FullFeaturedAgenda() {
  // Hooks
  const { data: appointments, isLoading } = useAppointmentsQuery(() => fetchAppointments());
  const { toggleMode } = useTheme();
  const isMobile = useIsMobile();

  // Estados
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showNLScheduler, setShowNLScheduler] = useState(false);

  return (
    <ThemeProvider>
      <SkipLinks />

      <main id="main-content">
        {/* Header com filtros e tema */}
        <header className="flex items-center justify-between p-4">
          <QuickFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          <button onClick={toggleMode}>
            Toggle Theme
          </button>

          <button onClick={() => setShowVoiceAssistant(true)}>
            🎤 Voice
          </button>

          <button onClick={() => setShowNLScheduler(true)}>
            ✨ NL Schedule
          </button>
        </header>

        {/* Conteúdo principal */}
        <PullToRefresh onRefresh={refetch}>
          <SwipeNavigation onPrevious={prevDay} onNext={nextDay}>
            {isMobile ? (
              // Mobile: lista virtualizada
              <VirtualizedAppointmentList
                appointments={filteredAppointments}
                onItemClick={handleClick}
              />
            ) : (
              // Desktop: view completa
              <FullCalendarView appointments={filteredAppointments} />
            )}
          </SwipeNavigation>
        </PullToRefresh>

        {/* Operações em massa */}
        <BulkOperations
          appointments={filteredAppointments}
          onBulkUpdate={handleBulkAction}
        />

        {/* Sincronização */}
        <CalendarSync />

        {/* Modais */}
        {showVoiceAssistant && (
          <VoiceAppointmentAssistant
            onCommand={handleVoiceCommand}
            onClose={() => setShowVoiceAssistant(false)}
          />
        )}

        {showNLScheduler && (
          <NaturalLanguageScheduler
            onConfirm={handleNLConfirm}
            onClose={() => setShowNLScheduler(false)}
          />
        )}
      </main>

      {/* Análise preditiva */}
      <PredictiveAnalytics />

      {/* Performance monitor */}
      <PerformanceMonitor isVisible={false} />
    </ThemeProvider>
  );
}
```

---

## Dependências Necessárias

```json
{
  "dependencies": {
    "react-window": "^1.8.10",
    "react-virtualized-auto-sizer": "^1.0.24",
    "@mui/material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "date-fns": "^3.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  }
}
```

---

## Checklist de Implementação

- [x] Fase 1: Quick Wins implementada
- [x] Fase 2: Performance Core implementada
- [x] Fase 4: UX/UI Enhancements implementada
- [x] Fase 5: Advanced Features implementada
- [x] Fase 6: Ecosystem Integrations implementada
- [x] Fase 7: Innovation Lab implementada
- [ ] Testes unitários para novos componentes
- [ ] Testes E2E para fluxos críticos
- [ ] Documentação de Storybook
- [ ] Deploy em staging
- [ ] Treinamento de modelos ML com dados reais

---

## Suporte

Para dúvidas sobre a implementação ou integração, consulte:
1. Documentação individual de cada fase
2. Comentários inline nos componentes
3. TypeScript types exportados

---

Última atualização: 2026-02-22
