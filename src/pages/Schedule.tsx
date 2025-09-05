import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewAppointmentModal } from '@/components/modals/NewAppointmentModal';
import { EditAppointmentModal } from '@/components/modals/EditAppointmentModal';
import { WeekNavigation } from '@/components/schedule/WeekNavigation';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { ScheduleViewToggle, ScheduleView } from '@/components/appointments/ScheduleViewToggle';
import { MonthlyCalendarView } from '@/components/appointments/MonthlyCalendarView';
import { DailyScheduleView } from '@/components/appointments/DailyScheduleView';
import { AppointmentListView } from '@/components/appointments/AppointmentListView';

import { useAppointments } from '@/hooks/useAppointments';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Schedule = () => {
  const [currentView, setCurrentView] = useState<ScheduleView>(() => {
    return (localStorage.getItem('schedule-view') as ScheduleView) || 'week';
  });
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<{ id: string; patient_id: string; date: string; time: string; duration: number; type: string; status: string; notes?: string } | null>(null);
  const { appointments, updateAppointment } = useAppointments();
  
  // Save view preference to localStorage
  useEffect(() => {
    localStorage.setItem('schedule-view', currentView);
  }, [currentView]);

  // Generate time slots (7:00 to 18:00, every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  
  // Get week days (Monday to Saturday)
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  
  // Filter appointments for the current week
  const weekAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return weekDays.some(day => isSameDay(aptDate, day));
    });
  }, [appointments, weekDays]);

  // Filter appointments for current month
  const monthAppointments = useMemo(() => {
    const monthStart = startOfMonth(currentWeek);
    const monthEnd = endOfMonth(currentWeek);
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= monthStart && aptDate <= monthEnd;
    });
  }, [appointments, currentWeek]);

  // Filter appointments for current day
  const dayAppointments = useMemo(() => {
    return appointments.filter(apt => isSameDay(new Date(apt.date), currentWeek));
  }, [appointments, currentWeek]);

  // Calculate appointment counts for different views
  const appointmentCounts = useMemo(() => ({
    week: weekAppointments.length,
    month: monthAppointments.length,
    day: dayAppointments.length,
    total: appointments.length
  }), [weekAppointments.length, monthAppointments.length, dayAppointments.length, appointments.length]);
  
  const formatDayHeader = (date: Date) => {
    return {
      dayName: format(date, 'EEE', { locale: ptBR }),
      dayNumber: format(date, 'dd/MM', { locale: ptBR })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-blue-500';
      case 'Pendente':
        return 'bg-yellow-500';
      case 'Reagendado':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Consulta Inicial':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
      case 'Fisioterapia':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'Reavaliação':
        return 'bg-gradient-to-r from-purple-500 to-purple-600';
      case 'Consulta de Retorno':
        return 'bg-gradient-to-r from-amber-500 to-amber-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const previousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getAppointmentForSlot = (date: Date, timeSlot: string) => {
    return weekAppointments.find(apt => 
      isSameDay(new Date(apt.date), date) && apt.time === timeSlot
    );
  };

  const isSlotOccupied = (date: Date, timeSlot: string) => {
    return !!getAppointmentForSlot(date, timeSlot);
  };

  const handleTimeSlotClick = (date: Date, timeSlot: string) => {
    if (!isSlotOccupied(date, timeSlot)) {
      setSelectedTimeSlot({ date, time: timeSlot });
    }
  };

  const handleStatusChange = async (appointmentId: string, status: string) => {
    try {
      await updateAppointment(appointmentId, { status });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const getTotalAppointments = () => weekAppointments.length;
  const getConfirmedAppointments = () => weekAppointments.filter(a => a.status === 'Confirmado').length;
  const getPendingAppointments = () => weekAppointments.filter(a => a.status === 'Pendente').length;
  const getTotalDuration = () => weekAppointments.reduce((acc, a) => acc + a.duration, 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {currentView === 'week' && 'Agenda Semanal'}
              {currentView === 'month' && 'Agenda Mensal'}
              {currentView === 'day' && 'Agenda do Dia'}
              {currentView === 'list' && 'Lista de Agendamentos'}
            </h1>
            <p className="text-muted-foreground">
              {currentView === 'list' 
                ? 'Visualize e gerencie todos os agendamentos'
                : 'Clique em um horário para agendar'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ScheduleViewToggle
              currentView={currentView}
              onViewChange={setCurrentView}
              appointmentCounts={appointmentCounts}
            />
            <NewAppointmentModal
              trigger={
                <Button className="bg-gradient-primary text-primary-foreground hover:shadow-medical">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Agendamento
                </Button>
              }
            />
          </div>
        </div>

        {/* Navigation - only show for week and day views */}
        {(currentView === 'week' || currentView === 'day') && (
          <WeekNavigation
            currentWeek={currentWeek}
            onPreviousWeek={previousWeek}
            onNextWeek={nextWeek}
            onToday={goToToday}
            totalAppointments={getTotalAppointments()}
          />
        )}

        {/* View-specific stats */}
        {currentView !== 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-card border-border shadow-card hover:shadow-medical transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CalendarIcon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{getTotalAppointments()}</p>
                <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border shadow-card hover:shadow-medical transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Badge className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 mb-1">{getConfirmedAppointments()}</p>
                <p className="text-sm text-muted-foreground">Confirmados</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border shadow-card hover:shadow-medical transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-600 mb-1">{getPendingAppointments()}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border shadow-card hover:shadow-medical transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary mb-1">{getTotalDuration()}min</p>
                <p className="text-sm text-muted-foreground">Duração Total</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Different view components */}
        {currentView === 'week' && (
          <ScheduleGrid
            weekDays={weekDays}
            timeSlots={timeSlots}
            weekAppointments={weekAppointments}
            onTimeSlotClick={handleTimeSlotClick}
            onAppointmentClick={setSelectedAppointment}
            getTypeColor={getTypeColor}
          />
        )}

        {currentView === 'month' && (
          <MonthlyCalendarView
            appointments={appointments}
            onDateClick={(date) => {
              setCurrentWeek(date);
              setCurrentView('day');
            }}
            onAppointmentClick={setSelectedAppointment}
          />
        )}

        {currentView === 'day' && (
          <DailyScheduleView
            appointments={appointments}
            onTimeSlotClick={handleTimeSlotClick}
            onAppointmentClick={setSelectedAppointment}
          />
        )}

        {currentView === 'list' && (
          <AppointmentListView
            appointments={appointments}
            onAppointmentClick={setSelectedAppointment}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Modal for new appointment with pre-filled time and date */}
        {selectedTimeSlot && (
          <NewAppointmentModal
            open={!!selectedTimeSlot}
            onOpenChange={(open) => !open && setSelectedTimeSlot(null)}
            defaultTime={selectedTimeSlot.time}
            defaultDate={selectedTimeSlot.date}
          />
        )}

        {/* Modal for editing existing appointment */}
        {selectedAppointment && (
          <EditAppointmentModal
            open={!!selectedAppointment}
            onOpenChange={(open) => !open && setSelectedAppointment(null)}
            appointment={selectedAppointment}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Schedule;
