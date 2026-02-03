import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, eachDayOfInterval } from 'date-fns';
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
import { CalendarEmptyState } from './CalendarEmptyState';
import { useCalendarDrag } from '@/hooks/useCalendarDrag';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { formatDateToLocalISO } from '@/lib/utils/dateFormat';

export type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarViewProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: CalendarViewType;
  onViewTypeChange: (type: CalendarViewType) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (appointment: Appointment) => void;
  // Selection props
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

export const CalendarView = memo(({
  appointments,
  currentDate,
  onDateChange,
  viewType,
  onViewTypeChange,
  onTimeSlotClick,
  onAppointmentReschedule,
  onEditAppointment,
  onDeleteAppointment,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
}: CalendarViewProps) => {
  // State for appointment quick view popover
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  // Current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  // Optimistic updates state - maintains a local copy of appointments with pending changes
  const [optimisticAppointments, setOptimisticAppointments] = useState<Appointment[]>([]);
  const [pendingOptimisticUpdate, setPendingOptimisticUpdate] = useState<{ id: string; originalDate: string; originalTime: string } | null>(null);

  // Use optimistic appointments when there's a pending update, otherwise use original appointments (filter out null/undefined to avoid "reading 'id'" on drag)
  const displayAppointments = useMemo(() => {
    const base = pendingOptimisticUpdate && optimisticAppointments.length > 0 ? optimisticAppointments : appointments;
    return (base || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === 'string');
  const displayAppointments = useMemo(() => {
    const base = pendingOptimisticUpdate && optimisticAppointments.length > 0 ? optimisticAppointments : appointments;
    return (base || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === "string");
  }, [appointments, optimisticAppointments, pendingOptimisticUpdate]);

  const getAppointmentsForDate = useCallback((date: Date) => {
    return (displayAppointments || []).filter(apt => {
      if (!apt || !apt.date) return false;
      const aptDate = typeof apt.date === "string"
        ? (() => {
          const [y, m, d] = apt.date.split("-").map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        })()
        : apt.date;
      return isSameDay(aptDate, date);
    });
  }, [displayAppointments]);

  const handleOptimisticUpdate = useCallback((appointmentId: string, newDate: Date, newTime: string) => {
    const safeAppointments = (appointments || []).filter((a): a is Appointment => a != null && typeof (a as Appointment).id === "string");
    const appointment = safeAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    setPendingOptimisticUpdate({
      id: appointmentId,
      originalDate: appointment.date,
      originalTime: appointment.time
    });
    const updatedAppointment: Appointment = {
      ...appointment,
      date: formatDateToLocalISO(newDate),
      time: newTime
    };
    setOptimisticAppointments(
      safeAppointments.map(a => a.id === appointmentId ? updatedAppointment : a)
    );
  }, [appointments]);

  const handleRevertUpdate = useCallback((appointmentId: string) => {
    setPendingOptimisticUpdate(null);
    setOptimisticAppointments([]);
  }, []);

  const {
    dragState,
    dropTarget,
    showConfirmDialog,
    pendingReschedule,
    targetAppointments,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleConfirmReschedule,
    handleCancelReschedule
  } = useCalendarDrag({
    onAppointmentReschedule,
    onOptimisticUpdate: handleOptimisticUpdate,
    onRevertUpdate: handleRevertUpdate,
    getAppointmentsForSlot: useCallback((date: Date, time: string) => {
      return getAppointmentsForDate(date).filter(apt => apt.time === time);
    }, [getAppointmentsForDate])
  });

    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Clear optimistic state when save completes successfully (savingAppointmentId becomes null)
  useEffect(() => {
    if (!dragState.savingAppointmentId && !pendingOptimisticUpdate) {
      // No pending update, nothing to do
      return;
    }

    if (!dragState.savingAppointmentId && pendingOptimisticUpdate) {
      // Save completed successfully - clear optimistic state
      setPendingOptimisticUpdate(null);
      setOptimisticAppointments([]);
    }
  }, [dragState.savingAppointmentId, pendingOptimisticUpdate]);

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
    const dayOfWeek = date.getDay();
    // Safety check for time split
    const [timeH, timeM] = (time || '00:00').split(':').map(Number);
    const timeMinutes = timeH * 60 + timeM;

    for (const block of blockedTimes) {
      const blockStart = new Date(block.start_date);
      const blockEnd = new Date(block.end_date);
      blockStart.setHours(0, 0, 0, 0);
      blockEnd.setHours(23, 59, 59, 999);

      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
  }, [currentDate, memoizedTimeSlots, onTimeSlotClick]);

  return (
    <>
      <Card className="flex flex-col border-0 shadow-xl min-h-[500px] sm:min-h-[600px]" role="region" aria-label="Calendário de agendamentos">
        <CardContent className="p-2 md:p-3 lg:p-4 flex flex-col h-full">
          {/* Header - Mobile Optimized */}
          <div className="p-2 sm:p-3 border-b bg-gradient-to-r from-muted/30 to-muted/10" role="toolbar" aria-label="Navegação do calendário">
            <div className="flex items-center justify-between sm:hidden gap-2 w-full">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('prev')}
                  className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 p-0"
                  aria-label="Navegar para anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="text-sm font-semibold text-foreground/80 text-center min-w-[100px]">
                  {getHeaderTitle()}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateCalendar('next')}
                  className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 p-0"
                  aria-label="Navegar para próximo"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-sm" role="group" aria-label="Seleção de visualização">
                {(['day', 'week'] as CalendarViewType[]).map(type => (
                  <Button
                    key={type}
                    variant={viewType === type ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onViewTypeChange(type)}
                    className="capitalize text-[10px] px-1.5 py-1 min-h-[44px] min-w-[44px] sm:h-7 sm:min-w-[28px] touch-target"
                    aria-pressed={viewType === type}
                    aria-label={`Visualizar por ${type === 'day' ? 'dia' : 'semana'}`}
                  >
                    {type === 'day' ? 'Dia' : 'Sem'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Desktop Header Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-background rounded-lg p-1 shadow-sm" role="group" aria-label="Navegação por data">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateCalendar('prev')}
                    className="min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 p-0 hover-scale touch-target"
                    aria-label={`Navegar para ${viewType === 'day' ? 'ontem' : viewType === 'week' ? 'semana anterior' : 'mês anterior'}`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateCalendar('next')}
                    className="min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 p-0 hover-scale touch-target"
                    aria-label={`Navegar para ${viewType === 'day' ? 'amanhã' : viewType === 'week' ? 'próxima semana' : 'próximo mês'}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="min-h-[44px] sm:min-h-0 hover-scale font-medium touch-target"
                  aria-label="Ir para hoje"
                >
                  Hoje
                </Button>

                <h2 className="text-lg font-semibold" aria-live="polite" aria-atomic="true">
                  {getHeaderTitle()}
                </h2>
              </div>

              <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-sm" role="radiogroup" aria-label="Seleção de visualização">
                {(['day', 'week', 'month'] as CalendarViewType[]).map(type => (
                  <Button
                    key={type}
                    variant={viewType === type ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onViewTypeChange(type)}
                    className="capitalize text-xs sm:text-sm px-2 sm:px-3 min-h-[44px] sm:min-h-0 touch-target"
                    role="radio"
                    aria-checked={viewType === type}
                    aria-label={`Visualizar por ${type === 'day' ? 'dia' : type === 'week' ? 'semana' : 'mês'}`}
                  >
                    {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 relative min-h-[400px]" id="calendar-grid" role="tabpanel" aria-label={`Visualização ${viewType === 'day' ? 'diária' : viewType === 'week' ? 'semanal' : 'mensal'} do calendário`}>
            {showEmptyState ? (
              <CalendarEmptyState
                viewType={viewType}
                currentDate={currentDate}
                onCreateAppointment={handleEmptyStateCreate}
                className="min-h-[400px]"
              />
            ) : viewType === 'day' ? (
              <div key="day-view" className="h-full animate-in fade-in duration-300 slide-in-from-bottom-2">
                <CalendarDayView
                  currentDate={currentDate}
                  currentTime={currentTime}
                  currentTimePosition={currentTimePosition}
                  getAppointmentsForDate={getAppointmentsForDate}
                  appointments={displayAppointments}
                  savingAppointmentId={dragState.savingAppointmentId}
                  timeSlots={memoizedTimeSlots}
                  isDayClosed={isDayClosed}
                  onTimeSlotClick={onTimeSlotClick}
                  onEditAppointment={onEditAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  onAppointmentReschedule={onAppointmentReschedule}
                  dragState={dragState}
                  dropTarget={dropTarget}
                  targetAppointments={targetAppointments}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  handleDrop={handleDrop}
                  isTimeBlocked={isTimeBlocked}
                  getBlockReason={getBlockReason}
                  _getStatusColor={getStatusColor}
                  isOverCapacity={isOverCapacity}
                  openPopoverId={openPopoverId}
                  setOpenPopoverId={setOpenPopoverId}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={onToggleSelection}
                />
              </div>
            ) : viewType === 'week' ? (
              <div key="week-view" className="h-full animate-in fade-in duration-300 slide-in-from-bottom-2">
                <CalendarWeekView
                  currentDate={currentDate}
                  appointments={displayAppointments}
                  savingAppointmentId={dragState.savingAppointmentId}
                  onTimeSlotClick={onTimeSlotClick}
                  onEditAppointment={onEditAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  onAppointmentReschedule={onAppointmentReschedule}
                  dragState={dragState}
                  dropTarget={dropTarget}
                  targetAppointments={targetAppointments}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  handleDrop={handleDrop}
                  checkTimeBlocked={checkTimeBlocked}
                  isDayClosedForDate={isDayClosedForDate}
                  getStatusColor={getStatusColor}
                  isOverCapacity={isOverCapacity}
                  openPopoverId={openPopoverId}
                  setOpenPopoverId={setOpenPopoverId}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={onToggleSelection}
                />
              </div>
            ) : (
              <div key="month-view" className="h-full animate-in fade-in duration-300 slide-in-from-bottom-2">
                <CalendarMonthView
                  currentDate={currentDate}
                  appointments={appointments}
                  onDateChange={onDateChange}
                  onTimeSlotClick={onTimeSlotClick}
                  onEditAppointment={onEditAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  getAppointmentsForDate={getAppointmentsForDate}
                  getStatusColor={getStatusColor}
                  isOverCapacity={isOverCapacity}
                  openPopoverId={openPopoverId}
                  setOpenPopoverId={setOpenPopoverId}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={onToggleSelection}
                />
              </div>
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

// Custom comparison function for memo optimization
function calendarViewAreEqual(
  prev: CalendarViewProps,
  next: CalendarViewProps
): boolean {
  // Compare primitive values
  if (
    prev.viewType !== next.viewType ||
    prev.selectionMode !== next.selectionMode
  ) {
    return false;
  }

  // Compare dates
  if (prev.currentDate.getTime() !== next.currentDate.getTime()) {
    return false;
  }

  // Compare appointments array length first (quick check)
  if (prev.appointments.length !== next.appointments.length) {
    return false;
  }

  // Deep compare appointments only if length matches
  // Use reference comparison first (optimistic updates will create new refs)
  if (prev.appointments !== next.appointments) {
    // If refs are different, we need to check if content actually changed
    // For simplicity and performance, we'll assume ref change means content change
    // This is correct because we only create new arrays when data changes
    return false;
  }

  // Compare selected sets
  if (prev.selectedIds?.size !== next.selectedIds?.size) {
    return false;
  }

  // Compare function references (should be stable)
  return (
    prev.onDateChange === next.onDateChange &&
    prev.onViewTypeChange === next.onViewTypeChange &&
    prev.onTimeSlotClick === next.onTimeSlotClick &&
    prev.onEditAppointment === next.onEditAppointment &&
    prev.onDeleteAppointment === next.onDeleteAppointment &&
    prev.onToggleSelection === next.onToggleSelection
  );
}

export default memo(CalendarView, calendarViewAreEqual);
CalendarView.displayName = 'CalendarView';