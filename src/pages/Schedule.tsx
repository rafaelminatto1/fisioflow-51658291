import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModalRefactored as AppointmentModal } from '@/components/schedule/AppointmentModalRefactored';
import { AppointmentQuickEditModal } from '@/components/schedule/AppointmentQuickEditModal';
import { AppointmentListView } from '@/components/schedule/AppointmentListView';
import { AppointmentSearch } from '@/components/schedule/AppointmentSearch';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistQuickViewModal } from '@/components/schedule/WaitlistQuickViewModal';
import { useAppointments, useCreateAppointment, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Calendar, Users, Plus, Settings as SettingsIcon } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/ui';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { formatDateToLocalISO, formatDateToBrazilian } from '@/utils/dateUtils';

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

  const { data: appointments = [], isLoading: loading, error, refetch, isFromCache, cacheTimestamp } = useAppointments();
  const createAppointmentMutation = useCreateAppointment();
  const { mutateAsync: rescheduleAppointment, isPending: isRescheduling } = useRescheduleAppointment();
  const { totalInWaitlist } = useWaitlistMatch();

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
    await refetch();
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

  // Handlers
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setQuickEditAppointment(appointment);
  }, []);

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
    } catch (error) {
      toast({ title: '❌ Erro ao excluir', description: 'Não foi possível excluir o agendamento.', variant: 'destructive' });
    }
  }, [refetch]);

  if (error) {
    logger.error('Erro na página Schedule', { error }, 'Schedule');
    return (
      <MainLayout>
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao carregar agendamentos"
          description={error.message || 'Não foi possível carregar os agendamentos'}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 animate-fade-in relative min-h-[calc(100vh-80px)]">
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
        />

        {/* Header - Mobile Optimized */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-3 shrink-0">
          <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
            <div className="p-1.5 xs:p-2 bg-gradient-primary rounded-lg shadow-sm flex-shrink-0">
              <Calendar className="h-4 w-4 xs:h-5 xs:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg xs:text-xl sm:text-2xl font-bold tracking-tight truncate">Agenda</h1>
              <p className="text-[10px] xs:text-xs text-muted-foreground">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 xs:gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
            <AppointmentSearch value={searchTerm} onChange={setSearchTerm} onClear={() => setSearchTerm('')} />

            <Link to="/schedule/settings">
              <Button variant="ghost" size="sm" className="h-11 w-11 xs:h-11 xs:w-11 p-0 touch-target flex-shrink-0">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>

            <Button onClick={() => setShowWaitlistModal(true)} variant="outline" size="sm" className="h-11 xs:h-11 gap-2 touch-target flex-shrink-0 min-w-[44px]">
              {totalInWaitlist > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">{totalInWaitlist}</span>}
              <Users className="h-4 w-4" />
              <span className="hidden xs:inline text-xs">Lista</span>
            </Button>

            <Button onClick={handleCreateAppointment} size="sm" className="h-11 xs:h-11 shadow-sm bg-primary hover:bg-primary/90 text-white touch-target flex-shrink-0 min-w-[44px]">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline text-xs ml-1">Novo</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          <div className="h-full border rounded-xl bg-background shadow-sm relative flex flex-col">
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
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
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
                  isRescheduling={isRescheduling}
                  onEditAppointment={handleEditAppointment}
                  onDeleteAppointment={handleDeleteAppointment}
                />
              </Suspense>
            )}
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
          onSchedulePatient={(patientId, patientName) => {
            setScheduleFromWaitlist({ patientId, patientName });
            setShowWaitlistModal(false);
            setSelectedAppointment(null);
            setModalDefaultDate(currentDate);
            setIsModalOpen(true);
          }}
        />
      </div>
    </MainLayout>
  );
};

export default Schedule;
