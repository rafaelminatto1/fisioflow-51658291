import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppointmentFilters } from '@/components/schedule/AppointmentFilters';
import { CalendarView, CalendarViewType } from '@/components/schedule/CalendarView';
import { AppointmentModal } from '@/components/schedule/AppointmentModal';
import { useAppointments } from '@/hooks/useAppointments';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Calendar, Clock, Users, TrendingUp, Plus } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState, LoadingSkeleton } from '@/components/ui';

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
  const [viewType, setViewType] = useState<CalendarViewType>('week');
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    service: ''
  });

  const { data: appointments = [], isLoading: loading, error } = useAppointments();

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
      return true;
    });
  }, [appointments, filters]);

  const services = useMemo(() => {
    return Array.from(new Set(appointments.map(apt => apt.type))) as string[];
  }, [appointments]);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setModalDefaultDate(undefined);
    setModalDefaultTime(undefined);
    setIsModalOpen(true);
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    setSelectedAppointment(null);
    setModalDefaultDate(date);
    setModalDefaultTime(time);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setModalDefaultDate(undefined);
    setModalDefaultTime(undefined);
  };

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      service: ''
    });
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

        {/* Statistics Cards - Melhorados e responsivos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-0 shadow-card animate-pulse">
                  <CardContent className="p-4 sm:p-6">
                    <div className="h-16 sm:h-20 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="group border-0 shadow-card hover:shadow-hover transition-all duration-300 overflow-hidden relative animate-scale-in hover-lift">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/[0.02]" />
                <CardContent className="p-4 sm:p-6 relative">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Hoje</p>
                      <div className="p-2 sm:p-2.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold">{stats.totalToday}</div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Total de agendamentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-card hover:shadow-hover transition-all duration-300 overflow-hidden relative animate-scale-in hover-lift" style={{animationDelay: '0.1s'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-success/[0.02]" />
                <CardContent className="p-4 sm:p-6 relative">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Confirmados</p>
                      <div className="p-2 sm:p-2.5 bg-success/10 rounded-lg group-hover:scale-110 transition-transform">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-success">{stats.confirmedToday}</div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Pacientes confirmados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-card hover:shadow-hover transition-all duration-300 overflow-hidden relative animate-scale-in hover-lift" style={{animationDelay: '0.2s'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/[0.02]" />
                <CardContent className="p-4 sm:p-6 relative">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Concluídos</p>
                      <div className="p-2 sm:p-2.5 bg-secondary/10 rounded-lg group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-secondary">{stats.completedToday}</div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Atendimentos finalizados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-card hover:shadow-hover transition-all duration-300 overflow-hidden relative animate-scale-in hover-lift" style={{animationDelay: '0.3s'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-warning/[0.02]" />
                <CardContent className="p-4 sm:p-6 relative">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pendentes</p>
                      <div className="p-2 sm:p-2.5 bg-warning/10 rounded-lg group-hover:scale-110 transition-transform">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-warning">{stats.pendingToday}</div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Aguardando atendimento</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
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

        {/* Calendar View - Container melhorado e responsivo */}
        <div className="h-[500px] sm:h-[600px] lg:h-[650px] animate-slide-up" style={{animationDelay: '0.2s'}}>
          <CalendarView
            appointments={filteredAppointments}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            viewType={viewType}
            onViewTypeChange={setViewType}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
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