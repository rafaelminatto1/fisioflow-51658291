import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { DroppableTimeSlot } from './DroppableTimeSlot';
import { DraggableAppointment } from './DraggableAppointment';
import { CalendarDragOverlay } from './DragOverlay';
import { useCardSize } from '@/hooks/useCardSize';
import { calculateAppointmentCardHeight, calculateSlotHeightFromCardSize } from '@/lib/calendar/cardHeightCalculator';
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

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_DURATION_MINUTES = 30;

/** Margem e espaçamento entre cards sobrepostos (layout lateral, em px). */
const OVERLAP_LAYOUT_MARGIN_PX = 1;
const OVERLAP_LAYOUT_GAP_PX = 1;

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
  const slotHeight = calculateSlotHeightFromCardSize(cardSize, heightScale);

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

  const timeSlots = useMemo(() => generateTimeSlots(currentDate), [currentDate]);

  // Current time indicator
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (currentHour < START_HOUR || currentHour > END_HOUR) {
        setCurrentTimePosition(null);
        return;
      }

      const totalMinutesFromStart = (currentHour - START_HOUR) * 60 + currentMinute;
      const position = (totalMinutesFromStart / SLOT_DURATION_MINUTES) * slotHeight;
      setCurrentTimePosition(position);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000);
    return () => clearInterval(interval);
  }, [slotHeight]);

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
    const startRowIndex = timeSlots.findIndex(t => t === time);
    if (startRowIndex === -1) return null;

    const duration = apt.duration || 60;
    const heightInPixels = calculateAppointmentCardHeight(cardSize, duration, heightScale);

    const dayAppointments = appointmentsByDayIndex.get(dayIndex) ?? [];
    let { index, count } = getOverlapStackPosition(dayAppointments, apt);

    // During drag over this slot, resize cards as if dragged is already there
    const isInDropTargetSlot = dropTarget && isSameDay(dropTarget.date, aptDate) && dropTarget.time === time;
    if (isInDropTargetSlot && dragState.isDragging && dragState.appointment && apt.id !== dragState.appointment.id) {
      const futureDayAppointments = [...dayAppointments, dragState.appointment];
      const future = getOverlapStackPosition(futureDayAppointments, apt);
      count = future.count;
      index = future.index;
    }

    // Origin slot: resize cards as if dragged has left
    const draggedDate = dragState.appointment ? parseAppointmentDate(dragState.appointment.date) : null;
    const draggedTime = dragState.appointment ? normalizeTime(dragState.appointment.time) : null;
    const isInOriginSlot = dragState.isDragging && draggedDate && draggedTime && isSameDay(aptDate, draggedDate);
    if (isInOriginSlot && dragState.appointment && apt.id !== dragState.appointment.id) {
      const originDayAppointments = dayAppointments.filter((a) => a.id !== dragState.appointment!.id);
      const origin = getOverlapStackPosition(originDayAppointments, apt);
      count = origin.count;
      index = origin.index;
    }

    // Usar percentuais puros para que os cards fiquem colados
    const cardWidthPercent = 100 / count;
    const leftPercent = index * cardWidthPercent;

    return {
      gridColumn: `${dayIndex + 2} / span 1`,
      gridRow: `${startRowIndex + 1}`,
      height: `${heightInPixels}px`,
      width: `${cardWidthPercent}%`,
      left: `${leftPercent}%`,
      top: '0px',
      zIndex: 10 + index
    };
  }, [weekDays, timeSlots, appointmentsByDayIndex, cardSize, heightScale, dropTarget, dragState]);

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
      handleDragOverHook(new Date(dateStr), timeStr);
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
        const isDraggingOver = currentOverId === `slot-${day.toISOString().split('T')[0]}-${time}`;

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
        <div className="flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100 font-display h-full relative overflow-hidden">
          <div className="overflow-auto w-full h-full custom-scrollbar">
            <div className="w-full">
              {/* Header Row */}
              <div className="grid grid-cols-[60px_repeat(6,1fr)] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm min-w-[600px]">
                {/* Time icon - Sticky Left */}
                <div className="h-14 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center sticky left-0 z-50 bg-white dark:bg-slate-950">
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-gray-500">
                    <span className="text-[10px] font-bold">GMT-3</span>
                  </div>
                </div>

                {/* Days Headers */}
                {weekDays.map((day, i) => {
                  const isTodayDate = isSameDay(day, new Date());
                  return (
                    <div key={i} className={cn(
                      "h-14 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/50 relative group transition-colors",
                      isTodayDate ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    )}>
                      {isTodayDate && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                      )}
                      <span className={cn(
                        "text-[10px] font-medium uppercase tracking-wider mb-0.5",
                        isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-gray-500"
                      )}>
                        {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
                      </span>
                      <div className={cn(
                        "text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center transition-all",
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
                          "border-r border-slate-100 dark:border-slate-800 text-[11px] font-medium flex justify-end pr-2 pt-2 sticky left-0 z-30 bg-white dark:bg-slate-950",
                          isHour ? "text-slate-600 dark:text-gray-500 -mt-2.5 translate-y-0" : "text-gray-500 dark:text-slate-600 hidden"
                        )}
                        style={{ gridRow: index + 1, gridColumn: 1 }}
                      >
                        {isHour ? time : ''}
                      </div>
                    );
                  })}

                  {/* Droppable Time Slots */}
                  {droppableSlotsMemo.flat().map((slot, idx) => (
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
