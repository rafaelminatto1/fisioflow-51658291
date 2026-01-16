import { memo, useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModalRefactored as AppointmentModal } from '@/components/schedule/AppointmentModalRefactored';
import { AppointmentSearch } from '@/components/schedule/AppointmentSearch';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistQuickViewModal } from '@/components/schedule/WaitlistQuickViewModal';
import { ScheduleHeaderRefactored } from '@/components/schedule/ScheduleHeaderRefactored';
import { KeyboardShortcuts } from '@/components/schedule/KeyboardShortcuts';
import { useAppointments, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Plus, Settings as SettingsIcon, RefreshCw, Keyboard, ChevronLeft, ChevronRight, CalendarDays, Users, Clock } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/ui';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { formatDateToLocalISO, formatDateToBrazilian } from '@/utils/dateUtils';
import { format, startOfDay, endOfDay, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
// TYPES
// =====================================================================

interface ScheduleStats {
  total: number;
  completed: number;
  confirmed: number;
  pending: number;
  completionRate: number;
  nextAppointment: Appointment | null;
  weekTotal: number;
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

const safeParseDate = (date: string | Date): Date | null => {
  try {
    return typeof date === 'string' ? parseISO(date) : date;
  } catch {
    return null;
  }
};

const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

const getTimeUntilAppointment = (appointment: Appointment): number | null => {
  try {
    const aptDate = safeParseDate(appointment.appointmentDate);
    if (!aptDate) return null;

    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
    const aptDateTime = new Date(aptDate);
    aptDateTime.setHours(hours, minutes, 0, 0);

    return differenceInMinutes(aptDateTime, new Date());
  } catch {
    return null;
  }
};

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

const ScheduleRefactored = () => {
  // ===================================================================
  // STATE
  // ===================================================================

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());

  const [viewType, setViewType] = useState<CalendarViewType>(() => 'week');

  const [searchTerm, setSearchTerm] = useState('');
  const [waitlistQuickAdd, setWaitlistQuickAdd] = useState<{ date: Date; time: string } | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [scheduleFromWaitlist, setScheduleFromWaitlist] = useState<{ patientId: string; patientName: string } | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // ===================================================================
  // HOOKS
  // ===================================================================

  const { data: appointments = [], isLoading: loading, error, refetch, isFromCache, cacheTimestamp } = useAppointments();
  const { mutateAsync: rescheduleAppointment } = useRescheduleAppointment();
  const { totalInWaitlist } = useWaitlistMatch();

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

  const filteredAppointments = useMemo(() => {
    if (!searchTerm.trim()) return appointments;
    const term = searchTerm.toLowerCase();
    return appointments.filter(appointment =>
      appointment.patientName.toLowerCase().includes(term)
    );
  }, [appointments, searchTerm]);

  const enhancedStats: ScheduleStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const todayAppointments = filteredAppointments.filter(apt => {
      const aptDate = safeParseDate(apt.appointmentDate);
      return aptDate && isDateInRange(aptDate, todayStart, todayEnd);
    });

    const completed = todayAppointments.filter(
      apt => apt.status === 'completed' || apt.status === 'concluido'
    ).length;

    const confirmed = todayAppointments.filter(
      apt => apt.status === 'confirmed' || apt.status === 'confirmado'
    ).length;

    const pending = todayAppointments.filter(
      apt => apt.status === 'scheduled' || apt.status === 'agendado'
    ).length;

    const total = todayAppointments.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const nextAppointment = todayAppointments
      .filter(apt => {
        const timeUntil = getTimeUntilAppointment(apt);
        return timeUntil !== null && timeUntil > 0;
      })
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))[0] || null;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekAppointments = filteredAppointments.filter(apt => {
      const aptDate = safeParseDate(apt.appointmentDate);
      return aptDate && isDateInRange(aptDate, weekStart, weekEnd);
    });

    return {
      total,
      completed,
      confirmed,
      pending,
      completionRate,
      nextAppointment,
      weekTotal: weekAppointments.length
    };
  }, [filteredAppointments]);

  const formattedMonth = useMemo(() => {
    const month = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    return month.charAt(0).toUpperCase() + month.slice(1);
  }, [currentDate]);

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
    setSelectedAppointment(null);
    setModalDefaultDate(date);
    setModalDefaultTime(time);
    setIsModalOpen(true);
  }, []);

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

  const handleScheduleFromWaitlist = useCallback((patientId: string, patientName: string) => {
    setScheduleFromWaitlist({ patientId, patientName });
    setShowWaitlistModal(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isModalActive = isModalOpen || showKeyboardShortcuts || showWaitlistModal;
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
    showWaitlistModal,
    quickEditAppointment,
    handleCreateAppointment
  ]);

  // ===================================================================
  // RENDER
  // ===================================================================

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
    <MainLayout fullWidth showBreadcrumbs={false}>
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">

        {/* Offline/Cache Warning Banner */}
        <OfflineIndicator
          isFromCache={isFromCache}
          isOnline={isOnline}
          isChecking={isChecking}
          isReconnecting={isReconnecting}
          cacheTimestamp={cacheTimestamp}
          itemCount={appointments.length}
          itemLabel="agendamentos"
          onRefresh={handleRefresh}
          className="shrink-0"
        />

        {/* Compact Header with Stats */}
        <div className="shrink-0 bg-white border-b border-slate-200">
          <div className="max-w-[1920px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Title & Quick Stats */}
              <div className="flex items-center gap-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarDays className="w-6 h-6 text-blue-600" />
                    Agenda
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formattedMonth}
                  </p>
                </div>

                {/* Quick Stats Pills */}
                <div className="hidden lg:flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-blue-900">{enhancedStats.total}</span>
                      <span className="text-[10px] text-blue-600">Hoje</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-900">{enhancedStats.weekTotal}</span>
                      <span className="text-[10px] text-emerald-600">Semana</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <Link to="/schedule/settings">
                  <Button variant="ghost" size="sm" className="text-slate-600">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Configurações
                  </Button>
                </Link>
                <Button
                  onClick={handleCreateAppointment}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Agendamento
                </Button>
              </div>
            </div>

            {/* Date Navigation & View Selector */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Hoje
                </Button>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setCurrentDate(date => {
                    const newDate = new Date(date);
                    newDate.setDate(newDate.getDate() - 7);
                    return newDate;
                  })} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setCurrentDate(date => {
                    const newDate = new Date(date);
                    newDate.setDate(newDate.getDate() + 7);
                    return newDate;
                  })} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* View Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {(['day', 'week', 'month'] as CalendarViewType[]).map((view) => (
                    <Button
                      key={view}
                      size="sm"
                      variant={viewType === view ? 'default' : 'ghost'}
                      onClick={() => setViewType(view)}
                      className="h-7 text-xs capitalize"
                    >
                      {view === 'day' ? 'Dia' : view === 'week' ? 'Semana' : 'Mês'}
                    </Button>
                  ))}
                </div>
              </div>

              <AppointmentSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                resultsCount={filteredAppointments.length}
              />
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 overflow-hidden bg-white">
          <div className="h-full max-w-[1920px] mx-auto">
            <Suspense fallback={<LoadingSkeleton type="card" rows={3} className="h-full w-full" />}>
              <CalendarView
                appointments={filteredAppointments}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                viewType={viewType as CalendarViewType}
                onViewTypeChange={handleViewTypeChange}
                onTimeSlotClick={handleTimeSlotClick}
                onAppointmentReschedule={handleAppointmentReschedule}
                onEditAppointment={handleEditAppointment}
                onDeleteAppointment={handleDeleteAppointment}
              />
            </Suspense>
          </div>
        </div>

        {/* Modals */}
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

        <WaitlistQuickViewModal
          open={showWaitlistModal}
          onOpenChange={setShowWaitlistModal}
          onSchedulePatient={handleScheduleFromWaitlist}
        />

        <KeyboardShortcuts
          open={showKeyboardShortcuts}
          onOpenChange={setShowKeyboardShortcuts}
        />
      </div>
    </MainLayout>
  );
};

export default ScheduleRefactored;
