import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';

interface AdvancedCalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  view: 'week' | 'day' | 'month';
  onViewChange: (view: 'week' | 'day' | 'month') => void;
  loading?: boolean;
  className?: string;
}

export function AdvancedCalendar({
  appointments,
  currentDate,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  view,
  onViewChange,
  loading = false,
  className
}: AdvancedCalendarProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null);

  // Generate time slots (7:00 to 19:00, every 30 minutes)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour < 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Get week days based on current date
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 6 }, (_, i) => addDays(start, i)); // Monday to Saturday
  }, [currentDate]);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    switch (view) {
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(subDays(currentDate, 30));
        break;
    }
  }, [currentDate, view, onDateChange]);

  const navigateNext = useCallback(() => {
    switch (view) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(addDays(currentDate, 30));
        break;
    }
  }, [currentDate, view, onDateChange]);

  const goToToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  // Get appointments for a specific date and time
  const getAppointmentsForSlot = useCallback((date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => 
      apt.appointment_date === dateStr && 
      apt.start_time <= time && 
      apt.end_time > time &&
      apt.status !== 'cancelled'
    );
  }, [appointments]);

  // Get status color for appointment
  const getStatusColor = useCallback((status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  // Get type color for appointment
  const getTypeColor = useCallback((type: Appointment['type']) => {
    switch (type) {
      case 'consultation':
        return 'bg-blue-500';
      case 'treatment':
        return 'bg-green-500';
      case 'evaluation':
        return 'bg-orange-500';
      case 'follow_up':
        return 'bg-purple-500';
      case 'group_session':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  }, []);

  // Handle time slot click
  const handleTimeSlotClick = useCallback((date: Date, time: string) => {
    const appointmentsInSlot = getAppointmentsForSlot(date, time);
    if (appointmentsInSlot.length === 0) {
      setSelectedTimeSlot({ date, time });
      onTimeSlotClick(date, time);
    }
  }, [getAppointmentsForSlot, onTimeSlotClick]);

  // Render calendar header
  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={navigatePrevious}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateNext}
            disabled={loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            disabled={loading}
          >
            Hoje
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="font-semibold text-lg">
            {view === 'day' && format(currentDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
            {view === 'week' && `Semana de ${format(weekDays[0], "dd 'de' MMMM", { locale: ptBR })}`}
            {view === 'month' && format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <Button
            variant={view === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('day')}
            disabled={loading}
          >
            Dia
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
            disabled={loading}
          >
            Semana
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
            disabled={loading}
          >
            Mês
          </Button>
        </div>
      </div>
    </div>
  );

  // Render week view
  const renderWeekView = () => (
    <div className="flex flex-col h-full">
      {/* Days header */}
      <div className="grid grid-cols-7 border-b">
        <div className="p-2 text-center text-sm font-medium text-gray-500 border-r">
          Horário
        </div>
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className={cn(
              "p-2 text-center border-r text-sm font-medium",
              isToday(day) && "bg-blue-50 text-blue-700"
            )}
          >
            <div>{format(day, 'EEE', { locale: ptBR })}</div>
            <div className={cn(
              "text-lg",
              isToday(day) && "font-bold"
            )}>
              {format(day, 'dd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto">
        {timeSlots.map((time) => (
          <div key={time} className="grid grid-cols-7 border-b hover:bg-gray-50">
            <div className="p-2 text-xs text-gray-500 border-r bg-gray-50 flex items-center justify-center">
              {time}
            </div>
            {weekDays.map((day, dayIndex) => {
              const appointmentsInSlot = getAppointmentsForSlot(day, time);
              const isSelected = selectedTimeSlot?.date === day && selectedTimeSlot?.time === time;
              
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "p-1 border-r min-h-[60px] cursor-pointer relative",
                    appointmentsInSlot.length === 0 && "hover:bg-blue-50",
                    isSelected && "bg-blue-100"
                  )}
                  onClick={() => handleTimeSlotClick(day, time)}
                >
                  {appointmentsInSlot.map((appointment) => (
                    <TooltipProvider key={appointment.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "rounded p-1 mb-1 text-xs cursor-pointer border",
                              getStatusColor(appointment.status)
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick(appointment);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <div 
                                className={cn("w-2 h-2 rounded-full", getTypeColor(appointment.type))}
                              />
                              <span className="truncate font-medium">
                                {appointment.patient?.full_name}
                              </span>
                            </div>
                            <div className="text-xs opacity-75">
                              {appointment.start_time}-{appointment.end_time}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-medium">{appointment.patient?.full_name}</div>
                            <div className="text-sm">
                              {appointment.start_time} - {appointment.end_time}
                            </div>
                            <div className="text-sm">
                              Tipo: {appointment.type}
                            </div>
                            <div className="text-sm">
                              Status: {appointment.status}
                            </div>
                            {appointment.notes && (
                              <div className="text-sm">
                                Obs: {appointment.notes}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // Render day view
  const renderDayView = () => (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className="border-b p-4 text-center">
        <div className="text-2xl font-bold">
          {format(currentDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
        </div>
        <div className="text-sm text-gray-500">
          {format(currentDate, 'EEEE', { locale: ptBR })}
        </div>
      </div>

      {/* Time slots for single day */}
      <div className="flex-1 overflow-y-auto">
        {timeSlots.map((time) => {
          const appointmentsInSlot = getAppointmentsForSlot(currentDate, time);
          const isSelected = selectedTimeSlot?.date === currentDate && selectedTimeSlot?.time === time;
          
          return (
            <div
              key={time}
              className={cn(
                "flex border-b hover:bg-gray-50 min-h-[80px]",
                isSelected && "bg-blue-100"
              )}
            >
              <div className="w-20 p-4 text-sm text-gray-500 border-r bg-gray-50 flex items-center justify-center">
                {time}
              </div>
              <div
                className={cn(
                  "flex-1 p-2 cursor-pointer relative",
                  appointmentsInSlot.length === 0 && "hover:bg-blue-50"
                )}
                onClick={() => handleTimeSlotClick(currentDate, time)}
              >
                {appointmentsInSlot.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Clique para agendar
                  </div>
                ) : (
                  appointmentsInSlot.map((appointment) => (
                    <div
                      key={appointment.id}
                      className={cn(
                        "rounded-lg p-3 mb-2 cursor-pointer border shadow-sm",
                        getStatusColor(appointment.status)
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appointment);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className={cn("w-3 h-3 rounded-full", getTypeColor(appointment.type))}
                            />
                            <span className="font-semibold">
                              {appointment.patient?.full_name}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {appointment.start_time} - {appointment.end_time}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Tipo: {appointment.type}</span>
                            {appointment.room && <span>Sala: {appointment.room}</span>}
                          </div>
                          {appointment.notes && (
                            <div className="text-sm text-gray-600 mt-2">
                              {appointment.notes}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Carregando agenda...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      {renderHeader()}
      <CardContent className="flex-1 p-0 overflow-hidden">
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'month' && (
          <div className="p-4 text-center text-gray-500">
            Visualização mensal em desenvolvimento
          </div>
        )}
      </CardContent>
    </Card>
  );
}