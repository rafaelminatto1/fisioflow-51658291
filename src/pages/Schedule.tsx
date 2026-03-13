/**
 * Schedule Page - Migrated to Neon/Cloudflare
 */

import { useEffect, lazy, Suspense } from 'react';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { KeyboardShortcuts } from '@/components/schedule/KeyboardShortcuts';
import { BulkActionsBar } from '@/components/schedule/BulkActionsBar';
import { usePrefetchAdjacentPeriods } from '@/hooks/usePrefetchAdjacentPeriods';
import { useFilteredAppointments } from '@/hooks/useFilteredAppointments';
import { ViewType } from '@/utils/periodCalculations';
import { useAuth } from '@/contexts/AuthContext';
import { useBulkActions } from '@/hooks/useBulkActions';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { AlertTriangle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/ui';
import { CalendarSkeletonEnhanced } from '@/components/schedule/skeletons/CalendarSkeletonEnhanced';
import { toast } from '@/hooks/use-toast';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { formatDateToBrazilian } from '@/utils/dateUtils';
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
import { useScheduleState } from '@/hooks/useScheduleState';
import { useScheduleHandlers } from '@/hooks/useScheduleHandlers';
import { useBirthdayNotification } from '@/hooks/useBirthdayNotification';
import { usePatientReengagement } from '@/hooks/usePatientReengagement';
import { Cake, Sparkles, MessageCircle, AlertTriangle } from 'lucide-react';

// Kick off the CalendarView chunk download immediately at module evaluation
// so it runs in parallel with Schedule's own execution (eliminates waterfall).
const lazyRetry = (importFn: () => Promise<any>, maxRetries = 3) => {
  return new Promise<any>((resolve, reject) => {
    let retries = 0;
    const attempt = () => {
      importFn()
        .then(resolve)
        .catch((error) => {
          retries++;
          if (retries <= maxRetries) {
            console.warn(`[LazyRetry] Falha ao carregar componente da agenda. Tentativa ${retries}/${maxRetries}...`, error);
            setTimeout(attempt, 1500 * retries); // Backoff progressivo
          } else {
            reject(error);
          }
        });
    };
    attempt();
  });
};

const CalendarView = lazy(() =>
  lazyRetry(() => import('@/components/schedule/CalendarView')).then(mod => ({ default: mod.CalendarView }))
);

// Lazy load modals for better initial load performance
const AppointmentModal = lazy(() =>
  import('@/components/schedule/AppointmentModalRefactored').then(mod => ({ default: mod.AppointmentModalRefactored }))
);

const AppointmentQuickEditModal = lazy(() =>
  import('@/components/schedule/AppointmentQuickEditModal').then(mod => ({ default: mod.AppointmentQuickEditModal }))
);

const WaitlistQuickAdd = lazy(() =>
  import('@/components/schedule/WaitlistQuickAdd').then(mod => ({ default: mod.WaitlistQuickAdd }))
);

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

const Schedule = () => {
  const { user, organizationId: authOrganizationId } = useAuth();
  const organizationId = authOrganizationId || '';
  const { birthdaysToday, staffBirthdaysToday, sendBirthdayMessage, isSending } = useBirthdayNotification();
  const { totalToReengage, inactivePatients } = usePatientReengagement();

  // --- State & URL Sync ---
  const {
    currentDate,
    setCurrentDate,
    viewType,
    setViewType,
    filters,
    setFilters,
    patientFilter,
    setPatientFilter,
    clearFilters
  } = useScheduleState();

  // --- Bulk Actions ---
  const {
    selectedIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleSelection,
    clearSelection,
    deleteSelected,
    updateStatusSelected
  } = useBulkActions();

  // --- Data Fetching ---
  const periodQuery = {
    viewType: (viewType === 'list' ? 'week' : viewType) as ViewType,
    date: currentDate,
    organizationId,
  };

  const {
    data: appointments = [],
    isLoading: loading,
    error,
    refetch,
  } = useFilteredAppointments(
    periodQuery,
    {
      status: filters.status,
      types: filters.types,
      therapists: filters.therapists,
      patientName: patientFilter,
    }
  );

  // Prefetch adjacent periods for instant navigation
  usePrefetchAdjacentPeriods(periodQuery, {
    direction: 'both',
    delay: 500,
    networkAware: true,
  });

  // --- Connection Status ---
  const {
    isOnline,
    isReconnecting,
    isChecking,
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

  // --- Handlers & Modals ---
  const { modals, actions } = useScheduleHandlers(currentDate, refetch, isSelectionMode);

  // Deep link checks for ?edit=
  useEffect(() => {
    actions.checkEditUrlParam(appointments);
  }, [appointments, actions]);

  // Log organization ID for debugging
  useEffect(() => {
    logger.info('Schedule page loaded', {
      hasUser: !!user,
      organizationId,
      appointmentsCount: appointments.length,
      viewType
    }, 'Schedule');
  }, [user, organizationId, appointments.length, viewType]);

  // Clear reschedule success announcement after 3s (screen reader already heard it)
  useEffect(() => {
    if (!modals.rescheduleSuccessMessage) return;
    const t = setTimeout(() => modals.setRescheduleSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [modals]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isModalActive = modals.isModalOpen || modals.showKeyboardShortcuts || modals.quickEditAppointment;
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
          actions.handleCreateAppointment();
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
          modals.setShowKeyboardShortcuts(true);
          break;
        case 'escape':
          if (modals.showKeyboardShortcuts) {
            modals.setShowKeyboardShortcuts(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentDate,
    modals,
    actions,
    toggleSelectionMode,
    setViewType,
    setCurrentDate
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
      <div className="flex flex-col h-[calc(100vh-128px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Skip link - visible on focus for keyboard users */}
        <a
          href="#calendar-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-medium focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none"
        >
          Pular para o calendário
        </a>

        <div className="flex flex-col flex-1 relative min-h-0">
          {/* Action Banner: Birthdays & Reengagement */}
          {(birthdaysToday.length > 0 || staffBirthdaysToday.length > 0 || totalToReengage > 0) && (
            <div className="bg-gradient-to-r from-blue-500/10 via-pink-500/5 to-amber-500/10 px-6 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-6">
                {/* Birthdays section */}
                {(birthdaysToday.length > 0 || staffBirthdaysToday.length > 0) && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span className="text-pink-600">Aniversários:</span> {
                        [...birthdaysToday.map(p => p.name || p.full_name), ...staffBirthdaysToday.map(s => s.name)].join(', ')
                      }
                    </p>
                  </div>
                )}

                {/* Reengagement section */}
                {totalToReengage > 0 && (
                  <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-6">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span className="text-amber-600">{totalToReengage} pacientes</span> sem retorno há +60 dias
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {birthdaysToday.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-pink-600 hover:text-pink-700 hover:bg-pink-50 gap-2"
                    onClick={() => birthdaysToday.forEach(p => sendBirthdayMessage(p.id, p.phone || ''))}
                    disabled={isSending}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Parabéns + Cupom
                  </Button>
                )}
                {totalToReengage > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-2"
                    asChild
                  >
                    <Link to="/marketing/dashboard">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Reengajar Todos
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Calendar Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-slate-950" data-testid="mobile-schedule-list">
            <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 relative min-h-0">
              <Suspense fallback={<CalendarSkeletonEnhanced viewType={viewType as CalendarViewType} />}>
                {loading && appointments.length === 0 ? (
                  <CalendarSkeletonEnhanced viewType={viewType as CalendarViewType} />
                ) : (
                  <CalendarView
                    appointments={appointments}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    viewType={viewType as CalendarViewType}
                    onViewTypeChange={setViewType}
                    onAppointmentClick={actions.handleAppointmentClick}
                    onTimeSlotClick={actions.handleTimeSlotClick}
                    onAppointmentReschedule={actions.handleAppointmentReschedule}
                    onEditAppointment={actions.handleEditAppointment}
                    onDeleteAppointment={actions.handleDeleteAppointment}
                    selectionMode={isSelectionMode}
                    selectedIds={selectedIds}
                    onToggleSelection={toggleSelection}
                    rescheduleSuccessMessage={modals.rescheduleSuccessMessage}
                    onCreateAppointment={actions.handleCreateAppointment}
                    onToggleSelectionMode={toggleSelectionMode}
                    onCancelAllToday={() => modals.setShowCancelAllTodayDialog(true)}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={clearFilters}
                    totalAppointmentsCount={appointments.length}
                    patientFilter={patientFilter}
                    onPatientFilterChange={setPatientFilter}
                  />
                )}
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

        {/* Modals Layer - Lazy loaded for better performance */}
        {modals.quickEditAppointment && (
          <Suspense fallback={null}>
            <AppointmentQuickEditModal
              appointment={modals.quickEditAppointment}
              open={!!modals.quickEditAppointment}
              onOpenChange={(open) => !open && modals.setQuickEditAppointment(null)}
            />
          </Suspense>
        )}

        {modals.isModalOpen && (
          <Suspense fallback={null}>
            <AppointmentModal
              isOpen={modals.isModalOpen}
              onClose={() => {
                actions.handleModalClose();
              }}
              appointment={modals.selectedAppointment}
              defaultDate={modals.modalDefaultDate}
              defaultTime={modals.modalDefaultTime}
              defaultPatientId={modals.scheduleFromWaitlist?.patientId}
              mode={modals.selectedAppointment ? 'edit' : 'create'}
            />
          </Suspense>
        )}

        {modals.waitlistQuickAdd && (
          <Suspense fallback={null}>
            <WaitlistQuickAdd
              open={!!modals.waitlistQuickAdd}
              onOpenChange={(open) => !open && modals.setWaitlistQuickAdd(null)}
              date={modals.waitlistQuickAdd.date}
              time={modals.waitlistQuickAdd.time}
            />
          </Suspense>
        )}

        <KeyboardShortcuts
          open={modals.showKeyboardShortcuts}
          onOpenChange={modals.setShowKeyboardShortcuts}
        />

        <AlertDialog open={modals.showCancelAllTodayDialog} onOpenChange={modals.setShowCancelAllTodayDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar todos os agendamentos</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja cancelar todos os agendamentos de <strong>{formatDateToBrazilian(currentDate)}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={modals.isCancellingAllToday}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  actions.handleCancelAllToday();
                }}
                disabled={modals.isCancellingAllToday}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {modals.isCancellingAllToday ? 'Cancelando…' : 'Cancelar todos'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </MainLayout>
  );
};

export default Schedule;