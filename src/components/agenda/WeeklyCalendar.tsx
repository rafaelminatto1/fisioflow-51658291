import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgenda } from '@/hooks/useAgenda';
import { formatDate, addDays } from '@/utils/agendaUtils';
import { cn } from '@/lib/utils';

interface WeeklyCalendarProps {
  onTimeSlotClick?: (date: string, time: string) => void;
  onAppointmentClick?: (appointmentId: string) => void;
  onAppointmentHover?: (appointmentId: string | null) => void;
  showTooltips?: boolean;
  enableKeyboardNavigation?: boolean;
  className?: string;
}

const WeeklyCalendarComponent = memo(function WeeklyCalendar({
  onTimeSlotClick,
  onAppointmentClick,
  onAppointmentHover,
  showTooltips = true,
  enableKeyboardNavigation = true,
  className
}: WeeklyCalendarProps) {
  const {
    currentWeek,
    weeklyData,
    isLoading,
    goToPreviousWeek,
    goToNextWeek,
    goToToday,
    isCurrentWeek
  } = useAgenda();

  const [hoveredSlot, setHoveredSlot] = useState<{ date: string; time: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  // Generate time slots from 7:00 to 19:00 with 30-minute intervals
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 7; hour < 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Generate week days starting from Monday
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(currentWeek, i);
      days.push({
        date,
        dateString: formatDate(date),
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: formatDate(date) === formatDate(new Date()),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    return days;
  }, [currentWeek]);

  // Handle time slot click
  const handleTimeSlotClick = useCallback((dateString: string, time: string) => {
    setSelectedSlot({ date: dateString, time });
    if (onTimeSlotClick) {
      onTimeSlotClick(dateString, time);
    }
  }, [onTimeSlotClick]);

  // Handle time slot hover
  const handleTimeSlotHover = useCallback((dateString: string, time: string) => {
    setHoveredSlot({ date: dateString, time });
  }, []);

  // Handle time slot leave
  const handleTimeSlotLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  // Handle appointment hover
  const handleAppointmentHover = useCallback((appointmentId: string | null) => {
    if (onAppointmentHover) {
      onAppointmentHover(appointmentId);
    }
  }, [onAppointmentHover]);

  // Get appointments for a specific date and time
  const getAppointmentsForSlot = useCallback((dateString: string, time: string) => {
    if (!weeklyData?.appointments) return [];
    
    return weeklyData.appointments.filter(appointment => {
      return appointment.date === dateString && appointment.start_time === time;
    });
  }, [weeklyData?.appointments]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            goToPreviousWeek();
          }
          break;
        case 'ArrowRight':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            goToNextWeek();
          }
          break;
        case 'Home':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            goToToday();
          }
          break;
        case 't':
          if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            goToToday();
          }
          break;
        case 'Escape':
          setSelectedSlot(null);
          setHoveredSlot(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNavigation, goToPreviousWeek, goToNextWeek, goToToday]);

  return (
    <TooltipProvider>
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-4">
          <WeeklyCalendarHeader
            currentWeek={currentWeek}
            isCurrentWeek={isCurrentWeek}
            isLoading={isLoading}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            onToday={goToToday}
          />
        </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] md:min-w-[600px] lg:min-w-[800px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 border-b">
              {/* Time column header */}
              <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r">
                Horário
              </div>
              
              {/* Day headers */}
              {weekDays.map((day) => (
                <div
                  key={day.dateString}
                  className={cn(
                    "p-2 md:p-3 text-center border-r last:border-r-0",
                    day.isToday && "bg-primary/5",
                    day.isWeekend && "bg-muted/30"
                  )}
                >
                  <div className="space-y-1">
                    <div className={cn(
                      "text-xs font-medium",
                      day.isToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      <span className="hidden md:inline">{day.dayName}</span>
                      <span className="md:hidden">{day.dayName.slice(0, 3)}</span>
                    </div>
                    <div className={cn(
                      "text-base md:text-lg font-semibold",
                      day.isToday && "text-primary"
                    )}>
                      {day.dayNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="divide-y">
              {timeSlots.map((time) => (
                <TimeSlotRow
                  key={time}
                  time={time}
                  weekDays={weekDays}
                  getAppointmentsForSlot={getAppointmentsForSlot}
                  onTimeSlotClick={handleTimeSlotClick}
                  onTimeSlotHover={handleTimeSlotHover}
                  onTimeSlotLeave={handleTimeSlotLeave}
                  onAppointmentClick={onAppointmentClick}
                  onAppointmentHover={handleAppointmentHover}
                  hoveredSlot={hoveredSlot}
                  selectedSlot={selectedSlot}
                  showTooltips={showTooltips}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">Carregando agenda...</p>
            </div>
          </div>
        )}

        {/* Keyboard shortcuts help */}
        {enableKeyboardNavigation && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            <div className="space-y-1">
              <div>Ctrl+← / Ctrl+→: Navegar semanas</div>
              <div>T: Ir para hoje</div>
              <div>Esc: Limpar seleção</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}

// Header component for the weekly calendar
interface WeeklyCalendarHeaderProps {
  currentWeek: Date;
  isCurrentWeek: boolean;
  isLoading: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

const WeeklyCalendarHeader = memo(function WeeklyCalendarHeader({
  currentWeek,
  isCurrentWeek,
  isLoading,
  onPreviousWeek,
  onNextWeek,
  onToday
}: WeeklyCalendarHeaderProps) {
  const weekRange = useMemo(() => {
    const weekEnd = addDays(currentWeek, 6);
    const startFormatted = currentWeek.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
    const endFormatted = weekEnd.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return `${startFormatted} - ${endFormatted}`;
  }, [currentWeek]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousWeek}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Anterior</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNextWeek}
            disabled={isLoading}
          >
            <span className="hidden md:inline mr-1">Próxima</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          <h2 className="text-sm md:text-lg font-semibold">{weekRange}</h2>
          {isCurrentWeek && (
            <Badge variant="secondary" className="text-xs hidden md:inline-flex">
              Semana Atual
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={isCurrentWeek ? "secondary" : "outline"}
          size="sm"
          onClick={onToday}
          disabled={isLoading}
        >
          Hoje
        </Button>
      </div>
    </div>
  );
});

// Individual time slot row component
interface TimeSlotRowProps {
  time: string;
  weekDays: Array<{
    date: Date;
    dateString: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    isWeekend: boolean;
  }>;
  getAppointmentsForSlot: (dateString: string, time: string) => any[];
  onTimeSlotClick?: (dateString: string, time: string) => void;
  onTimeSlotHover?: (dateString: string, time: string) => void;
  onTimeSlotLeave?: () => void;
  onAppointmentClick?: (appointmentId: string) => void;
  onAppointmentHover?: (appointmentId: string | null) => void;
  hoveredSlot?: { date: string; time: string } | null;
  selectedSlot?: { date: string; time: string } | null;
  showTooltips?: boolean;
  isLoading: boolean;
}

const TimeSlotRow = memo(function TimeSlotRow({
  time,
  weekDays,
  getAppointmentsForSlot,
  onTimeSlotClick,
  onTimeSlotHover,
  onTimeSlotLeave,
  onAppointmentClick,
  onAppointmentHover,
  hoveredSlot,
  selectedSlot,
  showTooltips,
  isLoading
}: TimeSlotRowProps) {
  const isHourMark = time.endsWith(':00');

  return (
    <div className={cn(
      "grid grid-cols-8 min-h-[50px] md:min-h-[60px]",
      isHourMark && "border-t-2"
    )}>
      {/* Time label */}
      <div className={cn(
        "flex items-center justify-center text-sm border-r",
        isHourMark ? "font-medium text-foreground" : "text-muted-foreground"
      )}>
        {time}
      </div>

      {/* Day slots */}
      {weekDays.map((day) => {
        const appointments = getAppointmentsForSlot(day.dateString, time);
        const hasAppointments = appointments.length > 0;

        return (
          <TimeSlot
            key={`${day.dateString}-${time}`}
            dateString={day.dateString}
            time={time}
            appointments={appointments}
            isToday={day.isToday}
            isWeekend={day.isWeekend}
            hasAppointments={hasAppointments}
            isHovered={hoveredSlot?.date === day.dateString && hoveredSlot?.time === time}
            isSelected={selectedSlot?.date === day.dateString && selectedSlot?.time === time}
            onClick={onTimeSlotClick}
            onHover={onTimeSlotHover}
            onLeave={onTimeSlotLeave}
            onAppointmentClick={onAppointmentClick}
            onAppointmentHover={onAppointmentHover}
            showTooltips={showTooltips}
            disabled={isLoading}
          />
        );
      })}
    </div>
  );
});

// Individual time slot component
interface TimeSlotProps {
  dateString: string;
  time: string;
  appointments: any[];
  isToday: boolean;
  isWeekend: boolean;
  hasAppointments: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  onClick?: (dateString: string, time: string) => void;
  onHover?: (dateString: string, time: string) => void;
  onLeave?: () => void;
  onAppointmentClick?: (appointmentId: string) => void;
  onAppointmentHover?: (appointmentId: string | null) => void;
  showTooltips?: boolean;
  disabled: boolean;
}

const TimeSlot = memo(function TimeSlot({
  dateString,
  time,
  appointments,
  isToday,
  isWeekend,
  hasAppointments,
  isHovered,
  isSelected,
  onClick,
  onHover,
  onLeave,
  onAppointmentClick,
  onAppointmentHover,
  showTooltips,
  disabled
}: TimeSlotProps) {
  const handleClick = useCallback(() => {
    if (disabled) return;
    
    if (hasAppointments && onAppointmentClick) {
      // If there are appointments, click on the first one
      onAppointmentClick(appointments[0].id);
    } else if (onClick) {
      // If no appointments, allow creating new one
      onClick(dateString, time);
    }
  }, [disabled, hasAppointments, appointments, onAppointmentClick, onClick, dateString, time]);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    if (onHover) {
      onHover(dateString, time);
    }
  }, [disabled, onHover, dateString, time]);

  const handleMouseLeave = useCallback(() => {
    if (disabled) return;
    if (onLeave) {
      onLeave();
    }
  }, [disabled, onLeave]);

  const handleAppointmentMouseEnter = useCallback((appointmentId: string) => {
    if (onAppointmentHover) {
      onAppointmentHover(appointmentId);
    }
  }, [onAppointmentHover]);

  const handleAppointmentMouseLeave = useCallback(() => {
    if (onAppointmentHover) {
      onAppointmentHover(null);
    }
  }, [onAppointmentHover]);

  const slotContent = (
    <div
      className={cn(
        "relative border-r last:border-r-0 cursor-pointer transition-all duration-200",
        "hover:bg-muted/50",
        isToday && "bg-primary/5",
        isWeekend && "bg-muted/20",
        hasAppointments && "bg-blue-50 hover:bg-blue-100",
        isHovered && "bg-primary/10 ring-1 ring-primary/20",
        isSelected && "bg-primary/20 ring-2 ring-primary/40",
        disabled && "cursor-not-allowed opacity-50"
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-time-slot
      data-date={dateString}
      data-time={time}
    >
      {/* Empty slot indicator */}
      {!hasAppointments && !disabled && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0 hover:opacity-100"
        )}>
          <div className="flex flex-col items-center gap-1">
            <Plus className="h-4 w-4 text-muted-foreground" />
            {isHovered && (
              <span className="text-xs text-muted-foreground">Novo agendamento</span>
            )}
          </div>
        </div>
      )}

      {/* Time indicator for hovered empty slots */}
      {!hasAppointments && isHovered && (
        <div className="absolute top-1 left-1 text-xs text-primary font-medium bg-primary/10 px-1 rounded">
          {time}
        </div>
      )}

      {/* Appointments */}
      {hasAppointments && (
        <div 
          className="p-1"
          onMouseEnter={() => handleAppointmentMouseEnter(appointments[0].id)}
          onMouseLeave={handleAppointmentMouseLeave}
        >
          {appointments.length === 1 ? (
            <NewAppointmentBlock
              appointment={appointments[0]}
              onClick={() => onAppointmentClick?.(appointments[0].id)}
              size="compact"
              showPaymentStatus={true}
              showTimeInfo={true}
            />
          ) : (
            <MultiAppointmentBlock
              appointments={appointments}
              onClick={onAppointmentClick}
              maxVisible={2}
            />
          )}
        </div>
      )}
    </div>
  );

  // Wrap with tooltip if enabled and has appointments
  if (showTooltips && hasAppointments && appointments.length > 0) {
    const appointment = appointments[0];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {slotContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{appointment.patient?.name || 'Paciente'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{appointment.start_time} - {appointment.end_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
                {appointment.status === 'scheduled' ? 'Agendado' : 
                 appointment.status === 'completed' ? 'Concluído' : 
                 appointment.status === 'cancelled' ? 'Cancelado' : 'Faltou'}
              </Badge>
              <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'destructive'}>
                {appointment.payment_status === 'paid' ? 'Pago' : 'Pendente'}
              </Badge>
            </div>
            {appointment.notes && (
              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return slotContent;
});

export const WeeklyCalendar = WeeklyCalendarComponent;

// Import the new appointment components
import { AppointmentBlock as NewAppointmentBlock, MultiAppointmentBlock } from './AppointmentBlock';