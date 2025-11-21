import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppointmentFilters } from '@/components/schedule/AppointmentFilters';
import { CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModal } from '@/components/schedule/AppointmentModal';
import { AppointmentListView } from '@/components/schedule/AppointmentListView';
import { MiniCalendar } from '@/components/schedule/MiniCalendar';
import { AppointmentSearch } from '@/components/schedule/AppointmentSearch';
import { AdvancedFilters } from '@/components/schedule/AdvancedFilters';
import { QuickStats } from '@/components/schedule/QuickStats';
import { useAppointments, useCreateAppointment } from '@/hooks/useAppointments';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Calendar, Clock, Users, TrendingUp, Plus, Settings as SettingsIcon } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ScheduleStatsCard } from '@/components/schedule/ScheduleStatsCard';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType | 'list'>('list');
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

  const { data: appointments = [], isLoading: loading, error, refetch } = useAppointments();
  const createAppointmentMutation = useCreateAppointment();
  
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
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
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
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header com melhor hierarquia visual e responsividade */}
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-gradient-primary rounded-xl shadow-medical hover-lift">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Agenda
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Gerencie seus agendamentos de forma eficiente
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/schedule/settings">
                <Button variant="outline" size="sm">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
              </Link>
              <Button
                onClick={createTestAppointments}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Criar Dados de Teste
              </Button>
              <Button 
                onClick={handleCreateAppointment}
                size="lg"
                className="w-full sm:w-auto shadow-medical hover:shadow-hover transition-all duration-300 hover-lift"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStats />

        {/* Statistics Cards - Melhorados e responsivos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-0 shadow-card overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-16 skeleton-shimmer rounded" />
                        <div className="h-10 w-10 skeleton-shimmer rounded-lg" />
                      </div>
                      <div className="h-8 w-12 skeleton-shimmer rounded" />
                      <div className="h-3 w-24 skeleton-shimmer rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <ScheduleStatsCard
                title="Hoje"
                value={stats.totalToday}
                description="Total de agendamentos"
                icon={Calendar}
                iconColor="bg-primary/10 text-primary"
                bgGradient="bg-gradient-to-br from-primary/5 to-primary/[0.02]"
                animationDelay="0s"
              />
              <ScheduleStatsCard
                title="Confirmados"
                value={stats.confirmedToday}
                description="Pacientes confirmados"
                icon={Users}
                iconColor="bg-success/10 text-success"
                bgGradient="bg-gradient-to-br from-success/5 to-success/[0.02]"
                valueColor="text-success"
                animationDelay="0.1s"
              />
              <ScheduleStatsCard
                title="Concluídos"
                value={stats.completedToday}
                description="Atendimentos finalizados"
                icon={TrendingUp}
                iconColor="bg-secondary/10 text-secondary"
                bgGradient="bg-gradient-to-br from-secondary/5 to-secondary/[0.02]"
                valueColor="text-secondary"
                animationDelay="0.2s"
              />
              <ScheduleStatsCard
                title="Pendentes"
                value={stats.pendingToday}
                description="Aguardando atendimento"
                icon={Clock}
                iconColor="bg-warning/10 text-warning"
                bgGradient="bg-gradient-to-br from-warning/5 to-warning/[0.02]"
                valueColor="text-warning"
                animationDelay="0.3s"
              />
            </>
          )}
        </div>

        {/* Search and Advanced Filters */}
        <div className="flex gap-3 animate-slide-up" style={{animationDelay: '0.1s'}}>
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

        {/* Basic Filters */}
        <AppointmentFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          services={services}
        />

        {/* Results Summary - Melhorado e responsivo */}
        {(filters.search || filters.status || filters.service || filters.dateFrom || filters.dateTo) && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/[0.02] shadow-card animate-slide-up">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground font-semibold text-xs sm:text-sm">
                      {filteredAppointments.length}
                    </Badge>
                  </div>
                  <span className="text-xs sm:text-sm font-medium">
                    resultado{filteredAppointments.length !== 1 ? 's' : ''} encontrado{filteredAppointments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto hover-scale text-xs sm:text-sm"
                >
                  Limpar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Selector - Melhorado para mobile */}
        <div className="flex justify-center mb-4 animate-slide-up" style={{animationDelay: '0.15s'}}>
          <div className="inline-flex items-center gap-1 bg-muted/50 p-1.5 rounded-xl shadow-card">
            {(['list', 'day', 'week', 'month'] as const).map(type => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  viewType === type
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                {type === 'list' ? '📱 Lista' : 
                 type === 'day' ? '📅 Dia' : 
                 type === 'week' ? '📊 Semana' : 
                 '📆 Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Mini Calendar - Apenas no modo lista */}
        {viewType === 'list' && (
          <div className="lg:hidden animate-slide-up" style={{animationDelay: '0.2s'}}>
            <MiniCalendar
              selectedDate={currentDate}
              onDateSelect={setCurrentDate}
              appointmentDates={appointmentDates}
            />
          </div>
        )}

        {/* Calendar/List View - Container melhorado e responsivo */}
        <div className="animate-slide-up rounded-2xl border border-border/50 bg-card shadow-xl min-h-[600px]" style={{animationDelay: '0.2s'}}>
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
                <div className="text-center space-y-3">
                  <div className="h-12 w-12 mx-auto skeleton-shimmer rounded-xl" />
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
              />
            </Suspense>
          )}
        </div>

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          appointment={selectedAppointment}
          defaultDate={modalDefaultDate}
          defaultTime={modalDefaultTime}
          mode={selectedAppointment ? 'view' : 'create'}
        />
      </div>
    </MainLayout>
  );
};

export default Schedule;