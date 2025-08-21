import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewAppointmentModal } from '@/components/modals/NewAppointmentModal';
import { useData } from '@/contexts/DataContext';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Schedule = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null);
  const { appointments } = useData();
  
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
        return 'bg-green-500';
      case 'Fisioterapia':
        return 'bg-blue-500';
      case 'Reavaliação':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const previousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
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
            <h1 className="text-2xl font-bold text-foreground">Agenda Semanal</h1>
            <p className="text-muted-foreground">Clique em um horário para agendar</p>
          </div>
          <NewAppointmentModal
            trigger={
              <Button className="bg-gradient-primary text-primary-foreground hover:shadow-medical">
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            }
          />
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={previousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <p className="text-xl font-semibold text-foreground">
                  {format(weekStart, 'dd/MM', { locale: ptBR })} - {format(addDays(weekStart, 5), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getTotalAppointments()} agendamentos esta semana
                </p>
              </div>
              
              <Button variant="outline" onClick={nextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{getTotalAppointments()}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{getConfirmedAppointments()}</p>
              <p className="text-sm text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{getPendingAppointments()}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{getTotalDuration()}min</p>
              <p className="text-sm text-muted-foreground">Duração Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Agenda da Semana</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px] border border-border rounded-lg overflow-hidden bg-background">
                {/* Header with days */}
                <div className="grid grid-cols-7 border-b border-border bg-muted/50">
                  <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border">
                    Horário
                  </div>
                  {weekDays.map((day) => {
                    const { dayName, dayNumber } = formatDayHeader(day);
                    const dayAppointments = weekAppointments.filter(apt => 
                      isSameDay(new Date(apt.date), day)
                    );
                    
                    return (
                      <div key={day.toISOString()} className="p-3 text-center border-r border-border last:border-r-0">
                        <div className="text-sm font-medium text-foreground capitalize">{dayName}</div>
                        <div className="text-xs text-muted-foreground">{dayNumber}</div>
                        <div className="text-xs text-primary mt-1">
                          {dayAppointments.length} agend.
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time slots grid */}
                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-7 border-b border-border last:border-b-0 min-h-16">
                    {/* Time column */}
                    <div className="p-3 text-sm font-medium text-muted-foreground border-r border-border bg-muted/20 flex items-center">
                      {timeSlot}
                    </div>
                    
                    {/* Day columns */}
                    {weekDays.map((day) => {
                      const appointment = getAppointmentForSlot(day, timeSlot);
                      const isOccupied = !!appointment;
                      
                      return (
                        <div
                          key={`${day.toISOString()}-${timeSlot}`}
                          className={`
                            border-r border-border last:border-r-0 p-1 cursor-pointer transition-all duration-200
                            ${isOccupied 
                              ? 'bg-transparent' 
                              : 'hover:bg-primary/5 hover:border-primary/20'
                            }
                          `}
                          onClick={() => handleTimeSlotClick(day, timeSlot)}
                        >
                          {isOccupied && appointment ? (
                            <div className={`
                              ${getTypeColor(appointment.type)} text-white text-xs p-2 rounded h-full
                              flex flex-col justify-center shadow-sm
                            `}>
                              <div className="font-medium truncate">
                                {appointment.patientName}
                              </div>
                              <div className="opacity-90 truncate">
                                {appointment.type}
                              </div>
                              <div className="opacity-75 text-xs">
                                {appointment.duration}min
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground/50 hover:text-primary">
                              <Plus className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal for new appointment with pre-filled time and date */}
        {selectedTimeSlot && (
          <NewAppointmentModal
            open={!!selectedTimeSlot}
            onOpenChange={(open) => !open && setSelectedTimeSlot(null)}
            defaultTime={selectedTimeSlot.time}
            defaultDate={selectedTimeSlot.date}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Schedule;
