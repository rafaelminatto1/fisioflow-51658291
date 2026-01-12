import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Appointment } from '@/types/appointment';

import { generateTimeSlots } from '@/lib/config/agenda';
import { RescheduleConfirmDialog } from './RescheduleConfirmDialog';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarMonthView } from './CalendarMonthView';
import { useCalendarDrag } from '@/hooks/useCalendarDrag';

export type CalendarViewType = 'day' | 'week' | 'month';

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
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (appointment: Appointment) => void;
}

export const CalendarView = memo(({
  appointments,
  currentDate,
  onDateChange,
  viewType,
  onViewTypeChange,
  onAppointmentClick: _onAppointmentClick,
  onTimeSlotClick,
  onAppointmentReschedule,
  isRescheduling = false,
  onEditAppointment,
  onDeleteAppointment,
}: CalendarViewProps) => {
  // State for appointment quick view popover
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  // Current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  // Drag and drop logic from hook
  const {
    dragState,
    dropTarget,
    showConfirmDialog,
    pendingReschedule,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleConfirmReschedule,
    handleCancelReschedule
  } = useCalendarDrag({ onAppointmentReschedule });

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

  const navigateCalendar = useCallback((direction: 'prev' | 'next') => {
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
  }, [viewType, currentDate, onDateChange]);

  const goToToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  const getHeaderTitle = useCallback(() => {
    switch (viewType) {
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
      }
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  }, [viewType, currentDate]);

  const getAppointmentsForDate = useCallback((date: Date) => {
    return (appointments || []).filter(apt => {
      if (!apt || !apt.date) return false;

      const aptDate = typeof apt.date === 'string'
        ? (() => {
          const parts = apt.date.split('-');
          if (parts.length !== 3) return new Date('Invalid');
          const [y, m, d] = parts.map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        })()
        : apt.date;

      // Ensure we have a valid date object before comparison
      if (!(aptDate instanceof Date) || isNaN(aptDate.getTime())) return false;

      return isSameDay(aptDate, date);
    });
  }, [appointments]);

  const getStatusColor = useCallback((status: string, isOverCapacity: boolean = false) => {
    // Over-capacity appointments get a special amber/orange pulsing style
    if (isOverCapacity) {
      return 'bg-gradient-to-br from-amber-600 to-orange-600 border-amber-400 shadow-amber-500/40 ring-2 ring-amber-400/50 ring-offset-1';
    }

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
  }, []);

  // Helper to check if appointment is over capacity
  const isOverCapacity = useCallback((apt: Appointment): boolean => {
    return apt.notes?.includes('[EXCEDENTE]') || false;
  }, []);

  // Hook for time slots availability
  const { timeSlots: dayTimeSlotInfo, isDayClosed, isTimeBlocked, getBlockReason, blockedTimes, businessHours } = useAvailableTimeSlots(currentDate);

  // Helper to check if time is blocked for any date
  const checkTimeBlocked = useCallback((date: Date, time: string): { blocked: boolean; reason?: string } => {
    if (!blockedTimes || !time) {
      return { blocked: false };
    }

    const dayOfWeek = date.getDay();
    const [timeH, timeM] = time.split(':').map(Number);
    const timeMinutes = timeH * 60 + timeM;

    for (const block of blockedTimes) {
      const blockStart = new Date(block.start_date);
      const blockEnd = new Date(block.end_date);
      blockStart.setHours(0, 0, 0, 0);
      blockEnd.setHours(23, 59, 59, 999);

      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate >= blockStart && checkDate <= blockEnd) {
        if (block.is_all_day) {
          return { blocked: true, reason: block.title };
        }
        if (block.start_time && block.end_time) {
          const [btH, btM] = block.start_time.split(':').map(Number);
          const [etH, etM] = block.end_time.split(':').map(Number);
          if (timeMinutes >= btH * 60 + btM && timeMinutes < etH * 60 + etM) {
            return { blocked: true, reason: block.title };
          }
        }
      }

      if (block.is_recurring && block.recurring_days?.includes(dayOfWeek)) {
        if (block.is_all_day) {
          return { blocked: true, reason: block.title };
        }
        if (block.start_time && block.end_time) {
          const [btH, btM] = block.start_time.split(':').map(Number);
          const [etH, etM] = block.end_time.split(':').map(Number);
          if (timeMinutes >= btH * 60 + btM && timeMinutes < etH * 60 + etM) {
            return { blocked: true, reason: block.title };
          }
        }
      }
    }
    return { blocked: false };
  }, [blockedTimes]);

  // Check if a day is closed based on business hours
  const isDayClosedForDate = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay();
    if (!businessHours || businessHours.length === 0) {
      return dayOfWeek === 0; // Sunday closed by default
    }
    const dayConfig = businessHours.find(h => h.day_of_week === dayOfWeek);
    return dayConfig ? !dayConfig.is_open : dayOfWeek === 0;
  }, [businessHours]);

  return (
    <>
      <Card className="flex flex-col border-0 shadow-xl min-h-[500px] sm:min-h-[600px]">
        <CardContent className="p-2 md:p-3 lg:p-4 flex flex-col h-full">
          {/* Header - Mobile Optimized */}
          <div className="p-2 sm:p-3 border-b bg-gradient-to-r from-muted/30 to-muted/10">
            {/* Mobile Header Layout */}
            <div className="flex items-center justify-between sm:hidden gap-2">
              <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('prev')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToToday}
                  className="h-8 px-2 text-xs font-medium"
                >
                  Hoje
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('next')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-xs font-semibold text-foreground/70 truncate max-w-[120px]">
                {getHeaderTitle()}
              </div>

              <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-sm">
                {(['day', 'week'] as CalendarViewType[]).map(type => (
                  <Button
                    key={type}
                    variant={viewType === type ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onViewTypeChange(type)}
                    className="capitalize text-[10px] px-1.5 py-1 h-7 min-w-[28px]"
                  >
                    {type === 'day' ? 'Dia' : 'Sem'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Desktop Header Layout */}
            <div className="hidden sm:flex items-center justify-between">
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

                <h2 className="text-lg font-semibold">
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
                    className="capitalize text-xs sm:text-sm px-2 sm:px-3"
                  >
                    {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 relative">
            {viewType === 'day' && (
              <CalendarDayView
                currentDate={currentDate}
                currentTime={currentTime}
                currentTimePosition={currentTimePosition}
                getAppointmentsForDate={getAppointmentsForDate}
                // If we had many appointments, passing full list 'appointments' is okay as reference doesn't change often
                // But filtering inside DayView is cleaner if we only render one day
                appointments={appointments}
                timeSlots={dayTimeSlotInfo.length > 0 ? dayTimeSlotInfo.map(s => s.time) : generateTimeSlots(currentDate)}
                isDayClosed={isDayClosed}
                onTimeSlotClick={onTimeSlotClick}
                onEditAppointment={onEditAppointment}
                onDeleteAppointment={onDeleteAppointment}
                onAppointmentReschedule={onAppointmentReschedule}
                dragState={dragState}
                dropTarget={dropTarget}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                checkTimeBlocked={checkTimeBlocked}
                isTimeBlocked={isTimeBlocked}
                getBlockReason={getBlockReason}
                getStatusColor={getStatusColor}
                isOverCapacity={isOverCapacity}
                openPopoverId={openPopoverId}
                setOpenPopoverId={setOpenPopoverId}
              />
            )}

            {viewType === 'week' && (
              <CalendarWeekView
                currentDate={currentDate}
                appointments={appointments}
                onTimeSlotClick={onTimeSlotClick}
                onEditAppointment={onEditAppointment}
                onDeleteAppointment={onDeleteAppointment}
                onAppointmentReschedule={onAppointmentReschedule}
                dragState={dragState}
                dropTarget={dropTarget}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                checkTimeBlocked={checkTimeBlocked}
                isDayClosedForDate={isDayClosedForDate}
                getAppointmentsForDate={getAppointmentsForDate}
                getStatusColor={getStatusColor}
                isOverCapacity={isOverCapacity}
                openPopoverId={openPopoverId}
                setOpenPopoverId={setOpenPopoverId}
              />
            )}

            {viewType === 'month' && (
              <CalendarMonthView
                currentDate={currentDate}
                appointments={appointments}
                onDateChange={onDateChange}
                onEditAppointment={onEditAppointment}
                onDeleteAppointment={onDeleteAppointment}
                getAppointmentsForDate={getAppointmentsForDate}
                getStatusColor={getStatusColor}
                isOverCapacity={isOverCapacity}
                openPopoverId={openPopoverId}
                setOpenPopoverId={setOpenPopoverId}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <RescheduleConfirmDialog
        open={showConfirmDialog}
        onOpenChange={(open) => !open && handleCancelReschedule()}
        appointment={pendingReschedule?.appointment || null}
        newDate={pendingReschedule?.newDate || null}
        newTime={pendingReschedule?.newTime || null}
        onConfirm={handleConfirmReschedule}
      />
    </>
  );
});

CalendarView.displayName = 'CalendarView';