import { memo, useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModalRefactored as AppointmentModal } from '@/components/schedule/AppointmentModalRefactored';
import { AppointmentQuickEditModal } from '@/components/schedule/AppointmentQuickEditModal';
import { AppointmentListView } from '@/components/schedule/AppointmentListView';
import { AppointmentSearch } from '@/components/schedule/AppointmentSearch';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistQuickViewModal } from '@/components/schedule/WaitlistQuickViewModal';
import { ScheduleHeader } from '@/components/schedule/ScheduleHeader';
import { KeyboardShortcuts } from '@/components/schedule/KeyboardShortcuts';
import { useAppointments, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Users, Plus, Settings as SettingsIcon, RefreshCw, Keyboard, Calendar, TrendingUp, Clock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/ui';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

/**
 * Safely parses an appointment date string or Date object
 * @param date - Date string or Date object to parse
 * @returns Parsed Date or null if parsing fails
 */
const safeParseDate = (date: string | Date): Date | null => {
  try {
    return typeof date === 'string' ? parseISO(date) : date;
  } catch {
    return null;
  }
};

/**
 * Checks if a date is within the specified range
 * @param date - Date to check
 * @param start - Start of range
 * @param end - End of range
 * @returns True if date is within range
 */
const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

/**
 * Calculates the time until the next appointment in minutes
 * @param appointment - Appointment to check
 * @returns Minutes until appointment or null if invalid
 */
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

/**
 * Rounds time to nearest business hour slot
 * @param date - Date to round
 * @returns Rounded time string in HH:MM format
 */
const roundToNextSlot = (date: Date): string => {
  const minutes = date.getMinutes();
  const roundedMinutes = minutes < BUSINESS_HOURS.defaultRound ? BUSINESS_HOURS.defaultRound : 0;
  let hour = minutes < BUSINESS_HOURS.defaultRound ? date.getHours() : date.getHours() + 1;

  // Adjust to business hours
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

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [quickEditAppointment, setQuickEditAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Detect mobile and default to day view on mobile
  const [viewType, setViewType] = useState<CalendarViewType | 'list'>(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? 'day' : 'week';
  });

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

    // Filter today's appointments
    const todayAppointments = filteredAppointments.filter(apt => {
      const aptDate = safeParseDate(apt.appointmentDate);
      return aptDate && isDateInRange(aptDate, todayStart, todayEnd);
    });

    // Calculate status counts
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

    // Find next upcoming appointment
    const nextAppointment = todayAppointments
      .filter(apt => {
        const timeUntil = getTimeUntilAppointment(apt);
        return timeUntil !== null && timeUntil > 0;
      })
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))[0] || null;

    // Calculate week stats (Monday to Sunday)
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

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setQuickEditAppointment(appointment);
  }, []);

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

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Don't trigger if modal is open (except for Escape)
      const isModalActive = isModalOpen || showKeyboardShortcuts || showWaitlistModal || quickEditAppointment;
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
      <div className="flex flex-col gap-4 md:gap-6 animate-fade-in relative min-h-[calc(100vh-80px)] p-4 md:p-6">

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

        {/* Schedule Header (New Clinic Overview) */}
        <div className="relative z-10">
          <Link to="/schedule/settings" className="absolute top-8 right-8 z-50">
            <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </Link>
          <ScheduleHeader
            displayName="Dr. Rafael" // This could be dynamic from user profile
            consultasRestantes={enhancedStats.pending}
            completedCount={enhancedStats.completed}
            totalCount={enhancedStats.total}
            confirmationRate={enhancedStats.completionRate}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
          {/* Main Calendar - Full Width now */}
          <div className="flex-1 min-h-0 flex flex-col h-full bg-transparent">
            {/* Action Bar (Search/New) */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-gray-400 hover:text-white">
                  Hoje
                </Button>
                <div className="h-4 w-px bg-gray-700 mx-2"></div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => setCurrentDate(date => addDays(date, -7))} className="h-8 w-8 text-gray-400">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-white font-medium capitalize">{formattedMonth}</span>
                  <Button size="icon" variant="ghost" onClick={() => setCurrentDate(date => addDays(date, 7))} className="h-8 w-8 text-gray-400">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Selectors */}
                <div className="flex bg-dark-800 p-1 rounded-xl border border-gray-800">
                  <Button
                    size="sm"
                    variant={viewType === 'day' ? 'secondary' : 'ghost'}
                    onClick={() => setViewType('day')}
                    className="h-8 text-xs"
                  >
                    Dia
                  </Button>
                  <Button
                    size="sm"
                    variant={viewType === 'week' ? 'secondary' : 'ghost'}
                    onClick={() => setViewType('week')}
                    className="h-8 text-xs"
                  >
                    Semana
                  </Button>
                  <Button
                    size="sm"
                    variant={viewType === 'month' ? 'secondary' : 'ghost'}
                    onClick={() => setViewType('month')}
                    className="h-8 text-xs"
                  >
                    Mês
                  </Button>
                </div>

                <Button
                  onClick={handleCreateAppointment}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Agendamento
                </Button>
              </div>
            </div>

            {/* Calendar View */}
            <div className="flex-1 min-h-[600px] rounded-xl overflow-hidden shadow-2xl border border-gray-800/50">
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
                />
              </Suspense>
            </div>
          </div>
        </div>



        {/* Modals */}
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
          mode={selectedAppointment ? 'view' : 'create'}
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

export default Schedule;
