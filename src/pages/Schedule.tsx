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

        {/* Weekly Calendar Grid */}
        <Card className="overflow-hidden bg-gradient-card border-border shadow-card">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Agenda da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header with days */}
                <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
                  <div className="p-4 text-center text-sm font-semibold text-muted-foreground border-r border-border bg-muted/70">
                    Horário
                  </div>
                  {weekDays.map((day) => {
                    const { dayName, dayNumber } = formatDayHeader(day);
                    const dayAppointments = weekAppointments.filter(apt => 
                      isSameDay(new Date(apt.date), day)
                    );
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div key={day.toISOString()} 
                        className={`p-4 text-center border-r border-border last:border-r-0 transition-colors ${
                          isToday ? 'bg-primary/10 border-primary/20' : 'bg-background'
                        }`}
                      >
                        <div className={`text-sm font-semibold capitalize ${
                          isToday ? 'text-primary' : 'text-foreground'
                        }`}>
                          {dayName}
                        </div>
                        <div className={`text-xs mt-1 ${
                          isToday ? 'text-primary/80' : 'text-muted-foreground'
                        }`}>
                          {dayNumber}
                        </div>
                        <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                          dayAppointments.length > 0 
                            ? 'bg-primary/20 text-primary font-medium' 
                            : 'text-muted-foreground/70'
                        }`}>
                          {dayAppointments.length} agend.
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time slots grid */}
                <div className="bg-background">
                  {timeSlots.map((timeSlot, index) => (
                    <div key={timeSlot} 
                      className={`grid grid-cols-7 border-b border-border last:border-b-0 min-h-[60px] ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      }`}
                    >
                      {/* Time column */}
                      <div className="p-3 text-sm font-medium text-muted-foreground border-r border-border bg-muted/30 flex items-center justify-center">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {timeSlot}
                        </span>
                      </div>
                      
                      {/* Day columns */}
                      {weekDays.map((day) => {
                        const appointment = getAppointmentForSlot(day, timeSlot);
                        const isOccupied = !!appointment;
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                          <div
                            key={`${day.toISOString()}-${timeSlot}`}
                            className={`
                              border-r border-border last:border-r-0 p-2 cursor-pointer transition-all duration-300 group relative
                              ${isOccupied 
                                ? 'bg-transparent' 
                                : `hover:bg-primary/10 hover:border-primary/30 ${
                                    isToday ? 'bg-primary/5' : ''
                                  }`
                              }
                            `}
                            onClick={() => handleTimeSlotClick(day, timeSlot)}
                          >
                            {isOccupied && appointment ? (
                              <div className={`
                                ${getTypeColor(appointment.type)} text-white text-xs p-3 rounded-lg h-full
                                flex flex-col justify-center shadow-md border-l-4 border-white/20 
                                hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200
                              `}>
                                <div className="font-semibold truncate mb-1">
                                  {appointment.patientName}
                                </div>
                                <div className="opacity-90 truncate text-xs">
                                  {appointment.type}
                                </div>
                                <div className="opacity-75 text-xs mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {appointment.duration}min
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted-foreground/40 group-hover:text-primary/70 transition-colors">
                                <Plus className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
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
