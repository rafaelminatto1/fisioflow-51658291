import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { AppointmentCard } from './AppointmentCard';
import { generateTimeSlots } from '@/lib/config/agenda';
import { RescheduleConfirmDialog } from './RescheduleConfirmDialog';

export type CalendarViewType = 'day' | 'week' | 'month';

interface DragState {
  appointment: Appointment | null;
  isDragging: boolean;
}

interface DropTarget {
  date: Date;
  time: string;
}

interface CalendarViewProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
  isRescheduling?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  currentDate,
  onDateChange,
  viewType,
  onViewTypeChange,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentReschedule,
  isRescheduling = false
}) => {
  // Current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({ appointment: null, isDragging: false });
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingReschedule, setPendingReschedule] = useState<{ appointment: Appointment; newDate: Date; newTime: string } | null>(null);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
    if (!onAppointmentReschedule) return;
    e.dataTransfer.setData('text/plain', appointment.id);
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ appointment, isDragging: true });
  }, [onAppointmentReschedule]);

  const handleDragEnd = useCallback(() => {
    setDragState({ appointment: null, isDragging: false });
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, date: Date, time: string) => {
    if (!dragState.isDragging || !onAppointmentReschedule) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ date, time });
  }, [dragState.isDragging, onAppointmentReschedule]);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    if (!dragState.appointment || !onAppointmentReschedule) return;

    // Verificar se é o mesmo horário
    const oldDate = typeof dragState.appointment.date === 'string' 
      ? new Date(dragState.appointment.date) 
      : dragState.appointment.date;
    
    if (isSameDay(oldDate, date) && dragState.appointment.time === time) {
      handleDragEnd();
      return;
    }

    // Abrir diálogo de confirmação
    setPendingReschedule({ appointment: dragState.appointment, newDate: date, newTime: time });
    setShowConfirmDialog(true);
    handleDragEnd();
  }, [dragState.appointment, onAppointmentReschedule, handleDragEnd]);

  const handleConfirmReschedule = useCallback(async () => {
    if (!pendingReschedule || !onAppointmentReschedule) return;
    
    try {
      await onAppointmentReschedule(pendingReschedule.appointment, pendingReschedule.newDate, pendingReschedule.newTime);
      setShowConfirmDialog(false);
      setPendingReschedule(null);
    } catch (error) {
      console.error('Erro ao reagendar:', error);
    }
  }, [pendingReschedule, onAppointmentReschedule]);

  const handleCancelReschedule = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingReschedule(null);
  }, []);

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
      case 'falta':
      case 'no_show_confirmed':
        return 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400 shadow-rose-500/30';
      case 'atrasado':
      case 'late': 
        return 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-400 shadow-yellow-500/30';
      default: 
        return 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400 shadow-gray-500/30';
    }
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate);
    const timeSlots = generateTimeSlots(currentDate);
    
    return (
      <div className="flex h-full bg-gradient-to-br from-background to-muted/20">
        {/* Time column com design melhorado */}
        <div className="w-24 border-r bg-muted/30 backdrop-blur-sm">
          <div className="h-16 border-b flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {timeSlots.map(time => (
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
            {timeSlots.map(time => {
              const hour = parseInt(time.split(':')[0]);
              const isCurrentHour = hour === currentTime.getHours();
              const isDropTarget = dropTarget && isSameDay(dropTarget.date, currentDate) && dropTarget.time === time;
              
              return (
                <div 
                  key={time} 
                  className={cn(
                    "h-16 border-b border-border cursor-pointer hover:bg-primary/5 transition-colors group relative",
                    isCurrentHour && "bg-primary/5",
                    isDropTarget && "bg-primary/20 ring-2 ring-primary ring-inset"
                  )}
                  onClick={() => onTimeSlotClick(currentDate, time)}
                  onDragOver={(e) => handleDragOver(e, currentDate, time)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, currentDate, time)}
                >
                  <span className={cn(
                    "absolute inset-0 flex items-center justify-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                    isDropTarget && "opacity-100 text-primary font-medium"
                  )}>
                    {isDropTarget ? 'Soltar aqui' : 'Clique para agendar'}
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
              const [hours, minutes] = (apt.time || '09:00').split(':').map(Number);
              const slotIndex = timeSlots.findIndex(slot => {
                const [slotHour, slotMin] = slot.split(':').map(Number);
                return slotHour === hours && slotMin === minutes;
              });
              
              // Calcular altura baseada na duração (cada slot = 64px, cada slot = 30min)
              const duration = apt.duration || 60;
              const heightInPixels = (duration / 30) * 64;
              const top = slotIndex >= 0 ? slotIndex * 64 : 0;
              const isDraggable = !!onAppointmentReschedule;
              
              return (
                <div
                  key={apt.id}
                  draggable={isDraggable}
                  onDragStart={(e) => handleDragStart(e, apt)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "absolute left-1 right-1 p-2 rounded-xl text-white cursor-pointer shadow-xl border-l-4 backdrop-blur-sm animate-fade-in overflow-hidden",
                    getStatusColor(apt.status),
                    "hover:shadow-2xl hover:scale-[1.02] hover:z-20 transition-all duration-300",
                    isDraggable && "cursor-grab active:cursor-grabbing",
                    dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50 scale-95"
                  )}
                  style={{ 
                    top: `${top}px`, 
                    height: `${heightInPixels}px`
                  }}
                  onClick={() => onAppointmentClick(apt)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-bold text-sm truncate leading-tight flex-1">
                      {apt.patientName}
                    </div>
                    {isDraggable && (
                      <GripVertical className="h-4 w-4 opacity-50 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs opacity-90 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>{apt.time}</span>
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
    const timeSlots = generateTimeSlots(currentDate);
    
    return (
      <div className="flex">
        {/* Time column - Sticky e otimizado */}
        <div className="w-16 sm:w-20 border-r border-border/50 bg-gradient-to-b from-card via-muted/30 to-muted/50 flex-shrink-0 sticky left-0 z-10 shadow-sm">
          <div className="h-14 sm:h-16 border-b border-border/50 flex items-center justify-center sticky top-0 bg-gradient-primary backdrop-blur-sm z-20 shadow-md">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
          </div>
          {timeSlots.map(time => (
            <div key={time} className="h-12 sm:h-16 border-b border-border/30 p-1 sm:p-2 text-[10px] sm:text-xs text-foreground/70 font-bold flex items-center justify-center hover:bg-accent/50 transition-colors">
              {time}
            </div>
          ))}
        </div>
        
        {/* Week days - Grid com scroll horizontal suave */}
        <div className="flex-1 overflow-x-auto">
          <div className="inline-flex sm:grid sm:grid-cols-7 min-w-full bg-background/30">
            {weekDays.map(day => {
              const dayAppointments = getAppointmentsForDate(day);
              const isTodayDate = isToday(day);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className="w-[140px] sm:w-auto border-r border-border/50 last:border-r-0 relative group flex-shrink-0"
                >
                  <div className={cn(
                    "h-14 sm:h-16 border-b border-border/50 sticky top-0 z-10 p-2 sm:p-3 text-center text-xs sm:text-sm backdrop-blur-md transition-all duration-300 shadow-sm",
                    isTodayDate 
                      ? "bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 ring-2 ring-primary/40" 
                      : "bg-gradient-to-br from-muted/60 to-muted/40 hover:from-muted/80 hover:to-muted/60"
                  )}>
                    <div className="font-extrabold uppercase tracking-wider text-[10px] sm:text-xs">
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={cn(
                      "text-lg sm:text-2xl font-black mt-0.5 sm:mt-1",
                      isTodayDate && "drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  {/* Time slots interativos */}
                  <div className="relative">
                    {timeSlots.map(time => {
                      const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;
                      
                      return (
                        <div 
                          key={time} 
                          className={cn(
                            "h-12 sm:h-16 border-b border-border/20 cursor-pointer hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 active:bg-primary/20 transition-all duration-200 group/slot relative",
                            isDropTarget && "bg-primary/25 ring-2 ring-primary ring-inset"
                          )}
                          onClick={() => onTimeSlotClick(day, time)}
                          onDragOver={(e) => handleDragOver(e, day, time)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, time)}
                        >
                          <span className={cn(
                            "absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-foreground opacity-0 group-hover/slot:opacity-100 transition-all duration-200 scale-95 group-hover/slot:scale-100 pointer-events-none",
                            isDropTarget && "opacity-100"
                          )}>
                            <span className="bg-gradient-primary px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg">
                              {isDropTarget ? '↓ Soltar' : '+ Novo'}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                    
                    {/* Appointments overlay - Cards melhorados */}
                    {dayAppointments.map(apt => {
                      const [hours, minutes] = (apt.time || '09:00').split(':').map(Number);
                      const slotIndex = timeSlots.findIndex(slot => {
                        const [slotHour, slotMin] = slot.split(':').map(Number);
                        return slotHour === hours && slotMin === minutes;
                      });
                      
                      // Altura e posição baseada na duração: 48px/slot mobile, 64px/slot desktop (cada slot = 30min)
                      const duration = apt.duration || 60;
                      const slots = duration / 30;
                      const heightMobile = slots * 48; // h-12 = 48px
                      const heightDesktop = slots * 64; // sm:h-16 = 64px
                      const topMobile = slotIndex >= 0 ? slotIndex * 48 : 0;
                      const topDesktop = slotIndex >= 0 ? slotIndex * 64 : 0;
                      const isDraggable = !!onAppointmentReschedule;
                      
                      return (
                        <div
                          key={apt.id}
                          draggable={isDraggable}
                          onDragStart={(e) => handleDragStart(e, apt)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "absolute left-0.5 right-0.5 sm:left-1 sm:right-1 p-1.5 sm:p-2.5 rounded-xl text-white cursor-pointer shadow-xl border-l-[3px] sm:border-l-4 backdrop-blur-sm animate-fade-in overflow-hidden",
                            getStatusColor(apt.status),
                            "hover:shadow-2xl hover:scale-[1.02] hover:z-20 transition-all duration-200 group/card",
                            isDraggable && "cursor-grab active:cursor-grabbing",
                            dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50 scale-95"
                          )}
                          style={{ 
                            top: `${topMobile}px`,
                            height: `${heightMobile}px`,
                            ['--top-desktop' as any]: `${topDesktop}px`,
                            ['--height-desktop' as any]: `${heightDesktop}px`
                          } as React.CSSProperties}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          <style dangerouslySetInnerHTML={{__html: `
                            @media (min-width: 640px) {
                              [style*="--top-desktop"][style*="--height-desktop"] {
                                top: var(--top-desktop) !important;
                                height: var(--height-desktop) !important;
                              }
                            }
                          `}} />
                          <div className="flex items-start justify-between gap-0.5">
                            <div className="font-extrabold drop-shadow-md leading-tight text-[11px] sm:text-xs truncate flex-1">
                              {apt.patientName}
                            </div>
                            {isDraggable && (
                              <GripVertical className="h-3 w-3 opacity-50 flex-shrink-0 hidden sm:block" />
                            )}
                          </div>
                          <div className="opacity-95 text-[9px] sm:text-xs mt-0.5 flex items-center gap-1 font-semibold">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                            <span>{apt.time}</span>
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
    <>
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
        
        {/* Calendar content - Scroll otimizado */}
        <div className={cn(
          "flex-1",
          viewType === 'week' ? "overflow-x-hidden" : "overflow-visible"
        )}>
          {viewType === 'day' && renderDayView()}
          {viewType === 'week' && renderWeekView()}
          {viewType === 'month' && renderMonthView()}
        </div>
      </CardContent>
    </Card>

    {/* Reschedule Confirmation Dialog */}
    <RescheduleConfirmDialog
      open={showConfirmDialog}
      onOpenChange={(open) => {
        if (!open) handleCancelReschedule();
      }}
      appointment={pendingReschedule?.appointment || null}
      newDate={pendingReschedule?.newDate || null}
      newTime={pendingReschedule?.newTime || null}
      onConfirm={handleConfirmReschedule}
      isPending={isRescheduling}
    />
    </>
  );
};