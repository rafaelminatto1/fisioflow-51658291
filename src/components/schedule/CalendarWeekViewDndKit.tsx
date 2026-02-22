import React, { memo, useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { formatDateToLocalISO, parseResponseDate } from '@/utils/dateUtils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { DroppableTimeSlot } from './DroppableTimeSlot';
import { DraggableAppointment } from './DraggableAppointment';
import { CalendarDragOverlay } from './DragOverlay';
import { useCardSize } from '@/hooks/useCardSize';
import { calculateSlotHeightFromCardSize } from '@/lib/calendar/cardHeightCalculator';
import { getOverlapStackPosition } from '@/lib/calendar';
import {

  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent
} from '@dnd-kit/core';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import { useIsTouch } from '@/hooks/use-touch.tsx';

// =====================================================================
// TYPES
// =====================================================================

interface CalendarWeekViewDndKitProps {
  currentDate: Date;
  appointments: Appointment[];
  savingAppointmentId: string | null;
  timeSlots?: string[];
  onTimeSlotClick: (date: Date, time: string) => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (appointment: Appointment) => void;
  onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
  checkTimeBlocked: (date: Date, time: string) => { blocked: boolean; reason?: string };
  isDayClosedForDate: (date: Date) => boolean;
  openPopoverId: string | null;
  setOpenPopoverId: (id: string | null) => void;
  // Drag state from hook
  dragState: { appointment: Appointment | null; isDragging: boolean };
  dropTarget: { date: Date; time: string } | null;
  handleDragStart: (appointment: Appointment) => void;
  handleDragOver: (date: Date, time: string) => void;
  handleDragEnd: (appointment: Appointment | null, droppableId: string | null) => void;
  // Selection props
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const SLOT_DURATION_MINUTES = 30;
const MIN_WEEK_SLOT_HEIGHT = 31;
const GRID_HEIGHT_ADJUSTMENT = 3;
const WEEK_GRID_HEIGHT_BOOST = 0;
const INITIAL_MEASUREMENT_SETTLE_MS = 120;
const INITIAL_MEASUREMENT_MAX_WAIT_MS = 700;
const INITIAL_MEASUREMENT_MAX_RETRIES = 8;

/** Margem e espaçamento entre cards sobrepostos (layout lateral, em px). */
const _OVERLAP_LAYOUT_MARGIN_PX = 1;
const _OVERLAP_LAYOUT_GAP_PX = 1;

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

const normalizeTime = (time: string | null | undefined): string => {
  if (!time || !time.trim()) return '00:00';
  return time.substring(0, 5);
};

const parseAppointmentDate = (date: string | Date | null | undefined): Date | null => {
  if (!date) return null;
  return typeof date === 'string' ? parseISO(date) : date;
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export const CalendarWeekViewDndKit = memo(({
  currentDate,
  appointments,
  savingAppointmentId,
  timeSlots: timeSlotsProp,
  onTimeSlotClick,
  onEditAppointment,
  onDeleteAppointment,
  onAppointmentReschedule,
  checkTimeBlocked,
  isDayClosedForDate,
  openPopoverId,
  setOpenPopoverId,
  dragState,
  dropTarget,
  handleDragStart: handleDragStartHook,
  handleDragOver: handleDragOverHook,
  handleDragEnd: handleDragEndHook,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelection
}: CalendarWeekViewDndKitProps) => {
  // Get card size configuration from user preferences
  const { cardSize, heightScale } = useCardSize();
  const preferredSlotHeight = calculateSlotHeightFromCardSize(cardSize, heightScale);

  const isMobile = useIsMobile();
  const isTouch = useIsTouch();

  // Enhanced sensor configuration for both mouse and touch
  const sensors = useSensors(
    // PointerSensor for unified mouse/touch handling
    useSensor(PointerSensor, {
      activationConstraint: {
        // Distance threshold before drag starts (prevents accidental drags during clicks)
        distance: isTouch ? 8 : 5,
      },
    }),
    // TouchSensor as fallback for better touch support
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // ms before drag starts on touch
        tolerance: 8, // px of movement allowed during delay
      },
    })
  );

  // Local state for tracking active drag
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [currentOverId, setCurrentOverId] = useState<string | null>(null);

  // Week days and time slots
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  const timeSlots = useMemo(() => {
    if (timeSlotsProp && timeSlotsProp.length > 0) {
      return timeSlotsProp;
    }
    return generateTimeSlots(currentDate);
  }, [timeSlotsProp, currentDate]);

  const derivedStartHour = useMemo(() => {
    if (!timeSlots.length) return 7;
    const [h] = timeSlots[0].split(':').map(Number);
    return Number.isFinite(h) ? h : 7;
  }, [timeSlots]);

  const derivedEndHour = useMemo(() => {
    if (!timeSlots.length) return 21;
    const [h] = timeSlots[timeSlots.length - 1].split(':').map(Number);
    return Number.isFinite(h) ? h + 1 : 21;
  }, [timeSlots]);
  const weekContainerRef = useRef<HTMLDivElement | null>(null);
  const weekScrollRef = useRef<HTMLDivElement | null>(null);
  const weekHeaderRef = useRef<HTMLDivElement | null>(null);
  const [fitSlotHeight, setFitSlotHeight] = useState<number>(MIN_WEEK_SLOT_HEIGHT);
  const [isSlotHeightMeasured, setIsSlotHeightMeasured] = useState(false);

  // Force fit all weekly slots (07:00-21:00) in visible height while respecting user compactness preference.
  const slotHeight = useMemo(() => {
    return Math.max(MIN_WEEK_SLOT_HEIGHT, Math.min(preferredSlotHeight, fitSlotHeight));
  }, [fitSlotHeight, preferredSlotHeight]);

  useLayoutEffect(() => {
    let hasCompletedInitialMeasurement = false;
    let retryRafId: number | undefined;
    let revealTimerId: number | undefined;
    let measurementFallbackId: number | undefined;

    const scheduleInitialReveal = () => {
      if (hasCompletedInitialMeasurement || typeof window === 'undefined') return;

      if (revealTimerId !== undefined) {
        window.clearTimeout(revealTimerId);
      }

      // Reveal only after measurements stop changing for a short window.
      revealTimerId = window.setTimeout(() => {
        if (hasCompletedInitialMeasurement) return;
        hasCompletedInitialMeasurement = true;
        if (measurementFallbackId !== undefined) {
          window.clearTimeout(measurementFallbackId);
          measurementFallbackId = undefined;
        }
        setIsSlotHeightMeasured(true);
      }, INITIAL_MEASUREMENT_SETTLE_MS);
    };

    const updateSlotHeight = () => {
      const containerHeight = weekScrollRef.current?.clientHeight ?? weekContainerRef.current?.clientHeight ?? 0;
      const headerHeight = weekHeaderRef.current?.clientHeight ?? 0;

      if (containerHeight <= 0 || timeSlots.length === 0) return false;

      const availableGridHeight = containerHeight - headerHeight - GRID_HEIGHT_ADJUSTMENT + WEEK_GRID_HEIGHT_BOOST;
      if (availableGridHeight <= 0) return false;

      const nextFittedHeight = Math.floor(availableGridHeight / timeSlots.length);
      setFitSlotHeight(prevHeight => prevHeight === nextFittedHeight ? prevHeight : nextFittedHeight);
      scheduleInitialReveal();
      return true;
    };

    let attemptCount = 0;
    const tryInitialMeasure = () => {
      const measured = updateSlotHeight();
      if (measured || typeof window === 'undefined' || attemptCount >= INITIAL_MEASUREMENT_MAX_RETRIES) return;
      attemptCount += 1;
      retryRafId = window.requestAnimationFrame(tryInitialMeasure);
    };

    tryInitialMeasure();

    measurementFallbackId = typeof window !== 'undefined'
      ? window.setTimeout(() => {
        if (hasCompletedInitialMeasurement) return;
        hasCompletedInitialMeasurement = true;
        setIsSlotHeightMeasured(true);
      }, INITIAL_MEASUREMENT_MAX_WAIT_MS)
      : undefined;

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateSlotHeight);
    }

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateSlotHeight);
      if (weekContainerRef.current) observer.observe(weekContainerRef.current);
      if (weekScrollRef.current) observer.observe(weekScrollRef.current);
      if (weekHeaderRef.current) observer.observe(weekHeaderRef.current);
    }

    return () => {
      if (typeof window !== 'undefined' && retryRafId !== undefined) {
        window.cancelAnimationFrame(retryRafId);
      }
      if (typeof window !== 'undefined' && revealTimerId !== undefined) {
        window.clearTimeout(revealTimerId);
      }
      if (typeof window !== 'undefined' && measurementFallbackId !== undefined) {
        window.clearTimeout(measurementFallbackId);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateSlotHeight);
      }
      observer?.disconnect();
    };
  }, [timeSlots.length]);

  // Current time indicator
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (currentHour < derivedStartHour || currentHour > derivedEndHour) {
        setCurrentTimePosition(null);
        return;
      }

      const totalMinutesFromStart = (currentHour - derivedStartHour) * 60 + currentMinute;
      const position = (totalMinutesFromStart / SLOT_DURATION_MINUTES) * slotHeight;
      setCurrentTimePosition(position);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000);
    return () => clearInterval(interval);
  }, [slotHeight, derivedStartHour, derivedEndHour]);

  // Filter appointments for this week
  const weekAppointments = useMemo(() => {
    const start = startOfDay(weekDays[0]);
    const end = startOfDay(addDays(weekDays[5], 1));

    return (appointments || []).filter((apt): apt is Appointment => {
      if (apt == null || typeof (apt as Appointment).id !== 'string') return false;
      const aptDate = parseAppointmentDate(apt.date);
      return !!(aptDate && aptDate >= start && aptDate < end);
    });
  }, [appointments, weekDays]);

  // Group appointments by day index
  const appointmentsByDayIndex = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    weekDays.forEach((day, dayIndex) => {
      const dayApts = weekAppointments.filter((apt) => {
        const d = parseAppointmentDate(apt.date);
        return d && isSameDay(d, day);
      });
      map.set(dayIndex, dayApts);
    });
    return map;
  }, [weekAppointments, weekDays]);

  // Blocked time cache
  const blockedStatusCache = useMemo(() => {
    const cache = new Map<string, { blocked: boolean; reason?: string }>();

    weekDays.forEach(day => {
      timeSlots.forEach(time => {
        const dayIndex = weekDays.indexOf(day);
        const uniqueKey = `${dayIndex}-${time}`;
        cache.set(uniqueKey, checkTimeBlocked(day, time));
      });
    });

    return cache;
  }, [weekDays, timeSlots, checkTimeBlocked]);

  // Memoize isDayClosed status
  const dayClosedStatus = useMemo(() => {
    return weekDays.map(day => isDayClosedForDate(day));
  }, [weekDays, isDayClosedForDate]);

  // Get appointments for a specific slot (for preview)
  const getAppointmentsForSlot = useCallback((date: Date, time: string): Appointment[] => {
    const dayIndex = weekDays.findIndex(d => isSameDay(d, date));
    if (dayIndex === -1) return [];

    const dayAppointments = appointmentsByDayIndex.get(dayIndex) ?? [];
    const normalizedTime = time.substring(0, 5);

    // Find appointments that overlap with this time slot
    return dayAppointments.filter(apt => {
      const aptTime = apt.time?.substring(0, 5) || '00:00';
      return aptTime === normalizedTime;
    });
  }, [weekDays, appointmentsByDayIndex]);

  // Calculate position and width for overlapping appointments
  const getAppointmentStyle = useCallback((apt: Appointment) => {
    const aptDate = parseAppointmentDate(apt.date);
    if (!aptDate) return null;

    const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
    if (dayIndex === -1) return null;

    const time = normalizeTime(apt.time);
    const [hours, minutes] = time.split(':').map(Number);
    const aptMinutesTotal = hours * 60 + minutes;

    let startRowIndex = -1;
    let offsetMinutes = 0;

    for (let i = 0; i < timeSlots.length; i++) {
      const [slotHour, slotMin] = timeSlots[i].split(':').map(Number);
      const slotMinutesTotal = slotHour * 60 + slotMin;

      const nextSlot = timeSlots[i + 1];
      let slotDuration = 30;
      if (nextSlot) {
        const [nextHour, nextMin] = nextSlot.split(':').map(Number);
        slotDuration = (nextHour * 60 + nextMin) - slotMinutesTotal;
      }

      if (aptMinutesTotal >= slotMinutesTotal && aptMinutesTotal < slotMinutesTotal + slotDuration) {
        startRowIndex = i;
        offsetMinutes = aptMinutesTotal - slotMinutesTotal;
        break;
      }
    }

    if (startRowIndex === -1 && timeSlots.length > 0) {
      const lastSlot = timeSlots[timeSlots.length - 1];
      const [lastHour, lastMin] = lastSlot.split(':').map(Number);
      const lastMinutesTotal = lastHour * 60 + lastMin;
      if (aptMinutesTotal >= lastMinutesTotal) {
        startRowIndex = timeSlots.length - 1;
        offsetMinutes = aptMinutesTotal - lastMinutesTotal;
      } else {
        return null;
      }
    }

    const duration = Math.max(SLOT_DURATION_MINUTES, apt.duration || 60);
    const slotCount = Math.max(1, Math.ceil(duration / SLOT_DURATION_MINUTES));
    const heightInPixels = Math.max(MIN_WEEK_SLOT_HEIGHT - 1, (slotHeight * slotCount) - 2);

    const dayAppointments = appointmentsByDayIndex.get(dayIndex) ?? [];
    // Keep card sizing stable while dragging; drop preview already communicates target arrangement.
    const { index, count } = getOverlapStackPosition(dayAppointments, apt);

    // Usar percentuais puros para que os cards fiquem colados
    const cardWidthPercent = 100 / count;
    const leftPercent = index * cardWidthPercent;
    const offsetPx = (offsetMinutes / 30) * slotHeight;

    return {
      gridColumn: `${dayIndex + 2} / span 1`,
      gridRow: `${startRowIndex + 1}`,
      height: `${heightInPixels}px`,
      width: `${cardWidthPercent}%`,
      left: `${leftPercent}%`,
      marginTop: `${offsetPx}px`,
      zIndex: 10 + index
    };
  }, [weekDays, timeSlots, appointmentsByDayIndex, slotHeight]);

  // @dnd-kit event handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const appointment = weekAppointments.find(a => a.id === active.id);
    if (appointment) {
      setActiveId(active.id as string);
      setDraggedAppointment(appointment);
      handleDragStartHook(appointment);
    }
  }, [weekAppointments, handleDragStartHook]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setCurrentOverId(null);
      return;
    }

    // Update current over ID for DroppableTimeSlot feedback
    const overId = over.id as string;
    if (currentOverId !== overId) {
      setCurrentOverId(overId);
    }

    // Parse droppable ID: "slot-YYYY-MM-DD-HH:mm"
    const match = overId.match(/slot-(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})/);
    if (match) {
      const [, dateStr, timeStr] = match;
      handleDragOverHook(parseResponseDate(dateStr), timeStr);
    }
  }, [currentOverId, handleDragOverHook]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedAppointment(null);
    setCurrentOverId(null);

    const appointment = weekAppointments.find(a => a.id === active.id);
    const droppableId = over?.id as string || null;

    handleDragEndHook(appointment || null, droppableId);
  }, [weekAppointments, handleDragEndHook]);

  const isDraggable = !!onAppointmentReschedule && !selectionMode;
  const isDraggingThis = useCallback((aptId: string) =>
    activeId === aptId || (dragState.isDragging && dragState.appointment?.id === aptId),
    [activeId, dragState]
  );

  // Memoize the droppable slots to prevent unnecessary re-renders
  const droppableSlotsMemo = useMemo(() => {
    return weekDays.map((day, colIndex) => {
      const isClosed = dayClosedStatus[colIndex];

      return timeSlots.map((time, rowIndex) => {
        const key = `${colIndex}-${time}`;
        const { blocked } = blockedStatusCache.get(key) || { blocked: false };

        const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;
        const isDraggingOver = currentOverId === `slot-${formatDateToLocalISO(day)}-${time}`;

        // Get appointments for this slot for preview
        const slotAppointments = isDropTarget || isDraggingOver
          ? getAppointmentsForSlot(day, time).filter(a => a.id !== draggedAppointment?.id)
          : [];

        return {
          day,
          time,
          rowIndex,
          colIndex,
          isClosed,
          isBlocked: blocked,
          isDropTarget,
          isDraggingOver,
          slotAppointments,
        };
      });
    });
  }, [weekDays, timeSlots, dayClosedStatus, blockedStatusCache, dropTarget, currentOverId, getAppointmentsForSlot, draggedAppointment]);

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={weekContainerRef}
          className={cn(
            "flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100 font-display h-full relative overflow-hidden",
            !isSlotHeightMeasured && "invisible"
          )}
          aria-busy={!isSlotHeightMeasured}
        >
          <div ref={weekScrollRef} className="overflow-auto w-full h-full custom-scrollbar">
            <div className="w-full">
              {/* Header Row */}
              <div ref={weekHeaderRef} className="grid grid-cols-[60px_repeat(6,1fr)] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm min-w-[600px]">
                {/* Time icon - Sticky Left */}
                <div className="h-12 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center sticky left-0 z-50 bg-white dark:bg-slate-950">
                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-[10px] font-bold">GMT-3</span>
                  </div>
                </div>

                {/* Days Headers */}
                {weekDays.map((day, i) => {
                  const isTodayDate = isSameDay(day, new Date());
                  return (
                    <div key={i} className={cn(
                      "h-12 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/50 relative group transition-colors",
                      isTodayDate ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    )}>
                      {isTodayDate && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                      )}
                      <span className={cn(
                        "text-[9px] font-medium uppercase tracking-wider mb-0.5",
                        isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-gray-500"
                      )}>
                        {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
                      </span>
                      <div className={cn(
                        "text-base font-bold w-7 h-7 rounded-full flex items-center justify-center transition-all",
                        isTodayDate
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable Grid Area */}
              <div className="relative bg-white dark:bg-slate-950" id="calendar-grid-dndkit" data-calendar-drop-zone>
                <div className="grid grid-cols-[60px_repeat(6,1fr)] relative min-h-0 min-w-[600px]" style={{
                  gridTemplateRows: `repeat(${timeSlots.length}, ${slotHeight}px)`
                }}>

                  {/* Current Time Indicator Line */}
                  {currentTimePosition !== null && (
                    <div
                      className="absolute z-20 pointer-events-none flex items-center w-full"
                      style={{
                        top: `${currentTimePosition}px`,
                        left: '60px',
                        right: 0
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0"></div>
                      <div className="h-px bg-red-500 flex-1 shadow-sm"></div>
                    </div>
                  )}

                  {/* Time Labels Column */}
                  {timeSlots.map((time, index) => {
                    const isHour = time.endsWith(':00');
                    return (
                      <div
                        key={`time-${time}`}
                        className={cn(
                          "border-r border-slate-100 dark:border-slate-800 text-[10px] font-medium flex justify-end pr-2 pt-0.5 sticky left-0 z-30 bg-white dark:bg-slate-950",
                          isHour ? "text-slate-900 dark:text-slate-200" : "text-gray-500 dark:text-slate-600 hidden"
                        )}
                        style={{ gridRow: index + 1, gridColumn: 1 }}
                      >
                        {isHour ? time : ''}
                      </div>
                    );
                  })}

                  {/* Droppable Time Slots */}
                  {droppableSlotsMemo.flat().map((slot, _idx) => (
                    <DroppableTimeSlot
                      key={`cell-${slot.colIndex}-${slot.rowIndex}`}
                      day={slot.day}
                      time={slot.time}
                      rowIndex={slot.rowIndex}
                      colIndex={slot.colIndex}
                      isClosed={slot.isClosed}
                      isBlocked={slot.isBlocked}
                      isDropTarget={!!slot.isDropTarget}
                      isDraggingOver={slot.isDraggingOver}
                      targetAppointments={slot.slotAppointments}
                      draggedAppointment={draggedAppointment}
                      onClick={() => {
                        if (!slot.isBlocked && !slot.isClosed) {
                          onTimeSlotClick(slot.day, slot.time);
                        }
                      }}
                    />
                  ))}

                  {/* Draggable Appointments */}
                  {weekAppointments.map(apt => {
                    const style = getAppointmentStyle(apt);
                    if (!style) return null;

                    const aptDate = parseAppointmentDate(apt.date);
                    if (!aptDate) return null;

                    const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
                    if (dayIndex === -1) return null;

                    const day = weekDays[dayIndex];
                    const aptTime = normalizeTime(apt.time);

                    const key = `${dayIndex}-${aptTime}`;
                    const cachedBlock = blockedStatusCache.get(key);
                    const { blocked } = cachedBlock || checkTimeBlocked(day, aptTime);

                    const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === aptTime;
                    const dayAppointmentsForGhost = appointmentsByDayIndex.get(dayIndex) ?? [];
                    const overlapCount = getOverlapStackPosition(dayAppointmentsForGhost, apt).count;
                    const hideGhostWhenSiblings = isDraggingThis(apt.id) && overlapCount > 1;

                    // When dragging the appointment itself, use DraggableAppointment wrapper
                    const isDraggingThisOne = isDraggingThis(apt.id);

                    return (
                      <DraggableAppointment
                        key={apt.id}
                        id={apt.id}
                        style={style}
                        isDragging={isDraggingThisOne}
                        isDragDisabled={!isDraggable || isMobile || selectionMode}
                        dragData={{ appointment: apt }}
                        isPopoverOpen={openPopoverId === apt.id}
                      >
                        <CalendarAppointmentCard
                          appointment={apt}
                          style={{ ...style, width: '100%', left: '0' }} // Card preenche o wrapper (posicionamento feito pelo DraggableAppointment)
                          isDraggable={false} // Disabled - handled by DraggableAppointment wrapper
                          isDragging={isDraggingThisOne}
                          isSaving={apt.id === savingAppointmentId}
                          isDropTarget={!!isDropTarget}
                          hideGhostWhenSiblings={hideGhostWhenSiblings}
                          onDragStart={() => { }} // No-op - handled by DraggableAppointment
                          onDragEnd={() => { }} // No-op
                          onDragOver={() => { }} // No-op
                          onDrop={() => { }} // No-op
                          onEditAppointment={onEditAppointment}
                          onDeleteAppointment={onDeleteAppointment}
                          onOpenPopover={setOpenPopoverId}
                          isPopoverOpen={openPopoverId === apt.id}
                          selectionMode={selectionMode}
                          isSelected={selectedIds?.has(apt.id)}
                          onToggleSelection={onToggleSelection}
                          dragHandleOnly={false}
                          density="compact"
                        />
                      </DraggableAppointment>
                    );
                  })}

                </div>
              </div>
            </div>
          </div>
        </div>

        <CalendarDragOverlay activeAppointment={draggedAppointment} />
      </DndContext>
    </TooltipProvider>
  );
});

CalendarWeekViewDndKit.displayName = 'CalendarWeekViewDndKit';
