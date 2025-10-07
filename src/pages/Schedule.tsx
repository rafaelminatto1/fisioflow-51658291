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

const { appointments = [], loading, error, initialLoad } = useAppointments();

  useEffect(() => {
    logger.info('Página Schedule carregada', { 
      appointmentsCount: appointments.length,
      loading,
      initialLoad 
    }, 'Schedule');
  }, [appointments.length, loading, initialLoad]);

  // Memoized statistics calculation
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => 
      apt.date instanceof Date ? apt.date.toISOString().split('T')[0] === today : apt.date === today
    );
    const confirmedToday = todayAppointments.filter(apt => apt.status === 'Confirmed').length;
    const totalToday = todayAppointments.length;
    const completedToday = todayAppointments.filter(apt => apt.status === 'Completed').length;
    
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
    return Array.from(new Set(appointments.map(apt => apt.type)));
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-600 text-lg font-semibold mb-2">Erro ao carregar agendamentos</div>
              <p className="text-red-500">{error}</p>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header com melhor hierarquia visual */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Agenda
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gerencie seus agendamentos de forma eficiente
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleCreateAppointment}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all duration-200 hover-scale"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {/* Statistics Cards - Melhorados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
{initialLoad ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-0 shadow-md animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden relative animate-scale-in">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Hoje</p>
                      <div className="text-3xl font-bold">{stats.totalToday}</div>
                      <p className="text-xs text-muted-foreground mt-1">Total de agendamentos</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden relative animate-scale-in" style={{animationDelay: '0.1s'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-500/5" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Confirmados</p>
                      <div className="text-3xl font-bold text-green-600">{stats.confirmedToday}</div>
                      <p className="text-xs text-muted-foreground mt-1">Pacientes confirmados</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden relative animate-scale-in" style={{animationDelay: '0.2s'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Concluídos</p>
                      <div className="text-3xl font-bold text-purple-600">{stats.completedToday}</div>
                      <p className="text-xs text-muted-foreground mt-1">Atendimentos finalizados</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden relative animate-scale-in" style={{animationDelay: '0.3s'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-500/5" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Pendentes</p>
                      <div className="text-3xl font-bold text-orange-600">{stats.pendingToday}</div>
                      <p className="text-xs text-muted-foreground mt-1">Aguardando atendimento</p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
                      <Clock className="h-5 w-5 text-orange-600" />
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

        {/* Results Summary - Melhorado */}
        {(filters.search || filters.status || filters.service || filters.dateFrom || filters.dateTo) && (
          <Card className="border-primary/20 bg-primary/5 shadow-sm animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground font-semibold">
                      {filteredAppointments.length}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">
                    resultado{filteredAppointments.length !== 1 ? 's' : ''} encontrado{filteredAppointments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilters}
                  className="hover-scale"
                >
                  Limpar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar View - Container melhorado */}
        <div className="h-[650px] animate-fade-in" style={{animationDelay: '0.4s'}}>
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