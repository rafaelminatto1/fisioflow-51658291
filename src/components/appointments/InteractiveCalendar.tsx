import React, { useState, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  EnhancedAppointment,
  CalendarEvent,
  TimeSlot,
  CalendarSettings
} from '@/types/appointment';
import { 
  generateTimeSlots,
  appointmentsToCalendarEvents,
  parseTimeString,
  formatDuration,
  DEFAULT_CALENDAR_SETTINGS
} from '@/lib/calendar';
import { ChevronLeft, ChevronRight, Plus, Clock, User, MapPin } from 'lucide-react';

interface InteractiveCalendarProps {
  appointments: EnhancedAppointment[];
  currentDate: Date;
  view: 'week' | 'day';
  settings?: CalendarSettings;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: EnhancedAppointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onAppointmentDrop?: (appointmentId: string, newDate: Date, newTime: string) => void;
  onAppointmentResize?: (appointmentId: string, newDuration: number) => void;
  readOnly?: boolean;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  draggedAppointment?: EnhancedAppointment;
  dragOffset: { x: number; y: number };
  previewPosition?: { date: Date; time: string };
}

export function InteractiveCalendar({
  appointments,
  currentDate,
  view,
  settings = DEFAULT_CALENDAR_SETTINGS,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentDrop,
  onAppointmentResize,
  readOnly = false,
  className
}: InteractiveCalendarProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragOffset: { x: 0, y: 0 }
  });

  // Generate time slots
  const timeSlots = useMemo(() => {
    return generateTimeSlots(currentDate, settings);
  }, [currentDate, settings]);

  // Get dates to display
  const displayDates = useMemo(() => {
    if (view === 'day') {
      return [currentDate];
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 6 }, (_, i) => addDays(start, i));
    }
  }, [currentDate, view]);

  // Convert appointments to calendar events
  const calendarEvents = useMemo(() => {
    return appointmentsToCalendarEvents(appointments);
  }, [appointments]);

  // Get appointments for a specific date and time
  const getAppointmentsForSlot = useCallback((date: Date, timeSlot: TimeSlot) => {
    return appointments.filter(apt => {
      if (!isSameDay(apt.date, date)) return false;
      
      const aptTime = parseTimeString(apt.time);
      const slotTime = parseTimeString(timeSlot.startTime);
      
      // Check if appointment starts within this time slot
      return aptTime.hours === slotTime.hours && aptTime.minutes === slotTime.minutes;
    });
  }, [appointments]);

  // Navigation handlers
  const handlePrevious = () => {
    const newDate = view === 'week' 
      ? addDays(currentDate, -7)
      : addDays(currentDate, -1);
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = view === 'week'
      ? addDays(currentDate, 7)
      : addDays(currentDate, 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, appointment: EnhancedAppointment) => {
    if (readOnly || !onAppointmentDrop) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragState({
      isDragging: true,
      draggedAppointment: appointment,
      dragOffset: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedAppointment) return;

    // Find the time slot under the cursor
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const timeSlotElement = element?.closest('[data-time-slot]');
    
    if (timeSlotElement) {
      const dateStr = timeSlotElement.getAttribute('data-date');
      const timeStr = timeSlotElement.getAttribute('data-time');
      
      if (dateStr && timeStr) {
        const date = parseISO(dateStr);
        setDragState(prev => ({
          ...prev,
          previewPosition: { date, time: timeStr }
        }));
      }
    }
  }, [dragState.isDragging, dragState.draggedAppointment]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedAppointment || !onAppointmentDrop) {
      setDragState({ isDragging: false, dragOffset: { x: 0, y: 0 } });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      return;
    }

    // Find the drop target
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const timeSlotElement = element?.closest('[data-time-slot]');
    
    if (timeSlotElement && dragState.previewPosition) {
      const { date, time } = dragState.previewPosition;
      onAppointmentDrop(dragState.draggedAppointment.id, date, time);
    }

    setDragState({ isDragging: false, dragOffset: { x: 0, y: 0 } });
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [dragState, onAppointmentDrop, handleMouseMove]);

  // Render appointment card
  const renderAppointment = (appointment: EnhancedAppointment, isPreview = false) => {
    const duration = formatDuration(appointment.duration);
    const endTime = format(
      addMinutes(
        parseISO(`2000-01-01T${appointment.time}`),
        appointment.duration
      ),
      'HH:mm'
    );

    return (
      <Card
        key={isPreview ? 'preview' : appointment.id}
        className={cn(
          'absolute left-1 right-1 cursor-pointer transition-all duration-200 hover:shadow-md border-l-4',
          isPreview && 'opacity-70 z-50',
          !readOnly && 'hover:scale-105'
        )}
        style={{
          backgroundColor: appointment.color ? `${appointment.color}10` : '#f3f4f6',
          borderLeftColor: appointment.color || '#6b7280',
          top: '2px',
          height: `${Math.max((appointment.duration / settings.timeSlotDuration) * 60 - 4, 40)}px`
        }}
        onMouseDown={!isPreview ? (e) => handleMouseDown(e, appointment) : undefined}
        onClick={!isPreview ? () => onAppointmentClick(appointment) : undefined}
      >
        <CardContent className="p-2 text-xs">
          <div className="flex items-center justify-between mb-1">
            <Badge
              variant="secondary"
              className="text-[10px] px-1 py-0"
              style={{ 
                backgroundColor: appointment.color || '#6b7280',
                color: '#ffffff'
              }}
            >
              {appointment.time} - {endTime}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{duration}</span>
          </div>
          <div className="font-medium text-xs truncate mb-1">
            {appointment.patientName}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              {appointment.type}
            </Badge>
          </div>
          {appointment.therapistName && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <User className="w-3 h-3" />
              <span className="truncate">{appointment.therapistName}</span>
            </div>
          )}
          {appointment.roomName && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{appointment.roomName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render time slot
  const renderTimeSlot = (date: Date, timeSlot: TimeSlot, columnIndex: number) => {
    const slotAppointments = getAppointmentsForSlot(date, timeSlot);
    const isCurrentTime = isSameDay(date, new Date()) && 
      format(new Date(), 'HH:mm') === timeSlot.startTime;
    
    const isDropTarget = dragState.previewPosition &&
      isSameDay(dragState.previewPosition.date, date) &&
      dragState.previewPosition.time === timeSlot.startTime;

    return (
      <div
        key={`${format(date, 'yyyy-MM-dd')}-${timeSlot.startTime}`}
        className={cn(
          'relative h-[60px] border-b border-r border-border/40 hover:bg-accent/50 transition-colors',
          isCurrentTime && 'bg-primary/5 border-primary/20',
          isDropTarget && 'bg-primary/10 border-primary/40',
          !readOnly && 'cursor-pointer'
        )}
        data-time-slot="true"
        data-date={date.toISOString()}
        data-time={timeSlot.startTime}
        onClick={() => !readOnly && slotAppointments.length === 0 && onTimeSlotClick(date, timeSlot.startTime)}
      >
        {/* Time label (only for first column) */}
        {columnIndex === 0 && (
          <div className="absolute -left-16 top-0 w-14 text-right text-xs text-muted-foreground">
            {timeSlot.startTime}
          </div>
        )}

        {/* Current time indicator */}
        {isCurrentTime && (
          <div className="absolute left-0 top-0 w-full h-0.5 bg-primary z-10" />
        )}

        {/* Appointments */}
        {slotAppointments.map((appointment) => renderAppointment(appointment))}

        {/* Drop preview */}
        {isDropTarget && dragState.draggedAppointment && (
          renderAppointment(dragState.draggedAppointment, true)
        )}

        {/* Add appointment button */}
        {!readOnly && slotAppointments.length === 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
            onClick={() => onTimeSlotClick(date, timeSlot.startTime)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={cn('w-full h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h2 className="text-lg font-semibold">
            {view === 'week' 
              ? `${format(displayDates[0], 'dd MMM', { locale: ptBR })} - ${format(displayDates[displayDates.length - 1], 'dd MMM yyyy', { locale: ptBR })}`
              : format(currentDate, 'dd MMMM yyyy', { locale: ptBR })
            }
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
          >
            Hoje
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Day headers */}
        <div className="flex border-b">
          <div className="w-16 flex-shrink-0"></div>
          {displayDates.map((date) => (
            <div
              key={format(date, 'yyyy-MM-dd')}
              className="flex-1 p-4 text-center border-r border-border/40"
            >
              <div className="text-sm text-muted-foreground">
                {format(date, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                'text-lg font-semibold',
                isSameDay(date, new Date()) && 'text-primary'
              )}>
                {format(date, 'dd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            <div className="w-16 flex-shrink-0"></div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${displayDates.length}, 1fr)` }}>
              {timeSlots.map((timeSlot) => (
                <React.Fragment key={timeSlot.startTime}>
                  {displayDates.map((date, columnIndex) => 
                    renderTimeSlot(date, timeSlot, columnIndex)
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag preview */}
      {dragState.isDragging && dragState.draggedAppointment && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: '0px',
            top: '0px',
            transform: 'translate3d(var(--mouse-x, 0px), var(--mouse-y, 0px), 0)'
          }}
        >
          {renderAppointment(dragState.draggedAppointment, true)}
        </div>
      )}
    </div>
  );
}