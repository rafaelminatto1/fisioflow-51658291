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
  onAppointmentClick
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
        
        {/* Day column */}
        <div className="flex-1 relative">
          <div className="h-12 border-b border-gray-200 p-3 bg-gray-50">
            <div className="font-medium text-center">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
          </div>
          
          {/* Time slots */}
          <div className="relative">
            {TIME_SLOTS.map(time => (
              <div key={time} className="h-16 border-b border-gray-100"></div>
            ))}
            
            {/* Appointments overlay */}
            {dayAppointments.map(apt => {
              const startTime = parseInt(apt.time?.split(':')[0] || '9');
              const top = startTime * 64; // 64px per hour
              
              return (
                <div
                  key={apt.id}
                  className={cn(
                    "absolute left-1 right-1 p-2 rounded-lg cursor-pointer shadow-sm",
                    getStatusColor(apt.status), 
                    "text-white text-xs hover:shadow-md transition-shadow"
                  )}
                  style={{ top: `${top}px`, height: '56px' }}
                  onClick={() => onAppointmentClick(apt)}
                >
                  <div className="font-medium truncate">{apt.patientName}</div>
                  <div className="opacity-90 truncate">{apt.type}</div>
                  <div className="opacity-75">{apt.time}</div>
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
        
        {/* Week days */}
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            
            return (
              <div key={day.toISOString()} className="border-r border-gray-200 last:border-r-0">
                <div className={cn(
                  "h-12 border-b border-gray-200 p-2 text-center text-sm",
                  isToday(day) ? "bg-blue-100 text-blue-800 font-medium" : "bg-gray-50"
                )}>
                  <div>{format(day, 'EEE', { locale: ptBR })}</div>
                  <div className={cn(
                    "text-lg",
                    isToday(day) ? "font-bold" : "font-medium"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                {/* Time slots */}
                <div className="relative">
                  {TIME_SLOTS.map(time => (
                    <div key={time} className="h-16 border-b border-gray-100"></div>
                  ))}
                  
                  {/* Appointments overlay */}
                  {dayAppointments.map(apt => {
                    const startTime = parseInt(apt.time?.split(':')[0] || '9');
                    const top = startTime * 64;
                    
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "absolute left-0.5 right-0.5 p-1 rounded text-white text-xs cursor-pointer shadow-sm",
                          getStatusColor(apt.status),
                          "hover:shadow-md transition-shadow"
                        )}
                        style={{ top: `${top}px`, height: '56px' }}
                        onClick={() => onAppointmentClick(apt)}
                      >
                        <div className="font-medium truncate text-xs">{apt.patientName}</div>
                        <div className="opacity-90 truncate text-xs">{apt.time}</div>
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
      <div className="h-full flex flex-col">
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50">
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
                      "border-r border-gray-200 last:border-r-0 p-2 min-h-24 cursor-pointer hover:bg-gray-50",
                      !isCurrentMonth && "bg-gray-50 text-gray-400"
                    )}
                    onClick={() => onDateChange(day)}
                  >
                    <div className={cn(
                      "text-sm mb-1",
                      isToday(day) && "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-medium"
                    )}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map(apt => (
                        <div
                          key={apt.id}
                          className={cn(
                            "text-xs p-1 rounded text-white cursor-pointer truncate",
                            getStatusColor(apt.status)
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          {apt.time} - {apt.patientName}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
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
    <Card className="h-full flex flex-col border-0 shadow-lg">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateCalendar('prev')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateCalendar('next')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Hoje
                </Button>
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900">
                {getHeaderTitle()}
              </h2>
            </div>
            
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
              {(['day', 'week', 'month'] as CalendarViewType[]).map(type => (
                <Button
                  key={type}
                  variant={viewType === type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewTypeChange(type)}
                  className={cn(
                    "text-xs",
                    viewType === type 
                      ? "bg-blue-600 text-white shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </div>
          </div>
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