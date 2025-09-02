import { useState } from 'react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Appointment } from '@/types';

interface DailyScheduleViewProps {
  appointments: Appointment[];
  onTimeSlotClick: (date: Date, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export const DailyScheduleView = ({
  appointments,
  onTimeSlotClick,
  onAppointmentClick
}: DailyScheduleViewProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

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
  const dayAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.date), selectedDate)
  );

  const getAppointmentForSlot = (timeSlot: string) => {
    return dayAppointments.find(apt => apt.time === timeSlot);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-200';
      case 'Pendente':
        return 'bg-amber-500/20 text-amber-700 border-amber-200';
      case 'Reagendado':
        return 'bg-orange-500/20 text-orange-700 border-orange-200';
      case 'Cancelado':
        return 'bg-red-500/20 text-red-700 border-red-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const previousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{dayAppointments.length}</div>
            <div className="text-sm text-muted-foreground">Agendamentos</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {dayAppointments.filter(a => a.status === 'Confirmado').length}
            </div>
            <div className="text-sm text-muted-foreground">Confirmados</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {dayAppointments.filter(a => a.status === 'Pendente').length}
            </div>
            <div className="text-sm text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
      </div>

      {/* Time Slots */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horários do Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {timeSlots.map((timeSlot) => {
            const appointment = getAppointmentForSlot(timeSlot);

            return (
              <div
                key={timeSlot}
                className={`
                  p-4 rounded-lg border border-border transition-all duration-200
                  ${appointment 
                    ? 'bg-background hover:shadow-card cursor-pointer' 
                    : 'bg-muted/30 hover:bg-muted/50 cursor-pointer border-dashed'
                  }
                `}
                onClick={() => {
                  if (appointment) {
                    onAppointmentClick(appointment);
                  } else {
                    onTimeSlotClick(selectedDate, timeSlot);
                  }
                }}
              >
                {appointment ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-muted-foreground min-w-[60px]">
                        {timeSlot}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {appointment.patientName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{appointment.type}</span>
                          <span>{appointment.duration}min</span>
                          {appointment.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{appointment.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">{timeSlot} - Horário disponível</span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};