/**
 * Schedule Page - Migrated to Firebase
 */

import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModalRefactored as AppointmentModal } from '@/components/schedule/AppointmentModalRefactored';
import { AppointmentQuickEditModal } from '@/components/schedule/AppointmentQuickEditModal';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistHorizontal } from '@/components/schedule/WaitlistHorizontal';
import { KeyboardShortcuts } from '@/components/schedule/KeyboardShortcuts';
import { BulkActionsBar } from '@/components/schedule/BulkActionsBar';
import { useAppointments, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useBulkActions } from '@/hooks/useBulkActions';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { AlertTriangle } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/ui';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
// ScheduleToolbar removed - actions merged into CalendarView header
import { formatDateToLocalISO, formatDateToBrazilian } from '@/utils/dateUtils';
import { APPOINTMENT_CONFLICT_MESSAGE, APPOINTMENT_CONFLICT_TITLE, isAppointmentConflictError } from '@/utils/appointmentErrors';
import { AppointmentService } from '@/services/appointmentService';
import { getUserOrganizationId } from '@/utils/userHelpers';
import { cn } from '@/lib/utils';
import {

  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { RouteKeys, PrefetchStrategy } from '@/lib/routing/routePrefetch';

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
  // STATE (deep linking: view + date from URL)
  // ===================================================================

  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const viewFromUrl = searchParams.get('view');
  const dateFromUrl = searchParams.get('date');
  const validView = viewFromUrl === 'day' || viewFromUrl === 'week' || viewFromUrl === 'month' ? viewFromUrl : null;
  const parsedDate = dateFromUrl ? (() => { const d = parseISO(dateFromUrl); return isNaN(d.getTime()) ? null : d; })() : null;

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [quickEditAppointment, setQuickEditAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState<Date>(() => parsedDate || new Date());

  const [viewType, setViewType] = useState<CalendarViewType | 'list'>(() => {
    if (validView) return validView;
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'day' : 'week';
    }
    return isMobile ? 'day' : 'week';
  });

  /** Message announced to screen readers after successful reschedule (aria-live) */
  const [rescheduleSuccessMessage, setRescheduleSuccessMessage] = useState<string | null>(null);

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

  // Patient search filter
  const [patientFilter, setPatientFilter] = useState<string | null>(null);

  const [waitlistQuickAdd, setWaitlistQuickAdd] = useState<{ date: Date; time: string } | null>(null);
  const [scheduleFromWaitlist, setScheduleFromWaitlist] = useState<{ patientId: string; patientName: string } | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showCancelAllTodayDialog, setShowCancelAllTodayDialog] = useState(false);
  const [isCancellingAllToday, setIsCancellingAllToday] = useState(false);

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

  const hasConnectionBanner = !isOnline || isChecking || isReconnecting || isFromCache || !!isUsingStaleData;

  // ===================================================================
  // COMPUTED VALUES
  // ===================================================================

  const _formattedMonth = useMemo(() => {
    const month = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    return month.charAt(0).toUpperCase() + month.slice(1);
  }, [currentDate]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Filter by patient name
      if (patientFilter && apt.patientName !== patientFilter) {
        return false;
      }
      // Filter by status
      if (filters.status.length > 0 && !filters.status.includes(apt.status)) {
        return false;
      }
      // Filter by type
      if (filters.types.length > 0 && !filters.types.includes(apt.type)) {
        return false;
      }
      // Filter by therapist
      if (filters.therapists.length > 0 && apt.therapistId && !filters.therapists.includes(apt.therapistId)) {
        return false;
      }
      return true;
    });
  }, [appointments, filters, patientFilter]);

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
      setRescheduleSuccessMessage('Reagendado com sucesso');
    } catch (error) {
      if (isAppointmentConflictError(error)) {
        toast({
          title: APPOINTMENT_CONFLICT_TITLE,
          description: APPOINTMENT_CONFLICT_MESSAGE,
          variant: 'destructive'
        });
      } else {
        toast({
          title: '❌ Erro ao reagendar',
          description: 'Não foi possível reagendar o atendimento.',
          variant: 'destructive'
        });
      }
      throw new Error('Failed to reschedule appointment');
    }
  }, [rescheduleAppointment]);

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  }, []);

  const handleDeleteAppointment = useCallback(async (appointment: Appointment) => {
    try {
      const organizationId = await getUserOrganizationId();
      if (!organizationId) {
        toast({ title: 'Erro', description: 'Organização não encontrada.', variant: 'destructive' });
        return;
      }
      await AppointmentService.deleteAppointment(appointment.id, organizationId);

      toast({
        title: '✅ Agendamento excluído',
        description: `Agendamento de ${appointment.patientName} foi excluído.`
      });
      refetch();
    } catch (err) {
      logger.error('Erro ao excluir agendamento', err, 'Schedule');
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

  const handleCancelAllToday = useCallback(async () => {
    const organizationId = await getUserOrganizationId();
    if (!organizationId) {
      toast({
        title: 'Erro',
        description: 'Organização não encontrada. Faça login novamente.',
        variant: 'destructive',
      });
      setShowCancelAllTodayDialog(false);
      return;
    }
    const dateStr = formatDateToLocalISO(currentDate);
    setIsCancellingAllToday(true);
    try {
      const { cancelled, errors } = await AppointmentService.cancelAllAppointmentsForDate(organizationId, dateStr);
      setShowCancelAllTodayDialog(false);
      await refetch();
      if (errors > 0) {
        toast({
          title: 'Concluído com ressalvas',
          description: `${cancelled} agendamento(s) cancelado(s). ${errors} falha(s).`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Agendamentos cancelados',
          description: cancelled === 0
            ? 'Nenhum agendamento encontrado para esta data.'
            : `${cancelled} agendamento(s) de ${formatDateToBrazilian(currentDate)} cancelado(s).`,
        });
      }
    } catch (err) {
      logger.error('Erro ao cancelar agendamentos do dia', err, 'Schedule');
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar os agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setIsCancellingAllToday(false);
    }
  }, [currentDate, refetch]);

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

  // Prefetch de rotas relacionadas quando a agenda está carregada
  useEffect(() => {
    PrefetchStrategy.onMount(RouteKeys.PATIENT_EVOLUTION,
      () => import('./PatientEvolution').then(m => ({ default: m.PatientEvolution }))
    );
    PrefetchStrategy.onMount(RouteKeys.PATIENT_PROFILE,
      () => import('./patients/PatientProfilePage').then(m => ({ default: m.PatientProfilePage }))
    );
    PrefetchStrategy.onMount(RouteKeys.EVALUATION_NEW,
      () => import('./patients/NewEvaluationPage').then(m => ({ default: m.NewEvaluationPage }))
    );
  }, []);

  // Clear reschedule success announcement after 3s (screen reader already heard it)
  useEffect(() => {
    if (!rescheduleSuccessMessage) return;
    const t = setTimeout(() => setRescheduleSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [rescheduleSuccessMessage]);

  // Force day view on mobile
  // No longer forcing 'day' view on mobile to allow responsive weekly view
  useEffect(() => {
    if (isMobile && viewType === 'month') {
      setViewType('day');
    }
  }, [isMobile, viewType]);

  // Deep linking: sync view + date to URL for sharing and back/forward
  useEffect(() => {
    setSearchParams(
      { view: viewType, date: format(currentDate, 'yyyy-MM-dd') },
      { replace: true }
    );
  }, [viewType, currentDate, setSearchParams]);

  // Process ?edit= and ?patientId= from URL
  useEffect(() => {
    const editAppointmentId = searchParams.get('edit');

    // Open edit modal if ?edit= is present
    if (editAppointmentId) {
      const appointmentToEdit = appointments.find(a => a.id === editAppointmentId);
      if (appointmentToEdit) {
        setQuickEditAppointment(appointmentToEdit);
        // Clear the parameter from URL
        setSearchParams(
          { view: viewType, date: format(currentDate, 'yyyy-MM-dd') },
          { replace: true }
        );
      }
    }
  }, [searchParams, appointments, viewType, currentDate, setSearchParams]);

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
        case 'a':
          e.preventDefault();
          toggleSelectionMode();
          break;
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
    handleCreateAppointment,
    toggleSelectionMode
  ]);

  // ScheduleToolbar custom events no longer needed - navigation is handled directly by CalendarView

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
      <div className="flex flex-col min-h-[calc(100vh-128px)] bg-slate-50 dark:bg-slate-950">
        {/* Skip link - visible on focus for keyboard users */}
        <a
          href="#calendar-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none"
        >
          Pular para o calendário
        </a>

        <div className="flex flex-col flex-1 relative min-h-0">

          {/* Horizontal Waitlist */}
          <WaitlistHorizontal
            onSchedulePatient={handleScheduleFromWaitlist}
            className="flex-shrink-0 z-20"
            isOnline={isOnline}
            isChecking={isChecking}
            isReconnecting={isReconnecting}
            isFromCache={isFromCache}
            isStale={isUsingStaleData}
            dataSource={dataSource}
            cacheTimestamp={cacheTimestamp}
            onRefresh={handleRefresh}
            hasConnectionBanner={hasConnectionBanner}
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
                  rescheduleSuccessMessage={rescheduleSuccessMessage}
                  onCreateAppointment={handleCreateAppointment}
                  onToggleSelectionMode={toggleSelectionMode}
                  onCancelAllToday={() => setShowCancelAllTodayDialog(true)}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={() => setFilters({ status: [], types: [], therapists: [] })}
                  totalAppointmentsCount={appointments.length}
                  patientFilter={patientFilter}
                  onPatientFilterChange={setPatientFilter}
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
          key={selectedAppointment ? `edit-${selectedAppointment.id}` : `create-${modalDefaultDate?.getTime() ?? 0}-${modalDefaultTime ?? ''}`}
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

        <AlertDialog open={showCancelAllTodayDialog} onOpenChange={setShowCancelAllTodayDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar todos os agendamentos</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja cancelar todos os agendamentos de <strong>{formatDateToBrazilian(currentDate)}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancellingAllToday}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleCancelAllToday();
                }}
                disabled={isCancellingAllToday}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isCancellingAllToday ? 'Cancelando…' : 'Cancelar todos'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </MainLayout>
  );
};

export default Schedule;
