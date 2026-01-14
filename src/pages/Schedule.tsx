import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModalRefactored as AppointmentModal } from '@/components/schedule/AppointmentModalRefactored';
import { AppointmentQuickEditModal } from '@/components/schedule/AppointmentQuickEditModal';
import { AppointmentListView } from '@/components/schedule/AppointmentListView';
import { AppointmentSearch } from '@/components/schedule/AppointmentSearch';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistQuickViewModal } from '@/components/schedule/WaitlistQuickViewModal';
import { ScheduleHero } from '@/components/schedule/ScheduleHero';
import { KeyboardShortcuts } from '@/components/schedule/KeyboardShortcuts';
import { useAppointments, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Users, Plus, Settings as SettingsIcon, RefreshCw, Keyboard, Calendar, TrendingUp, Clock } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/ui';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { formatDateToLocalISO, formatDateToBrazilian } from '@/utils/dateUtils';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Lazy load CalendarView for better initial load performance
const CalendarView = lazy(() => import('@/components/schedule/CalendarView').then(mod => ({ default: mod.CalendarView })));

const Schedule = () => {
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

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Waitlist state
  const [waitlistQuickAdd, setWaitlistQuickAdd] = useState<{ date: Date; time: string } | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [scheduleFromWaitlist, setScheduleFromWaitlist] = useState<{ patientId: string; patientName: string } | null>(null);

  // Keyboard shortcuts modal
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const { data: appointments = [], isLoading: loading, error, refetch, isFromCache, cacheTimestamp } = useAppointments();
  const { mutateAsync: rescheduleAppointment } = useRescheduleAppointment();
  const { totalInWaitlist, isWaitlistFromCache, waitlistCacheTimestamp } = useWaitlistMatch();

  // Connection status for offline handling
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

  const handleRefresh = async () => {
    await checkConnection();
    await refetch({ cancelRefetch: false });
  };

  useEffect(() => {
    logger.info('Página Schedule carregada', {
      appointmentsCount: appointments.length,
      loading
    }, 'Schedule');
  }, [appointments.length, loading]);

  // Filter appointments by search term
  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    return appointments.filter(appointment =>
      appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [appointments, searchTerm]);

  // Calculate enhanced stats for the dashboard
  const enhancedStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const todayAppointments = filteredAppointments.filter(apt => {
      try {
        const aptDate = typeof apt.appointmentDate === 'string'
          ? parseISO(apt.appointmentDate)
          : apt.appointmentDate;
        return aptDate >= todayStart && aptDate <= todayEnd;
      } catch {
        return false;
      }
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

    // Find next appointment
    const nextAppointment = todayAppointments
      .filter(apt => {
        try {
          const aptDate = typeof apt.appointmentDate === 'string'
            ? parseISO(apt.appointmentDate)
            : apt.appointmentDate;
          const [hours, minutes] = apt.appointmentTime.split(':').map(Number);
          const aptDateTime = new Date(aptDate);
          aptDateTime.setHours(hours, minutes, 0, 0);
          return aptDateTime > now;
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))[0];

    // Week stats
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekAppointments = filteredAppointments.filter(apt => {
      try {
        const aptDate = typeof apt.appointmentDate === 'string'
          ? parseISO(apt.appointmentDate)
          : apt.appointmentDate;
        return aptDate >= weekStart && aptDate <= weekEnd;
      } catch {
        return false;
      }
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

  // Handlers - Define ALL handlers before the useEffect that uses them
  const handleCreateAppointment = useCallback(() => {
    setSelectedAppointment(null);

    const now = new Date();
    setModalDefaultDate(now);

    const currentMinutes = now.getMinutes();
    const roundedMinutes = currentMinutes < 30 ? 30 : 0;
    let nextHour = currentMinutes < 30 ? now.getHours() : now.getHours() + 1;

    if (nextHour >= 21) {
      nextHour = 8;
    } else if (nextHour < 7) {
      nextHour = 8;
    }

    const nextTime = `${String(nextHour).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
    setModalDefaultTime(nextTime);

    setIsModalOpen(true);
  }, []);

  const handleTimeSlotClick = useCallback((date: Date, time: string) => {
    setSelectedAppointment(null);
    setModalDefaultDate(date);
    setModalDefaultTime(time);
    setIsModalOpen(true);
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
    } catch (error) {
      toast({
        title: '❌ Erro ao reagendar',
        description: 'Não foi possível reagendar o atendimento.',
        variant: 'destructive'
      });
      throw error;
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
      toast({ title: '✅ Agendamento excluído', description: `Agendamento de ${appointment.patientName} foi excluído.` });
      refetch();
    } catch {
      toast({ title: '❌ Erro ao excluir', description: 'Não foi possível excluir o agendamento.', variant: 'destructive' });
    }
  }, [refetch]);

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setQuickEditAppointment(appointment);
  }, []);

  // Keyboard shortcuts - must come AFTER all handlers are defined
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((isModalOpen || showKeyboardShortcuts || showWaitlistModal || quickEditAppointment) && e.key !== 'Escape') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          handleCreateAppointment();
          break;
        case 'f': {
          e.preventDefault();
          const searchInput = document.querySelector('input[aria-label="Buscar agendamentos por nome do paciente"]') as HTMLInputElement;
          searchInput?.focus();
          break;
        }
        case 'd':
          e.preventDefault();
          setViewType('day');
          break;
        case 'w':
          e.preventDefault();
          setViewType('week');
          break;
        case 'm':
          e.preventDefault();
          setViewType('month');
          break;
        case 't':
          e.preventDefault();
          setCurrentDate(new Date());
          break;
        case 'arrowleft':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() - 1);
            setCurrentDate(newDate);
          }
          break;
        case 'arrowright':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 1);
            setCurrentDate(newDate);
          }
          break;
        case '/':
        case '?':
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

        {/* Hero Section with enhanced stats */}
        <ScheduleHero
          currentDate={currentDate}
          appointments={filteredAppointments}
          className="shrink-0"
        />

        {/* Enhanced Stats Dashboard Cards - Modern Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 shrink-0">
          {/* Today's Total */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Hoje</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{enhancedStats.total}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">agendamentos</p>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-500 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Completados</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{enhancedStats.completed}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">sessões realizadas</p>
            </CardContent>
          </Card>

          {/* Confirmed */}
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 border-violet-200 dark:border-violet-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-violet-500 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">Confirmados</span>
              </div>
              <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{enhancedStats.confirmed}</p>
              <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">aguardando</p>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <Clock className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Pendentes</span>
              </div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{enhancedStats.pending}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">sem confirmação</p>
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/30 dark:to-cyan-900/30 border-cyan-200 dark:border-cyan-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-cyan-500 rounded-lg">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Taxa</span>
              </div>
              <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{enhancedStats.completionRate}%</p>
              <Progress value={enhancedStats.completionRate} className="h-1.5 mt-2 bg-cyan-200/50" />
              <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">conclusão</p>
            </CardContent>
          </Card>

          {/* Week Total */}
          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/30 border-rose-200 dark:border-rose-800 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-rose-500 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Semana</span>
              </div>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{enhancedStats.weekTotal}</p>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">esta semana</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Appointment Card - If available */}
        {enhancedStats.nextAppointment && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-full">
                    <Clock className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Próximo Atendimento</p>
                    <p className="text-xs text-muted-foreground">
                      {enhancedStats.nextAppointment.patientName} às {enhancedStats.nextAppointment.appointmentTime}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  Em breve
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Bar - Modern Floating Design */}
        <Card className="border-2 border-border/50 shadow-lg shrink-0">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-0">
                <AppointmentSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onClear={() => setSearchTerm('')}
                  className="w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  variant="outline"
                  size="sm"
                  className="h-10 px-3 touch-target hidden sm:flex"
                  aria-label="Atalhos de teclado"
                  title="Pressione / para abrir"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>

                <Link to="/schedule/settings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 touch-target"
                    aria-label="Configurações da agenda"
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  onClick={() => setShowWaitlistModal(true)}
                  variant="outline"
                  size="sm"
                  className="h-10 px-3 touch-target gap-2 min-w-[100px]"
                  aria-label={`Lista de espera - ${totalInWaitlist} pacientes`}
                >
                  <div className="relative">
                    <Users className="h-4 w-4" />
                    {totalInWaitlist > 0 && (
                      <span className="absolute -top-2 -right-2 h-4 w-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
                        {totalInWaitlist > 9 ? '9+' : totalInWaitlist}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:inline text-xs">Lista</span>
                </Button>

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="h-10 px-3 touch-target"
                  aria-label="Atualizar agendamentos"
                  title="Forçar atualização"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>

                <Button
                  onClick={handleCreateAppointment}
                  size="sm"
                  className="h-10 px-4 shadow-md bg-primary hover:bg-primary/90 touch-target gap-2"
                  aria-label="Novo agendamento"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-medium">Novo</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Enhanced Calendar Container */}
        <div className="flex-1 min-h-0">
          <Card className="h-full border-2 border-border/50 shadow-xl">
            <CardHeader className="p-4 border-b bg-gradient-to-r from-muted/30 to-muted/10">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-73px)] overflow-hidden">
              {viewType === 'list' ? (
                <AppointmentListView
                  appointments={filteredAppointments}
                  selectedDate={currentDate}
                  onAppointmentClick={handleAppointmentClick}
                  onRefresh={handleRefresh}
                />
              ) : (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
                      <p className="text-sm text-muted-foreground">Carregando calendário...</p>
                    </div>
                  </div>
                }>
                  <CalendarView
                    appointments={filteredAppointments}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    viewType={viewType as CalendarViewType}
                    onViewTypeChange={(type) => setViewType(type)}
                    onAppointmentClick={handleAppointmentClick}
                    onTimeSlotClick={handleTimeSlotClick}
                    onAppointmentReschedule={handleAppointmentReschedule}
                    onEditAppointment={handleEditAppointment}
                    onDeleteAppointment={handleDeleteAppointment}
                  />
                </Suspense>
              )}
            </CardContent>
          </Card>
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
          onSchedulePatient={(patientId, patientName) => {
            setScheduleFromWaitlist({ patientId, patientName });
            setShowWaitlistModal(false);
            setSelectedAppointment(null);
            setModalDefaultDate(currentDate);
            setIsModalOpen(true);
          }}
        />

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcuts
          open={showKeyboardShortcuts}
          onOpenChange={setShowKeyboardShortcuts}
        />
      </div>
    </MainLayout>
  );
};

export default Schedule;
