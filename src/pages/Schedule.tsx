import React, { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppointmentFilters } from '@/components/schedule/AppointmentFilters';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { AppointmentModal } from '@/components/schedule/AppointmentModal';
import { useAppointments } from '@/hooks/useAppointments';
import { WeekNavigation } from '@/components/schedule/WeekNavigation';
import { logger } from '@/lib/errors/logger';
import { AlertTriangle, Calendar, Clock, Users, TrendingUp, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Appointment } from '@/types/appointment';

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
  const [currentWeek, setCurrentWeek] = useState(new Date());
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
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-red-600 text-lg font-semibold mb-2">Erro ao carregar agendamentos</div>
                <p className="text-red-500">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              Agenda
            </h1>
            <p className="text-gray-600 mt-1">Gerencie seus agendamentos e consultas</p>
          </div>
          <Button 
            onClick={handleCreateAppointment}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
{initialLoad ? (
            <>
              <Card className="border-0 shadow-lg animate-pulse h-28" />
              <Card className="border-0 shadow-lg animate-pulse h-28" />
              <Card className="border-0 shadow-lg animate-pulse h-28" />
              <Card className="border-0 shadow-lg animate-pulse h-28" />
            </>
          ) : (
            <>
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Hoje</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.totalToday}</div>
                    <Calendar className="h-5 w-5 opacity-80" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs opacity-80">Total de agendamentos</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Confirmados</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.confirmedToday}</div>
                    <Users className="h-5 w-5 opacity-80" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs opacity-80">Pacientes confirmados</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Concluídos</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.completedToday}</div>
                    <TrendingUp className="h-5 w-5 opacity-80" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs opacity-80">Atendimentos finalizados</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Pendentes</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{stats.pendingToday}</div>
                    <Clock className="h-5 w-5 opacity-80" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs opacity-80">Aguardando atendimento</p>
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

        {/* Results Summary */}
        {(filters.search || filters.status || filters.service || filters.dateFrom || filters.dateTo) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {filteredAppointments.length} resultado{filteredAppointments.length !== 1 ? 's' : ''}
                  </Badge>
                  <span className="text-sm text-blue-700">encontrado{filteredAppointments.length !== 1 ? 's' : ''}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilters}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Limpar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week Navigation */}
        <WeekNavigation 
          currentWeek={currentWeek}
          onPreviousWeek={() => setCurrentWeek(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000))}
          onNextWeek={() => setCurrentWeek(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000))}
          onToday={() => setCurrentWeek(new Date())}
          totalAppointments={filteredAppointments.length}
        />

        {/* Schedule Grid */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendamentos
            </CardTitle>
            <CardDescription>
              {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''} 
              {filters.search || filters.status || filters.service || filters.dateFrom || filters.dateTo ? ' (filtrados)' : ''}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            <ScheduleGrid
              appointments={filteredAppointments}
              onAppointmentClick={handleAppointmentClick}
              showSkeleton={initialLoad}
            />
          </CardContent>
        </Card>

{/* Appointment Modal */}
        <AppointmentModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          appointment={selectedAppointment}
        />
      </div>
    </div>
  );
};

export default Schedule;