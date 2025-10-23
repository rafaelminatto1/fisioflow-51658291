import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { AppointmentCard } from './AppointmentCard';

export type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarViewProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  currentDate,
  onDateChange,
  viewType,
  onViewTypeChange,
  onAppointmentClick,
  onTimeSlotClick
}) => {
  // Current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutesFromStart = (hours * 60 + minutes) - (7 * 60); // Start from 7am
    const totalDayMinutes = 17 * 60; // 7am to 12am = 17 hours
    return (totalMinutesFromStart / totalDayMinutes) * 100;
  }, [currentTime]);

  const navigateCalendar = (direction: 'prev' | 'next') => {
    switch (viewType) {
      case 'day':
        onDateChange(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getHeaderTitle = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = typeof apt.date === 'string' ? new Date(apt.date) : apt.date;
      return isSameDay(aptDate, date);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmado':
      case 'confirmed': 
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-500/30';
      case 'agendado':
      case 'scheduled': 
        return 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-blue-500/30';
      case 'concluido':
      case 'completed': 
        return 'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-400 shadow-purple-500/30';
      case 'cancelado':
      case 'cancelled': 
        return 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 shadow-red-500/30';
      case 'aguardando_confirmacao':
      case 'awaiting': 
        return 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 shadow-amber-500/30';
      case 'em_andamento':
      case 'in_progress': 
        return 'bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-400 shadow-cyan-500/30';
      case 'remarcado':
      case 'rescheduled': 
        return 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-orange-500/30';
      case 'nao_compareceu':
      case 'no_show': 
        return 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400 shadow-rose-500/30';
      case 'em_espera':
      case 'waiting': 
        return 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400 shadow-indigo-500/30';
      case 'atrasado':
      case 'late': 
        return 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-400 shadow-yellow-500/30';
      default: 
        return 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400 shadow-gray-500/30';
    }
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate);
    
    return (
      <div className="flex h-full bg-gradient-to-br from-background to-muted/20">
        {/* Time column com design melhorado */}
        <div className="w-24 border-r bg-muted/30 backdrop-blur-sm">
          <div className="h-16 border-b flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {TIME_SLOTS.map(time => (
            <div key={time} className="h-16 border-b border-border/50 p-3 text-sm font-medium text-muted-foreground flex items-center">
              {time}
            </div>
          ))}
        </div>
        
        {/* Day column com hover states */}
        <div className="flex-1 relative bg-background/50">
          <div className="h-16 border-b bg-gradient-to-r from-primary/10 to-primary/5 p-4 backdrop-blur-sm sticky top-0 z-10">
            <div className="font-semibold text-center flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
          </div>
          
          {/* Time slots */}
          <div className="relative">
            {TIME_SLOTS.map(time => {
              const hour = parseInt(time.split(':')[0]);
              const isCurrentHour = hour === currentTime.getHours();
              
              return (
                <div 
                  key={time} 
                  className={cn(
                    "h-16 border-b border-border cursor-pointer hover:bg-primary/5 transition-colors group relative",
                    isCurrentHour && "bg-primary/5"
                  )}
                  onClick={() => onTimeSlotClick(currentDate, time)}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    Clique para agendar
                  </span>
                </div>
              );
            })}
            
            {/* Current time indicator */}
            {isSameDay(currentDate, currentTime) && currentTimePosition >= 0 && currentTimePosition <= 100 && (
              <div 
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimePosition}%` }}
              >
                <div className="flex items-center">
                  <div className="w-24 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse-glow">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {format(currentTime, 'HH:mm')}
                    </div>
                  </div>
                  <div className="flex-1 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                </div>
              </div>
            )}

            {/* Appointments overlay */}
            {dayAppointments.map(apt => {
              const startTime = parseInt(apt.time?.split(':')[0] || '9');
              const top = startTime * 64; // 64px per hour
              
              return (
                <div
                  key={apt.id}
                  className="absolute left-1 right-1 animate-bounce-in pointer-events-auto"
                  style={{ top: `${top}px`, height: '56px' }}
                  onClick={() => onAppointmentClick(apt)}
                >
                  <AppointmentCard
                    appointment={apt}
                    variant="compact"
                    onClick={() => onAppointmentClick(apt)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return (
      <div className="flex h-full overflow-hidden">
        {/* Time column - Otimizado mobile */}
        <div className="w-14 sm:w-20 border-r bg-gradient-to-b from-muted/30 to-muted/10 flex-shrink-0">
          <div className="h-14 sm:h-16 border-b flex items-center justify-center">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </div>
          {TIME_SLOTS.map(time => (
            <div key={time} className="h-12 sm:h-16 border-b border-border/30 p-1 sm:p-2 text-[10px] sm:text-xs text-muted-foreground font-medium flex items-start pt-1">
              {time}
            </div>
          ))}
        </div>
        
        {/* Week days - Scroll horizontal mobile */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="inline-flex sm:grid sm:grid-cols-7 min-w-full bg-background/50">
            {weekDays.map(day => {
              const dayAppointments = getAppointmentsForDate(day);
              const isTodayDate = isToday(day);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className="w-[120px] sm:w-auto border-r border-border/50 last:border-r-0 relative group flex-shrink-0"
                >
                  <div className={cn(
                    "h-14 sm:h-16 border-b sticky top-0 z-10 p-2 sm:p-3 text-center text-xs sm:text-sm backdrop-blur-sm transition-all duration-200",
                    isTodayDate 
                      ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-lg ring-2 ring-primary/20" 
                      : "bg-gradient-to-br from-muted/60 to-muted/30 hover:from-muted/80 hover:to-muted/50"
                  )}>
                    <div className="font-semibold uppercase tracking-wide text-[10px] sm:text-xs">
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={cn(
                      "text-lg sm:text-xl font-bold mt-0.5 sm:mt-1",
                      isTodayDate && "drop-shadow-md"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  {/* Time slots com altura otimizada */}
                  <div className="relative">
                    {TIME_SLOTS.map(time => (
                      <div 
                        key={time} 
                        className="h-12 sm:h-16 border-b border-border/20 cursor-pointer hover:bg-primary/5 transition-colors group/slot relative"
                        onClick={() => onTimeSlotClick(day, time)}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/30 opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                          +
                        </span>
                      </div>
                    ))}
                    
                    {/* Appointments overlay - Cards melhorados */}
                    {dayAppointments.map(apt => {
                      const startTime = parseInt(apt.time?.split(':')[0] || '9');
                      const top = startTime * 48; // 48px para mobile, 64px para desktop
                      
                      return (
                        <div
                          key={apt.id}
                          className={cn(
                            "absolute left-0.5 right-0.5 sm:left-1 sm:right-1 p-1.5 sm:p-2.5 rounded-xl text-white text-[10px] sm:text-xs cursor-pointer shadow-lg border-l-[3px] sm:border-l-4 backdrop-blur-sm",
                            getStatusColor(apt.status),
                            "hover:shadow-2xl hover:scale-105 hover:z-20 transition-all duration-300 group/card"
                          )}
                          style={{ 
                            top: `${top}px`, 
                            height: '44px',
                            minHeight: '44px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          <div className="font-bold truncate drop-shadow-sm leading-tight">
                            {apt.patientName}
                          </div>
                          <div className="opacity-95 truncate text-[9px] sm:text-xs mt-0.5 flex items-center gap-1 font-medium">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span>{apt.time}</span>
                          </div>
                          
                          {/* Pulse indicator on hover */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-lg" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const weeks = [];
    let currentWeekStart = startDate;
    
    while (currentWeekStart <= endDate) {
      const week = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
      weeks.push(week);
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
    
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20">
        {/* Week headers com melhor estilo */}
        <div className="grid grid-cols-7 border-b bg-gradient-to-r from-muted/50 to-muted/30 sticky top-0 z-10 backdrop-blur-sm">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="p-4 text-center text-sm font-semibold border-r border-border/50 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="flex-1 grid grid-rows-6">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
              {week.map(day => {
                const dayAppointments = getAppointmentsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-r border-border/50 last:border-r-0 p-3 min-h-28 cursor-pointer transition-all duration-200 group",
                      !isCurrentMonth && "bg-muted/30",
                      isCurrentMonth && "hover:bg-primary/5 hover:shadow-inner"
                    )}
                    onClick={() => onDateChange(day)}
                  >
                    <div className={cn(
                      "text-sm mb-2 font-medium transition-all duration-200",
                      isToday(day) 
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg ring-2 ring-primary/20" 
                        : "group-hover:text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-1.5">
                      {dayAppointments.slice(0, 3).map(apt => (
                        <div
                          key={apt.id}
                          className={cn(
                            "text-xs p-2 rounded-lg text-white cursor-pointer truncate shadow-md border-l-3 transition-all duration-300",
                            getStatusColor(apt.status),
                            "hover:shadow-xl hover:scale-110 hover:-translate-x-0.5"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          <div className="font-bold truncate drop-shadow-sm">{apt.time}</div>
                          <div className="truncate opacity-95 text-xs font-medium">{apt.patientName}</div>
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs font-medium text-primary pl-2 pt-1 hover:underline">
                          +{dayAppointments.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-xl overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header - Melhorado */}
        <div className="p-4 border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-background rounded-lg p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('prev')}
                  className="h-9 w-9 p-0 hover-scale"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('next')}
                  className="h-9 w-9 p-0 hover-scale"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="hover-scale font-medium"
              >
                Hoje
              </Button>
              
              <h2 className="text-lg font-semibold hidden sm:block">
                {getHeaderTitle()}
              </h2>
            </div>
            
            <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-sm">
              {(['day', 'week', 'month'] as CalendarViewType[]).map(type => (
                <Button
                  key={type}
                  variant={viewType === type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewTypeChange(type)}
                  className={cn(
                    "text-xs transition-all duration-200",
                    viewType === type 
                      ? "shadow-sm" 
                      : "hover-scale"
                  )}
                >
                  {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Mobile header */}
          <h2 className="text-base font-semibold mt-3 sm:hidden">
            {getHeaderTitle()}
          </h2>
        </div>
        
        {/* Calendar content */}
        <div className="flex-1 overflow-auto">
          {viewType === 'day' && renderDayView()}
          {viewType === 'week' && renderWeekView()}
          {viewType === 'month' && renderMonthView()}
        </div>
      </CardContent>
    </Card>
  );
};