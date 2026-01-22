import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/shared/ui/button';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModalRefactored as AppointmentModal } from '@/components/schedule/AppointmentModalRefactored';
import { AppointmentQuickEditModal } from '@/components/schedule/AppointmentQuickEditModal';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistHorizontal } from '@/components/schedule/WaitlistHorizontal';
import { KeyboardShortcuts } from '@/components/schedule/KeyboardShortcuts';
import { AdvancedFilters } from '@/components/schedule/AdvancedFilters';
import { BulkActionsBar } from '@/components/schedule/BulkActionsBar';
import { useAppointments, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useBulkActions } from '@/hooks/useBulkActions';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Plus, Settings as SettingsIcon, ChevronLeft, ChevronRight, CheckSquare, Calendar, Sparkles } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/web/ui/empty-state';
import { OfflineIndicator } from '@/components/web/ui/OfflineIndicator';
import { LoadingSkeleton } from '@/components/web/ui/loading-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { formatDateToLocalISO, formatDateToBrazilian } from '@/utils/dateUtils';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy load CalendarView for better initial load performance
const CalendarView = lazy(() =>
  import('@/components/schedule/CalendarView').then(mod => ({ default: mod.CalendarView }))
);

// =====================================================================
// CONSTANTS
// =====================================================================

const BUSINESS_HOURS = {
  start: 7,
  end: 21,
  defaultRound: 30,
} as const;

const KEYBOARD_SHORTCUTS = {
  NEW_APPOINTMENT: 'n',
  SEARCH: 'f',
  DAY_VIEW: 'd',
  WEEK_VIEW: 'w',
  MONTH_VIEW: 'm',
  TODAY: 't',
  HELP: '/',
  HELP_ALT: '?',
} as const;

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

const roundToNextSlot = (date: Date): string => {
  const minutes = date.getMinutes();
  const roundedMinutes = minutes < BUSINESS_HOURS.defaultRound ? BUSINESS_HOURS.defaultRound : 0;
  let hour = minutes < BUSINESS_HOURS.defaultRound ? date.getHours() : date.getHours() + 1;

  if (hour >= BUSINESS_HOURS.end) {
    hour = BUSINESS_HOURS.start;
  } else if (hour < BUSINESS_HOURS.start) {
    hour = BUSINESS_HOURS.start;
  }

  return `${String(hour).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================

const Schedule = () => {
  // ===================================================================
  // STATE
  // ===================================================================

  const isMobile = useIsMobile();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [quickEditAppointment, setQuickEditAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Detect mobile and default to day view on mobile
  const [viewType, setViewType] = useState<CalendarViewType | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'day' : 'week';
    }
    return isMobile ? 'day' : 'week';
  });

  // Filters state
  const [filters, setFilters] = useState<{
    status: string[];
    types: string[];
    therapists: string[];
  }>({
    status: [],
    types: [],
    therapists: []
  });

  const [waitlistQuickAdd, setWaitlistQuickAdd] = useState<{ date: Date; time: string } | null>(null);
  const [scheduleFromWaitlist, setScheduleFromWaitlist] = useState<{ patientId: string; patientName: string } | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // ===================================================================
  // HOOKS
  // ===================================================================

  const {
    data: appointments = [],
    isLoading: loading,
    error,
    refetch,
    isFromCache,
    cacheTimestamp,
    // @ts-expect-error - Propriedades novas
    dataSource,
    // @ts-expect-error - New property from hook
    isUsingStaleData
  } = useAppointments();
  const { mutateAsync: rescheduleAppointment } = useRescheduleAppointment();

  const {
    selectedIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleSelection,
    clearSelection,
    deleteSelected,
    updateStatusSelected
  } = useBulkActions();

  const {
    isOnline,
    isReconnecting,
    isChecking,
    checkConnection,
  } = useConnectionStatus({
    onReconnect: () => {
      refetch();
      toast({ title: '✅ Conectado', description: 'Conexão restabelecida. Dados atualizados.' });
    },
    onDisconnect: () => {
      toast({
        title: '⚠️ Sem conexão',
        description: 'Mostrando dados salvos localmente.',
        variant: 'destructive'
      });
    },
  });

  // ===================================================================
  // COMPUTED VALUES
  // ===================================================================

  const formattedMonth = useMemo(() => {
    const month = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    return month.charAt(0).toUpperCase() + month.slice(1);
  }, [currentDate]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Filter by status
      if (filters.status.length > 0 && !filters.status.includes(apt.status)) {
        return false;
      }
      // Filter by type
      if (filters.types.length > 0 && !filters.types.includes(apt.type)) {
        return false;
      }
      // Filter by therapist (assuming we have therapist info in apt, if not skip)
      // Note: Current Appointment type might not have therapistId or Name fully populated for filtering
      // Adding basic check if field exists
      if (filters.therapists.length > 0 && apt.therapistId && !filters.therapists.includes(apt.therapistId)) {
        return false;
      }
      return true;
    });
  }, [appointments, filters]);

  // ===================================================================
  // HANDLERS
  // ===================================================================

  const handleRefresh = useCallback(async () => {
    await checkConnection();
    await refetch({ cancelRefetch: false });
  }, [checkConnection, refetch]);

  const handleCreateAppointment = useCallback(() => {
    setSelectedAppointment(null);
    const now = new Date();
    setModalDefaultDate(now);
    setModalDefaultTime(roundToNextSlot(now));
    setIsModalOpen(true);
  }, []);

  const handleTimeSlotClick = useCallback((date: Date, time: string) => {
    // If in selection mode, maybe we want to ignore slot clicks or allow creating?
    // For now, let's keep it as is, or disable if selection mode?
    if (isSelectionMode) return;

    setSelectedAppointment(null);
    setModalDefaultDate(date);
    setModalDefaultTime(time);
    setIsModalOpen(true);
  }, [isSelectionMode]);

  const handleViewTypeChange = useCallback((type: CalendarViewType) => {
    setViewType(type);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setModalDefaultDate(undefined);
    setModalDefaultTime(undefined);
  }, []);

  const handleAppointmentReschedule = useCallback(async (appointment: Appointment, newDate: Date, newTime: string) => {
    try {
      const formattedDate = formatDateToLocalISO(newDate);
      await rescheduleAppointment({
        appointmentId: appointment.id,
        appointment_date: formattedDate,
        appointment_time: newTime,
        duration: appointment.duration
      });
      toast({
        title: '✅ Reagendado com sucesso',
        description: `Atendimento de ${appointment.patientName} movido para ${formatDateToBrazilian(newDate)} às ${newTime}.`,
      });
    } catch {
      toast({
        title: '❌ Erro ao reagendar',
        description: 'Não foi possível reagendar o atendimento.',
        variant: 'destructive'
      });
      throw new Error('Failed to reschedule appointment');
    }
  }, [rescheduleAppointment]);

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  }, []);

  const handleDeleteAppointment = useCallback(async (appointment: Appointment) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);

      if (error) throw error;
      toast({
        title: '✅ Agendamento excluído',
        description: `Agendamento de ${appointment.patientName} foi excluído.`
      });
      refetch();
    } catch {
      toast({
        title: '❌ Erro ao excluir',
        description: 'Não foi possível excluir o agendamento.',
        variant: 'destructive'
      });
    }
  }, [refetch]);

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setQuickEditAppointment(appointment);
  }, []);

  const handleScheduleFromWaitlist = useCallback((patientId: string, patientName: string) => {
    setScheduleFromWaitlist({ patientId, patientName });
    setSelectedAppointment(null);
    setModalDefaultDate(currentDate);
    setIsModalOpen(true);
  }, [currentDate]);

  // ===================================================================
  // EFFECTS
  // ===================================================================

  useEffect(() => {
    logger.info('Página Schedule carregada', {
      appointmentsCount: appointments.length,
      loading,
      viewType
    }, 'Schedule');
  }, [appointments.length, loading, viewType]);

  // Force day view on mobile
  // No longer forcing 'day' view on mobile to allow responsive weekly view
  useEffect(() => {
    if (isMobile && viewType === 'month') {
      setViewType('day');
    }
  }, [isMobile, viewType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isModalActive = isModalOpen || showKeyboardShortcuts || quickEditAppointment;
      if (isModalActive && e.key !== 'Escape') {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case KEYBOARD_SHORTCUTS.NEW_APPOINTMENT:
          e.preventDefault();
          handleCreateAppointment();
          break;
        case KEYBOARD_SHORTCUTS.SEARCH: {
          e.preventDefault();
          const searchInput = document.querySelector('input[aria-label="Buscar agendamentos por nome do paciente"]') as HTMLInputElement;
          searchInput?.focus();
          break;
        }
        case KEYBOARD_SHORTCUTS.DAY_VIEW:
        case KEYBOARD_SHORTCUTS.WEEK_VIEW:
        case KEYBOARD_SHORTCUTS.MONTH_VIEW:
          e.preventDefault();
          setViewType(key === KEYBOARD_SHORTCUTS.DAY_VIEW ? 'day' : key === KEYBOARD_SHORTCUTS.WEEK_VIEW ? 'week' : 'month');
          break;
        case KEYBOARD_SHORTCUTS.TODAY:
          e.preventDefault();
          setCurrentDate(new Date());
          break;
        case 'arrowleft':
        case 'arrowright':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const newDate = new Date(currentDate);
            const daysToAdd = key === 'arrowleft' ? -1 : 1;
            newDate.setDate(newDate.getDate() + daysToAdd);
            setCurrentDate(newDate);
          }
          break;
        case KEYBOARD_SHORTCUTS.HELP:
        case KEYBOARD_SHORTCUTS.HELP_ALT:
          e.preventDefault();
          setShowKeyboardShortcuts(true);
          break;
        case 'escape':
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentDate,
    isModalOpen,
    showKeyboardShortcuts,
    quickEditAppointment,
    handleCreateAppointment
  ]);

  if (error) {
    logger.error('Erro na página Schedule', { error }, 'Schedule');
    const errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar os agendamentos';
    return (
      <MainLayout>
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao carregar agendamentos"
          description={errorMessage}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth noPadding showBreadcrumbs={false}>
      <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950">

        {/* Offline Cache Indicator */}
        <OfflineIndicator
          isFromCache={isFromCache}
          isOnline={isOnline}
          isChecking={isChecking}
          isReconnecting={isReconnecting}
          cacheTimestamp={cacheTimestamp}
          itemCount={appointments.length}
          onRefresh={handleRefresh}
          className=""
          // @ts-expect-error - Propriedades dinâmicas retornadas pelo hook atualizado
          isStale={isUsingStaleData}
          // @ts-expect-error - Dynamic property from hook
          dataSource={dataSource}
        />

        {/* Header Section - Enhanced with better visual hierarchy */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left Section - Title, Navigation, Today Button */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                {/* Title with icon */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Agenda
                    </h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      Gerencie seus atendimentos
                    </p>
                  </div>
                </div>

                {/* Navigation Controls - Enhanced */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(date => addDays(date, -7))}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="px-3 min-w-[140px] text-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {formattedMonth}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDate(date => addDays(date, 7))}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Today Button - Enhanced */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="h-9 px-4 rounded-lg border-slate-200 dark:border-slate-700 font-medium transition-all hover:shadow-md"
                >
                  Hoje
                </Button>
              </div>

              {/* Right Section - View Switcher, Filters, Actions */}
              <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                {/* View Type Switcher - Enhanced Design */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <Button
                    size="sm"
                    variant={viewType === 'day' ? 'white' : 'ghost'}
                    onClick={() => setViewType('day')}
                    className="h-8 text-xs px-4 rounded-lg font-medium transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    <span className="hidden sm:inline">Dia</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={viewType === 'week' ? 'white' : 'ghost'}
                    onClick={() => setViewType('week')}
                    className="h-8 text-xs px-4 rounded-lg font-medium transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Semana
                  </Button>
                  <Button
                    size="sm"
                    variant={viewType === 'month' ? 'white' : 'ghost'}
                    onClick={() => setViewType('month')}
                    className="h-8 text-xs px-4 rounded-lg font-medium transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Mês
                  </Button>
                </div>

                {/* Selection Mode Toggle */}
                <Button
                  variant={isSelectionMode ? "default" : "outline"}
                  size="icon"
                  className={`h-9 w-9 rounded-lg transition-all ${
                    isSelectionMode
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-md'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={toggleSelectionMode}
                  title="Modo de Seleção (atalho: A)"
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>

                {/* Advanced Filters */}
                <AdvancedFilters
                  filters={filters}
                  onChange={setFilters}
                  onClear={() => setFilters({ status: [], types: [], therapists: [] })}
                />

                {/* Settings */}
                <Link to="/schedule/settings">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    title="Configurações da Agenda"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Primary CTA - Enhanced */}
                <Button
                  onClick={handleCreateAppointment}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2 shadow-md hover:shadow-lg rounded-lg px-4 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{isMobile ? 'Novo' : 'Novo Agendamento'}</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar - New Addition */}
          <div className="px-4 sm:px-6 pb-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {appointments.length} agendamentos
                </span>
              </div>
              {filteredAppointments.length !== appointments.length && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <span className="font-medium text-amber-900 dark:text-amber-100">
                    {filteredAppointments.length} visíveis (filtros ativos)
                  </span>
                </div>
              )}
              {isSelectionMode && selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-900 dark:text-purple-100">
                    {selectedIds.size} selecionados
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex flex-col flex-1 relative min-h-0">

          {/* Horizontal Waitlist */}
          <WaitlistHorizontal
            onSchedulePatient={handleScheduleFromWaitlist}
            className="flex-shrink-0 z-20"
          />

          {/* Calendar Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">
            <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 relative min-h-[600px]">
              <Suspense fallback={<LoadingSkeleton type="card" rows={3} className="h-full w-full" />}>
                <CalendarView
                  appointments={filteredAppointments}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  viewType={viewType as CalendarViewType}
                  onViewTypeChange={handleViewTypeChange}
                  onAppointmentClick={handleAppointmentClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  onAppointmentReschedule={handleAppointmentReschedule}
                  onEditAppointment={handleEditAppointment}
                  onDeleteAppointment={handleDeleteAppointment}
                  selectionMode={isSelectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                />
              </Suspense>
            </div>
          </div>
        </div>

        <BulkActionsBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onDeleteSelected={deleteSelected}
          onUpdateStatusSelected={updateStatusSelected}
        />

        {/* Modals Layer */}
        <AppointmentQuickEditModal
          appointment={quickEditAppointment}
          open={!!quickEditAppointment}
          onOpenChange={(open) => !open && setQuickEditAppointment(null)}
        />

        <AppointmentModal
          isOpen={isModalOpen}
          onClose={() => {
            handleModalClose();
            setScheduleFromWaitlist(null);
          }}
          appointment={selectedAppointment}
          defaultDate={modalDefaultDate}
          defaultTime={modalDefaultTime}
          defaultPatientId={scheduleFromWaitlist?.patientId}
          mode={selectedAppointment ? 'edit' : 'create'}
        />

        {waitlistQuickAdd && (
          <WaitlistQuickAdd
            open={!!waitlistQuickAdd}
            onOpenChange={(open) => !open && setWaitlistQuickAdd(null)}
            date={waitlistQuickAdd.date}
            time={waitlistQuickAdd.time}
          />
        )}

        <KeyboardShortcuts
          open={showKeyboardShortcuts}
          onOpenChange={setShowKeyboardShortcuts}
        />

      </div>
    </MainLayout>
  );
};

export default Schedule;
