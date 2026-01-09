import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import * as SheetComponents from '@/components/ui/sheet';

const Sheet = SheetComponents.Sheet;
const SheetContent = SheetComponents.SheetContent;
const SheetTrigger = SheetComponents.SheetTrigger;

// #region agent log
console.log('[DEBUG] Sheet component imported:', Sheet);
// #endregion

import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModalRefactored as AppointmentModal } from '@/components/schedule/AppointmentModalRefactored';
import { AppointmentQuickEditModal } from '@/components/schedule/AppointmentQuickEditModal';
import { AppointmentListView } from '@/components/schedule/AppointmentListView';
import { AppointmentSearch } from '@/components/schedule/AppointmentSearch';
import { ScheduleSidebar, FilterState } from '@/components/schedule/ScheduleSidebar'; // Updated import
import { QuickStats } from '@/components/schedule/QuickStats';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistQuickViewModal } from '@/components/schedule/WaitlistQuickViewModal';
import { useAppointments, useCreateAppointment, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Calendar, Clock, Users, TrendingUp, Plus, Settings as SettingsIcon, Bell, Filter, WifiOff, RefreshCw } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { format, isAfter, parseISO, formatDistanceToNow } from 'date-fns';
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
  const [viewType, setViewType] = useState<CalendarViewType | 'list'>('week');

  // Consolidated Filter State
  const [filters, setFilters] = useState<FilterState>({
    therapists: [],
    rooms: [],
    services: []
  });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
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
    state: connectionState,
    checkConnection,
    tryReconnect
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

  // Combinar loading com checking
  const isLoadingOrChecking = loading || isChecking;

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

  // Memoized statistics calculation
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt =>
      apt.date instanceof Date ? apt.date.toISOString().split('T')[0] === today : apt.date === today
    );
    const confirmedToday = todayAppointments.filter(apt => apt.status === 'confirmado').length;
    const totalToday = todayAppointments.length;
    const completedToday = todayAppointments.filter(apt => apt.status === 'concluido').length;

    return {
      totalToday,
      confirmedToday,
      completedToday,
      pendingToday: totalToday - completedToday
    };
  }, [appointments]);

  // Filter appointments based on current filters
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      // Search
      if (searchTerm && !appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Date Range
      if (dateRange.from) {
        const appointmentDate = appointment.date instanceof Date ?
          appointment.date.toISOString().split('T')[0] :
          appointment.date;
        if (appointmentDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const appointmentDate = appointment.date instanceof Date ?
          appointment.date.toISOString().split('T')[0] :
          appointment.date;
        if (appointmentDate > dateRange.to) return false;
      }

      // Sidebar Filters
      if (filters.therapists.length > 0 && appointment.therapistId && !filters.therapists.includes(appointment.therapistId)) {
        return false;
      }
      if (filters.rooms.length > 0 && appointment.room && !filters.rooms.includes(appointment.room)) {
        return false;
      }
      if (filters.services.length > 0 && appointment.type && !filters.services.includes(appointment.type)) {
        return false;
      }

      return true;
    });
  }, [appointments, searchTerm, dateRange, filters]);

  // Upcoming appointments for sidebar
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(apt => {
        const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
        return isAfter(aptDate, now);
      })
      .sort((a, b) => {
        const dateA = typeof a.date === 'string' ? parseISO(a.date).getTime() : a.date.getTime();
        const dateB = typeof b.date === 'string' ? parseISO(b.date).getTime() : b.date.getTime();
        return dateA - dateB;
      })
      .slice(0, 5); // Take top 5
  }, [appointments]);

  // Available options for filters (dynamically derived)
  const filterOptions = useMemo(() => {
    const therapists = Array.from(new Set(appointments.map(a => a.therapistId).filter(Boolean))) as string[];
    const rooms = Array.from(new Set(appointments.map(a => a.room).filter(Boolean))) as string[];
    const services = Array.from(new Set(appointments.map(a => a.type).filter(Boolean))) as string[];

    // Fallbacks if empty (mock data for better UX if no data yet)
    return {
      therapists: therapists.length ? therapists : ['Dr. Ana', 'Dr. Paulo', 'Dra. Carla'],
      rooms: rooms.length ? rooms : ['Sala 1', 'Sala 2', 'Sala 3'],
      services: services.length ? services : ['Fisioterapia', 'Osteopatia', 'Pilates']
    };
  }, [appointments]);


  // Handlers
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setQuickEditAppointment(appointment);
  }, []);

  const handleCreateAppointment = useCallback(() => {
    setSelectedAppointment(null);

    // Set current date
    const now = new Date();
    setModalDefaultDate(now);

    // Calculate next available time slot (rounded up to next 30 min)
    const currentMinutes = now.getMinutes();
    const roundedMinutes = currentMinutes < 30 ? 30 : 0;
    let nextHour = currentMinutes < 30 ? now.getHours() : now.getHours() + 1;

    // If past working hours, default to next morning
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
      // DEBUG: Log all date values to trace the issue
      console.log('[DEBUG Reschedule] Input newDate:', newDate);
      console.log('[DEBUG Reschedule] newDate.toString():', newDate.toString());
      console.log('[DEBUG Reschedule] newDate.toISOString():', newDate.toISOString());
      console.log('[DEBUG Reschedule] newDate.getFullYear():', newDate.getFullYear());
      console.log('[DEBUG Reschedule] newDate.getMonth():', newDate.getMonth());
      console.log('[DEBUG Reschedule] newDate.getDate():', newDate.getDate());

      const formattedDate = formatDateToLocalISO(newDate);
      console.log('[DEBUG Reschedule] formatDateToLocalISO result:', formattedDate);

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

  const createTestAppointments = useCallback(async () => {
    try {
      const today = new Date();
      const statuses = ['agendado', 'confirmado', 'aguardando_confirmacao', 'em_andamento', 'em_espera', 'atrasado', 'concluido', 'remarcado', 'cancelado', 'falta'] as const;
      const types = ['Fisioterapia', 'Consulta Inicial', 'Reavaliação', 'Pilates Clínico', 'RPG', 'Terapia Manual', 'Dry Needling'] as const;
      const therapists = ['Dr. Ana', 'Dr. Paulo', 'Dra. Carla'];
      const rooms = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4'];

      // Buscar pacientes disponíveis
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name')
        .limit(5);

      if (patientsError || !patients || patients.length === 0) {
        toast({
          title: '❌ Erro',
          description: 'Nenhum paciente encontrado. Cadastre pacientes primeiro.',
          variant: 'destructive'
        });
        return;
      }

      toast({ title: 'Criando agendamentos...', description: 'Por favor, aguarde.' });

      // Criar 10 agendamentos diferentes
      for (let i = 0; i < 10; i++) {
        const dayOffset = Math.floor(i / 2);
        const appointmentDate = new Date(today);
        appointmentDate.setDate(today.getDate() + dayOffset);

        const hour = 9 + (i % 5);
        const time = `${hour.toString().padStart(2, '0')}:00`;

        await createAppointmentMutation.mutateAsync({
          patient_id: patients[i % patients.length].id,
          appointment_date: appointmentDate.toISOString().split('T')[0],
          appointment_time: time,
          duration: 60,
          type: types[i % types.length] as any,
          status: statuses[i % statuses.length] as any,
          notes: `Agendamento de teste - ${statuses[i % statuses.length]}`,
          therapist_id: therapists[i % therapists.length], // Mocking ID as name for now for UI demo
          room: rooms[i % rooms.length]
        } as any); // Casting as any to bypass partial type mismatches if strict types aren't fully aligned yet
      }

      toast({
        title: '✅ Sucesso',
        description: '10 agendamentos de teste criados com diferentes status!'
      });
      refetch(); // Refresh appointments after creating test data
    } catch (error) {
      logger.error('Erro ao criar agendamentos de teste', error, 'Schedule');
      toast({
        title: '❌ Erro',
        description: 'Não foi possível criar os agendamentos de teste.',
        variant: 'destructive'
      });
    }
  }, [createAppointmentMutation, refetch]);

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

        {/* Header compacto */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Agenda</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <AppointmentSearch value={searchTerm} onChange={setSearchTerm} onClear={() => setSearchTerm('')} />



            <Link to="/schedule/settings">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>

            <Button onClick={() => setShowWaitlistModal(true)} variant="outline" size="sm" className="h-9 gap-2">
              {totalInWaitlist > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">{totalInWaitlist}</span>}
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Lista de Espera</span>
            </Button>

            <Button onClick={handleCreateAppointment} size="sm" className="h-9 shadow-sm bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-1" />
              Novo Agendamento
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
                <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>
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