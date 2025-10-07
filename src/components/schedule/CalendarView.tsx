import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';

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
      case 'confirmed': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
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
            {TIME_SLOTS.map(time => (
              <div 
                key={time} 
                className="h-16 border-b border-border cursor-pointer hover:bg-primary/5 transition-colors group relative"
                onClick={() => onTimeSlotClick(currentDate, time)}
              >
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Clique para agendar
                </span>
              </div>
            ))}
            
            {/* Appointments overlay */}
            {dayAppointments.map(apt => {
              const startTime = parseInt(apt.time?.split(':')[0] || '9');
              const top = startTime * 64; // 64px per hour
              
              return (
                <div
                  key={apt.id}
                  className={cn(
                    "absolute left-1 right-1 p-2 rounded-lg cursor-pointer shadow-md border-l-4",
                    getStatusColor(apt.status), 
                    "text-white text-xs hover:shadow-lg transition-all duration-200 hover-scale"
                  )}
                  style={{ top: `${top}px`, height: '56px' }}
                  onClick={() => onAppointmentClick(apt)}
                >
                  <div className="font-semibold truncate text-sm">{apt.patientName}</div>
                  <div className="opacity-90 truncate text-xs mt-0.5">{apt.type}</div>
                  <div className="opacity-80 text-xs mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {apt.time}
                  </div>
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
      <div className="flex h-full">
        {/* Time column */}
        <div className="w-20 border-r border-gray-200">
          <div className="h-12 border-b border-gray-200"></div>
          {TIME_SLOTS.map(time => (
            <div key={time} className="h-16 border-b border-gray-100 p-2 text-xs text-gray-500">
              {time}
            </div>
          ))}
        </div>
        
        {/* Week days com melhor design */}
        <div className="flex-1 grid grid-cols-7 bg-background/50">
          {weekDays.map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            const isTodayDate = isToday(day);
            
            return (
              <div key={day.toISOString()} className="border-r border-border/50 last:border-r-0 relative group">
                <div className={cn(
                  "h-16 border-b sticky top-0 z-10 p-3 text-center text-sm backdrop-blur-sm transition-all duration-200",
                  isTodayDate 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md" 
                    : "bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50"
                )}>
                  <div className="font-medium">{format(day, 'EEE', { locale: ptBR })}</div>
                  <div className={cn(
                    "text-xl font-bold mt-1",
                    isTodayDate && "drop-shadow-sm"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                {/* Time slots */}
                <div className="relative">
                  {TIME_SLOTS.map(time => (
                    <div 
                      key={time} 
                      className="h-16 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => onTimeSlotClick(day, time)}
                    ></div>
                  ))}
                  
                  {/* Appointments overlay */}
                  {dayAppointments.map(apt => {
                    const startTime = parseInt(apt.time?.split(':')[0] || '9');
                    const top = startTime * 64;
                    
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "absolute left-1 right-1 p-2 rounded-lg text-white text-xs cursor-pointer shadow-lg border-l-4 backdrop-blur-sm",
                          getStatusColor(apt.status),
                          "hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                        )}
                        style={{ top: `${top}px`, height: '56px' }}
                        onClick={() => onAppointmentClick(apt)}
                      >
                        <div className="font-semibold truncate">{apt.patientName}</div>
                        <div className="opacity-90 truncate text-xs mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {apt.time}
                        </div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
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
                            "text-xs p-1.5 rounded-md text-white cursor-pointer truncate shadow-sm border-l-2 transition-all duration-200",
                            getStatusColor(apt.status),
                            "hover:shadow-md hover:scale-105"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          <div className="font-medium truncate">{apt.time}</div>
                          <div className="truncate opacity-90 text-xs">{apt.patientName}</div>
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