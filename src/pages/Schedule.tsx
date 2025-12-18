import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppointmentFilters } from '@/components/schedule/AppointmentFilters';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModal } from '@/components/schedule/AppointmentModal';
import { AppointmentQuickEditModal } from '@/components/schedule/AppointmentQuickEditModal';
import { AppointmentListView } from '@/components/schedule/AppointmentListView';
import { MiniCalendar } from '@/components/schedule/MiniCalendar';
import { AppointmentSearch } from '@/components/schedule/AppointmentSearch';
import { AdvancedFilters } from '@/components/schedule/AdvancedFilters';
import { QuickStats } from '@/components/schedule/QuickStats';
import { WaitlistQuickAdd } from '@/components/schedule/WaitlistQuickAdd';
import { WaitlistNotification } from '@/components/schedule/WaitlistNotification';
import { WaitlistQuickViewModal } from '@/components/schedule/WaitlistQuickViewModal';
import { useAppointments, useCreateAppointment, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Calendar, Clock, Users, TrendingUp, Plus, Settings as SettingsIcon, Bell } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ScheduleStatsCard } from '@/components/schedule/ScheduleStatsCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Lazy load CalendarView for better initial load performance
const CalendarView = lazy(() => import('@/components/schedule/CalendarView').then(mod => ({ default: mod.CalendarView })));

// Define FilterType interface
interface FilterType {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  service: string;
}

const Schedule = () => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [quickEditAppointment, setQuickEditAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType | 'list'>('week');
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    service: ''
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    status: [] as string[],
    types: [] as string[],
    therapists: [] as string[],
  });
  
  // Waitlist state
  const [waitlistQuickAdd, setWaitlistQuickAdd] = useState<{ date: Date; time: string } | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [scheduleFromWaitlist, setScheduleFromWaitlist] = useState<{ patientId: string; patientName: string } | null>(null);

  const { data: appointments = [], isLoading: loading, error, refetch } = useAppointments();
  const createAppointmentMutation = useCreateAppointment();
  const { mutateAsync: rescheduleAppointment, isPending: isRescheduling } = useRescheduleAppointment();
  const { totalInWaitlist } = useWaitlistMatch();
  
  // Datas com agendamentos para o mini calendário
  const appointmentDates = React.useMemo(() => {
    return appointments.map(apt => 
      typeof apt.date === 'string' ? new Date(apt.date) : apt.date
    );
  }, [appointments]);

  const handleRefresh = async () => {
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
      // Basic filters
      if (filters.search && !appointment.patientName.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.status && appointment.status !== filters.status) {
        return false;
      }
      if (filters.service && appointment.type !== filters.service) {
        return false;
      }
      if (filters.dateFrom) {
        const appointmentDate = appointment.date instanceof Date ? 
          appointment.date.toISOString().split('T')[0] : 
          appointment.date;
        if (appointmentDate < filters.dateFrom) {
          return false;
        }
      }
      if (filters.dateTo) {
        const appointmentDate = appointment.date instanceof Date ? 
          appointment.date.toISOString().split('T')[0] : 
          appointment.date;
        if (appointmentDate > filters.dateTo) {
          return false;
        }
      }
      
      // Advanced filters
      if (advancedFilters.status.length > 0 && !advancedFilters.status.includes(appointment.status)) {
        return false;
      }
      if (advancedFilters.types.length > 0 && !advancedFilters.types.includes(appointment.type)) {
        return false;
      }
      
      return true;
    });
  }, [appointments, filters, advancedFilters]);

  const services = useMemo(() => {
    return Array.from(new Set(appointments.map(apt => apt.type))) as string[];
  }, [appointments]);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    // Open quick edit modal instead of the full modal
    setQuickEditAppointment(appointment);
  }, []);

  const handleCreateAppointment = useCallback(() => {
    setSelectedAppointment(null);
    setModalDefaultDate(undefined);
    setModalDefaultTime(undefined);
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
      await rescheduleAppointment({
        appointmentId: appointment.id,
        appointment_date: format(newDate, 'yyyy-MM-dd'),
        appointment_time: newTime,
        duration: appointment.duration
      });
      toast({
        title: '✅ Reagendado com sucesso',
        description: `Atendimento de ${appointment.patientName} movido para ${format(newDate, 'dd/MM/yyyy')} às ${newTime}.`,
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
      
      toast({
        title: '✅ Agendamento excluído',
        description: `Agendamento de ${appointment.patientName} foi excluído.`,
      });
      refetch();
    } catch (error) {
      toast({
        title: '❌ Erro ao excluir',
        description: 'Não foi possível excluir o agendamento.',
        variant: 'destructive'
      });
    }
  }, [refetch]);

  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      service: ''
    });
    setAdvancedFilters({
      status: [],
      types: [],
      therapists: []
    });
  }, []);

  const createTestAppointments = async () => {
    try {
      const today = new Date();
      const statuses = ['agendado', 'confirmado', 'aguardando_confirmacao', 'em_andamento', 'em_espera', 'atrasado', 'concluido', 'remarcado', 'cancelado', 'falta'] as const;
      const types = ['Fisioterapia', 'Consulta Inicial', 'Reavaliação', 'Pilates Clínico', 'RPG', 'Terapia Manual', 'Dry Needling'] as const;
      
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
          notes: `Agendamento de teste - ${statuses[i % statuses.length]}`
        });
      }
      
      toast({ 
        title: '✅ Sucesso', 
        description: '10 agendamentos de teste criados com diferentes status!' 
      });
    } catch (error) {
      console.error('Erro ao criar agendamentos de teste:', error);
      toast({ 
        title: '❌ Erro', 
        description: 'Não foi possível criar os agendamentos de teste.', 
        variant: 'destructive' 
      });
    }
  };

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
      <div className="space-y-4 animate-fade-in">
        {/* Header compacto */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Agenda</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/schedule/settings">
              <Button variant="ghost" size="sm" className="h-8">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              onClick={handleCreateAppointment}
              size="sm"
              className="h-8 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>
        </div>

        {/* Stats compactos em linha */}
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-foreground">{stats.totalToday}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Hoje</div>
          </div>
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-success">{stats.confirmedToday}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Confirmados</div>
          </div>
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-secondary">{stats.completedToday}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Concluídos</div>
          </div>
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-warning">{stats.pendingToday}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendentes</div>
          </div>
          <button 
            onClick={() => setShowWaitlistModal(true)}
            className="bg-card border rounded-lg p-2.5 text-center hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
              {totalInWaitlist}
              {totalInWaitlist > 0 && <Users className="h-4 w-4" />}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Lista Espera</div>
          </button>
        </div>

        {/* View Selector + Search integrado */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* View tabs */}
          <div className="flex bg-muted/50 p-1 rounded-lg">
            {(['list', 'day', 'week', 'month'] as const).map(type => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  viewType === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type === 'list' ? 'Lista' : 
                 type === 'day' ? 'Dia' : 
                 type === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
          
          {/* Search */}
          <div className="flex-1">
            <AppointmentSearch
              value={filters.search}
              onChange={(value) => setFilters({ ...filters, search: value })}
              onClear={() => setFilters({ ...filters, search: '' })}
            />
          </div>
          
          <AdvancedFilters
            filters={advancedFilters}
            onChange={setAdvancedFilters}
            onClear={() => setAdvancedFilters({ status: [], types: [], therapists: [] })}
          />
        </div>

        {/* Results Summary compacto */}
        {(filters.search || filters.status || filters.service || advancedFilters.status.length > 0) && (
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-xs">
            <span className="text-muted-foreground">
              <Badge variant="secondary" className="mr-2">{filteredAppointments.length}</Badge>
              resultado{filteredAppointments.length !== 1 ? 's' : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 text-xs">
              Limpar
            </Button>
          </div>
        )}

        {/* Calendar/List View */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
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
                <div className="text-center space-y-2">
                  <div className="h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-muted-foreground">Carregando...</p>
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
                isRescheduling={isRescheduling}
                onEditAppointment={handleEditAppointment}
                onDeleteAppointment={handleDeleteAppointment}
              />
            </Suspense>
          )}
        </div>

        {/* Quick Edit Modal - opens when clicking on appointment cards */}
        <AppointmentQuickEditModal
          appointment={quickEditAppointment}
          open={!!quickEditAppointment}
          onOpenChange={(open) => !open && setQuickEditAppointment(null)}
        />

        {/* Appointment Modal for creating new appointments */}
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

        {/* Waitlist Quick Add Modal */}
        {waitlistQuickAdd && (
          <WaitlistQuickAdd
            open={!!waitlistQuickAdd}
            onOpenChange={(open) => !open && setWaitlistQuickAdd(null)}
            date={waitlistQuickAdd.date}
            time={waitlistQuickAdd.time}
          />
        )}

        {/* Waitlist Quick View Modal */}
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