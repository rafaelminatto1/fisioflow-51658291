import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { WeekNavigation } from '@/components/schedule/WeekNavigation';
import { AppointmentModal } from '@/components/schedule/AppointmentModal';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentBase, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { Calendar, Search, Filter, Plus, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { startOfWeek, addWeeks, addDays, format, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Schedule = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AppointmentType | 'all'>('all');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    appointment?: AppointmentBase;
    defaultDate?: Date;
    defaultTime?: string;
  }>({
    isOpen: false,
    mode: 'create'
  });

  const {
    appointments,
    loading,
    error,
    getAppointmentStats,
    searchAppointments,
    filteredAppointments
  } = useAppointments();

  // Generate week days (Monday to Friday)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(start, i));
  }, [currentWeek]);

  // Generate time slots (7:00 to 19:00, 30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  // Filter appointments for current week
  const weekAppointments = useMemo(() => {
    let filtered = appointments.filter(apt => 
      isSameWeek(apt.date, currentWeek, { weekStartsOn: 1 })
    );

    // Apply search filter
    if (searchQuery) {
      filtered = searchAppointments(searchQuery).filter(apt => 
        isSameWeek(apt.date, currentWeek, { weekStartsOn: 1 })
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(apt => apt.type === typeFilter);
    }

    return filtered;
  }, [appointments, currentWeek, searchQuery, statusFilter, typeFilter, searchAppointments]);

  // Get appointment type colors
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'Consulta Inicial': 'bg-blue-500',
      'Fisioterapia': 'bg-green-500',
      'Reavaliação': 'bg-orange-500',
      'Consulta de Retorno': 'bg-purple-500',
      'Avaliação Funcional': 'bg-cyan-500',
      'Terapia Manual': 'bg-indigo-500',
      'Pilates Clínico': 'bg-pink-500',
      'RPG': 'bg-red-500',
      'Dry Needling': 'bg-yellow-500',
      'Liberação Miofascial': 'bg-teal-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, -1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  // Modal handlers
  const handleTimeSlotClick = (date: Date, timeSlot: string) => {
    setModalState({
      isOpen: true,
      mode: 'create',
      defaultDate: date,
      defaultTime: timeSlot
    });
  };

  const handleAppointmentClick = (appointment: AppointmentBase) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      appointment
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      mode: 'create'
    });
  };

  const handleEditAppointment = (appointment: AppointmentBase) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      appointment
    });
  };

  // Get appointment statistics
  const stats = getAppointmentStats();

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Calendar className="w-5 h-5 text-primary-foreground animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-muted-foreground">Carregando agendamentos...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-8 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-muted-foreground">Erro ao carregar agendamentos</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro ao Carregar</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-muted-foreground">
                Gerenciar agendamentos e consultas
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => setModalState({ isOpen: true, mode: 'create' })}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </section>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 grid place-items-center">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/20 grid place-items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmados</p>
                  <p className="text-2xl font-bold text-foreground">{stats.confirmed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/20 grid place-items-center">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 grid place-items-center">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold text-foreground">{stats.today}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por paciente, tipo ou observações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AppointmentStatus | 'all')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Scheduled">Agendado</SelectItem>
                  <SelectItem value="Confirmed">Confirmado</SelectItem>
                  <SelectItem value="Completed">Concluído</SelectItem>
                  <SelectItem value="Cancelled">Cancelado</SelectItem>
                  <SelectItem value="No Show">Faltou</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AppointmentType | 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="Consulta Inicial">Consulta Inicial</SelectItem>
                  <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                  <SelectItem value="Reavaliação">Reavaliação</SelectItem>
                  <SelectItem value="Consulta de Retorno">Consulta de Retorno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Week Navigation */}
        <WeekNavigation
          currentWeek={currentWeek}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          totalAppointments={weekAppointments.length}
        />

        {/* Schedule Grid */}
        <ScheduleGrid
          weekDays={weekDays}
          timeSlots={timeSlots}
          weekAppointments={weekAppointments}
          onTimeSlotClick={handleTimeSlotClick}
          onAppointmentClick={handleAppointmentClick}
          getTypeColor={getTypeColor}
        />

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
          appointment={modalState.appointment}
          defaultDate={modalState.defaultDate}
          defaultTime={modalState.defaultTime}
          mode={modalState.mode}
        />
      </div>
    </MainLayout>
  );
};

export default Schedule;