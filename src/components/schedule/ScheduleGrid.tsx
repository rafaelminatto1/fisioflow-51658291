import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Clock, Plus } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types';

interface ScheduleGridProps {
  weekDays: Date[];
  timeSlots: string[];
  weekAppointments: Appointment[];
  onTimeSlotClick: (date: Date, timeSlot: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  getTypeColor: (type: string) => string;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  weekDays,
  timeSlots,
  weekAppointments,
  onTimeSlotClick,
  onAppointmentClick,
  getTypeColor
}) => {
  const formatDayHeader = (date: Date) => {
    return {
      dayName: format(date, 'EEE', { locale: ptBR }),
      dayNumber: format(date, 'dd/MM', { locale: ptBR })
    };
  };

  const getAppointmentForSlot = (date: Date, timeSlot: string) => {
    return weekAppointments.find(apt => 
      isSameDay(new Date(apt.date), date) && apt.time === timeSlot
    );
  };


  return (
    <Card className="overflow-hidden bg-gradient-card border-border shadow-card">
      <CardHeader className="bg-muted/30 border-b border-border">
        <CardTitle className="text-foreground flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Agenda da Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[320px] sm:min-w-[640px] lg:min-w-[900px]">
            {/* Header with days */}
            <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
              <div className="p-2 sm:p-4 text-center text-xs sm:text-sm font-semibold text-muted-foreground border-r border-border bg-muted/70">
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
                    className={`p-2 sm:p-4 text-center border-r border-border last:border-r-0 transition-colors ${
                      isToday ? 'bg-primary/10 border-primary/20' : 'bg-background'
                    }`}
                  >
                    <div className={`text-xs sm:text-sm font-semibold capitalize ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}>
                      {dayName}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isToday ? 'text-primary/80' : 'text-muted-foreground'
                    }`}>
                      {dayNumber}
                    </div>
                    <div className={`text-xs mt-1 sm:mt-2 px-1 sm:px-2 py-1 rounded-full ${
                      dayAppointments.length > 0 
                        ? 'bg-primary/20 text-primary font-medium' 
                        : 'text-muted-foreground/70'
                    }`}>
                      <span className="hidden sm:inline">{dayAppointments.length} agend.</span>
                      <span className="sm:hidden">{dayAppointments.length}</span>
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
                  <div className="p-2 sm:p-3 text-xs sm:text-sm font-medium text-muted-foreground border-r border-border bg-muted/30 flex items-center justify-center">
                    <span className="text-xs bg-muted px-1 sm:px-2 py-1 rounded">
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
                        onClick={() => {
                          if (isOccupied && appointment) {
                            onAppointmentClick(appointment);
                          } else {
                            onTimeSlotClick(day, timeSlot);
                          }
                        }}
                      >
                        {isOccupied && appointment ? (
                          <div className={`
                            ${getTypeColor(appointment.type)} text-white text-xs p-2 sm:p-3 rounded-lg h-full
                            flex flex-col justify-center shadow-md border-l-4 border-white/20 
                            hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200
                            cursor-pointer
                          `}>
                            <div className="font-semibold truncate mb-1 text-xs sm:text-sm">
                              {appointment.patientName}
                            </div>
                            <div className="opacity-90 truncate text-xs hidden sm:block">
                              {appointment.type}
                            </div>
                            <div className="opacity-75 text-xs mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="hidden sm:inline">{appointment.duration}min</span>
                              <span className="sm:hidden">{appointment.duration}m</span>
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
  );
};