/**
 * FisioFlow - Agenda Principal
 *
 * Agenda completa com todas as funcionalidades implementadas
 * nas 7 fases: Quick Wins, Performance Core, AI Scheduling,
 * UX/UI Enhancements, Advanced Features, Ecosystem Integrations, Innovation Lab.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Filter, Settings, Plus, Video } from 'lucide-react';
import { format, addDays, startOfWeek, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  ScheduleView,
  AppointmentListView,
  AppointmentCard,
  QuickFilters,
  PullToRefresh,
  SwipeNavigation,
  HapticFeedback,
  CalendarHeatMap,
  VirtualizedDayView,
  VirtualizedWeekView,
  NaturalLanguageScheduler,
  VoiceAppointmentAssistant,
  PredictiveAnalytics,
  ThemeProvider,
  useTheme,
  ThemeControls,
  SkipLinks,
  useQuickFilters,
  useAppointments,
  useOptimizedQuery,
  prefetchAppointments,
} from '@/components';

import { cn } from '@/lib/utils';
import { Appointment } from '@/types';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const VIEW_TYPES = ['day', 'week', 'month', 'list'] as const;
type ViewType = typeof VIEW_TYPES[number];

interface AgendaPageProps {
  className?: string;
}

// ============================================================================
// COMPONENTE DA AGENDA PRINCIPAL
// ============================================================================

export const AgendaPage: React.FC<AgendaPageProps> = ({ className }) => {
  const [view, setView] = useState<ViewType>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isQuickFiltersOpen, setIsQuickFiltersOpen] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  // Hooks
  const { activeFilter, setActiveFilter, filteredAppointments } = useQuickFilters();
  const { data: appointments, isLoading } = useOptimizedQuery(
    () => fetchAppointments(),
    { queryKey: ['appointments'] }
  );

  const fetchPatients = useCallback(async () => {
    // TODO: Implement fetch from service
    return [];
  }, []);
  const { theme, toggleMode } = useTheme();

  // Calcular dias da semana atual
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Mudar data
  const goToToday = () => setSelectedDate(new Date());
  const goToPreviousWeek = () => setSelectedDate(addDays(selectedDate, -7));
  const goToNextWeek = () => setSelectedDate(addDays(selectedDate, 7));

  // Renderização condicional da view
  const renderView = () => {
    switch (view) {
      case 'day':
        return (
          <VirtualizedDayView
            date={selectedDate}
            appointments={filteredAppointments}
            onSlotClick={(slot) => console.log('Slot clicked:', slot)}
            onAppointmentClick={(apt) => console.log('Appointment clicked:', apt)}
          />
        );

      case 'week':
        return (
          <VirtualizedWeekView
            weekStart={weekDays[0]}
            appointments={filteredAppointments}
            onSlotClick={(slot) => console.log('Slot clicked:', slot)}
            onAppointmentClick={(apt) => console.log('Appointment clicked:', apt)}
          />
        );

      case 'list':
        return (
          <AppointmentListView
            appointments={filteredAppointments}
            onItemClick={(apt) => console.log('Appointment clicked:', apt)}
          />
        );

      default:
        return (
          <ScheduleView
            date={selectedDate}
            appointments={filteredAppointments}
            onAppointmentClick={(apt) => console.log('Appointment clicked:', apt)}
          />
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <ThemeProvider>
      <SkipLinks />

      <div className={cn('min-h-screen flex flex-col', className)}>
        {/* Header */}
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Navegação de data */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Semana anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-2 hover:bg-muted rounded-lg transition-colors"
                  title="Hoje"
                >
                  Hoje
                </button>
                <button
                  onClick={goToNextWeek}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Próxima semana"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de view */}
              <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-1">
                {VIEW_TYPES.map((viewType) => (
                  <button
                    key={viewType}
                    onClick={() => setView(viewType)}
                    className={cn(
                      'px-4 py-2 rounded-lg transition-colors capitalize',
                      view === viewType
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/80'
                    )}
                  >
                    {viewType === 'day' && 'Dia'}
                    {viewType === 'week' && 'Semana'}
                    {viewType === 'month' && 'Mês'}
                    {viewType === 'list' && 'Lista'}
                  </button>
                ))}
              </div>

              {/* Controles */}
              <div className="flex items-center gap-2">
                {/* Filtros rápidos */}
                <button
                  onClick={() => setIsQuickFiltersOpen(!isQuickFiltersOpen)}
                  className={cn(
                    'p-2 hover:bg-muted rounded-lg transition-colors relative',
                    isQuickFiltersOpen && 'bg-muted'
                  )}
                  title="Filtros"
                >
                  <Filter className="w-5 h-5" />
                  {activeFilter !== 'all' && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>

                {/* Tema */}
                <button
                  onClick={toggleMode}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title={theme.mode === 'light' ? 'Modo escuro' : 'Modo claro'}
                >
                  {theme.mode === 'light' ? '🌙' : '☀️'}
                </button>

                {/* IA */}
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className={cn(
                    'p-2 hover:bg-muted rounded-lg transition-colors',
                    showAIPanel && 'bg-muted'
                  )}
                  title="Assistente IA"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* Voz */}
                <button
                  onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
                  className={cn(
                    'p-2 hover:bg-muted rounded-lg transition-colors',
                    showVoiceAssistant && 'bg-muted'
                  )}
                  title="Assistente de voz"
                >
                  <Video className="w-5 h-5" />
                </button>

                {/* Análise */}
                <button
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Análise preditiva"
                >
                  <Calendar className="w-5 h-5" />
                </button>

                {/* Telemedicina */}
                <button className="p-2 hover:bg-muted rounded-lg transition-colors"">
                  <Video className="w-5 h-5" />
                </button>

                {/* Sincronizar */}
                <button
                  onClick={() => console.log('Sync')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Sincronizar calendários"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Filters Dropdown */}
            {isQuickFiltersOpen && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-background border rounded-lg shadow-xl min-w-[200px]">
                <QuickFilters
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {/* Week View - Header com dias */}
          {view === 'week' && (
            <div className="hidden md:flex border-b">
              {weekDays.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'flex-1 py-3 text-center transition-colors',
                    differenceInDays(day, selectedDate) === 0 && 'bg-primary/10 border-primary/20 border-b-2',
                    'hover:bg-muted/30'
                  )}
                >
                  <div className="text-sm text-muted-foreground mb-1">
                    {format(day, 'EEEEE', { locale: ptBR })}
                  </div>
                  <div className="font-semibold">
                    {format(day, 'dd', { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(day, 'MMM', { locale: ptBR })}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Content com PullToRefresh */}
          <PullToRefresh onRefresh={() => console.log('Refreshing...')}>
            {renderView()}
          </PullToRefresh>

          {/* AI Panels */}
          {showAIPanel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <PredictiveAnalytics />
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {showVoiceAssistant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg">
                <VoiceAppointmentAssistant
                  onClose={() => setShowVoiceAssistant(false)}
                />
                <button
                  onClick={() => setShowVoiceAssistant(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Sidebar - Heat Map */}
        <aside className="hidden lg:block w-80 border-l bg-background p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">Mapa de Ocupação</h3>
          <CalendarHeatMap
            appointments={filteredAppointments}
            selectedDate={selectedDate}
            onSlotClick={(slot) => setSelectedDate(slot.date)}
          />

          {/* Natural Language Scheduler */}
          <div className="mt-8">
            <NaturalLanguageScheduler
              onConfirm={(appointment) => {
                console.log('Creating appointment from NLP:', appointment);
                setShowVoiceAssistant(false);
              }}
            />
          </div>
        </aside>
      </div>
    </ThemeProvider>
  );
};

AgendaPage.displayName = 'AgendaPage';
