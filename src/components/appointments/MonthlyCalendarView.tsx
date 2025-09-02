import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Appointment } from '@/types';

interface MonthlyCalendarViewProps {
  appointments: Appointment[];
  onDateClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export const MonthlyCalendarView = ({
  appointments,
  onDateClick,
  onAppointmentClick
}: MonthlyCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.date), date));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Consulta Inicial':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-200';
      case 'Fisioterapia':
        return 'bg-blue-500/20 text-blue-700 border-blue-200';
      case 'Reavaliação':
        return 'bg-purple-500/20 text-purple-700 border-purple-200';
      case 'Consulta de Retorno':
        return 'bg-amber-500/20 text-amber-700 border-amber-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[100px] p-2 border border-border rounded-lg cursor-pointer
                    transition-all duration-200 hover:shadow-card
                    ${isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                  `}
                  onClick={() => onDateClick(day)}
                >
                  <div className={`
                    text-sm font-medium mb-2
                    ${isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`
                          text-xs p-1 rounded border cursor-pointer
                          hover:opacity-80 transition-opacity
                          ${getTypeColor(appointment.type)}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(appointment);
                        }}
                      >
                        <div className="font-medium truncate">
                          {appointment.time}
                        </div>
                        <div className="truncate">
                          {appointment.patientName}
                        </div>
                      </div>
                    ))}
                    
                    {dayAppointments.length > 3 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs h-5 bg-muted text-muted-foreground"
                      >
                        +{dayAppointments.length - 3} mais
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};