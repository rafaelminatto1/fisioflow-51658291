import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { TimeSlotCell } from './TimeSlotCell';
import { useCardSize } from '@/hooks/useCardSize';
import { calculateAppointmentCardHeight, calculateSlotHeightFromCardSize } from '@/lib/calendar/cardHeightCalculator';

// =====================================================================
// TYPES
// =====================================================================

interface CalendarWeekViewProps {
    currentDate: Date;
    appointments: Appointment[];
    savingAppointmentId: string | null;
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    targetAppointments?: Appointment[];
    handleDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
    checkTimeBlocked: (date: Date, time: string) => { blocked: boolean; reason?: string };
    isDayClosedForDate: (date: Date) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
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

export const CalendarWeekView = memo(({
    currentDate,
    appointments,
    savingAppointmentId,
    onTimeSlotClick,
    onEditAppointment,
    onDeleteAppointment,
    onAppointmentReschedule,
    dragState,
    dropTarget,
    targetAppointments = [],
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    checkTimeBlocked,
    isDayClosedForDate,
    openPopoverId,
    setOpenPopoverId,
    selectionMode = false,
    selectedIds = new Set(),
    onToggleSelection
}: CalendarWeekViewProps) => {
    // Get card size configuration from user preferences
    const { cardSize, heightScale } = useCardSize();
    const slotHeight = calculateSlotHeightFromCardSize(cardSize, heightScale);

    const weekDays = useMemo(() => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
    }, [currentDate]);

    const timeSlots = useMemo(() => generateTimeSlots(currentDate), [currentDate]);

    // Removed hoveredAppointmentId state to prevent global re-renders
    const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

    // Update current time indicator position
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

    // Filter appointments for this week (exclude null/undefined to avoid "reading 'id'" on drag)
    const weekAppointments = useMemo(() => {
        const start = startOfDay(weekDays[0]);
        const end = startOfDay(addDays(weekDays[5], 1)); // End at end of Saturday

        return (appointments || []).filter((apt): apt is Appointment => {
            if (apt == null || typeof (apt as Appointment).id !== 'string') return false;
            const aptDate = parseAppointmentDate(apt.date);
            return !!(aptDate && aptDate >= start && aptDate < end);
        });
    }, [appointments, weekDays]);

    // Group appointments by time slot for collision detection
    const appointmentsByTimeSlot = useMemo(() => {
        const result: Record<string, Appointment[]> = {};
        weekAppointments.forEach(apt => {
            const time = normalizeTime(apt.time);
            const date = parseAppointmentDate(apt.date);
            if (!date) return;

            const dayIndex = weekDays.findIndex(d => isSameDay(d, date));
            if (dayIndex === -1) return;

            const key = `${dayIndex}-${time}`;
            if (!result[key]) result[key] = [];
            result[key].push(apt);
        });
        return result;
    }, [weekAppointments, weekDays]);

    // Optimize blocked time checks by memoizing the status for all cells
    // This avoids O(N*M) calculations during render
    const blockedStatusCache = useMemo(() => {
        const cache = new Map<string, { blocked: boolean; reason?: string }>();

        weekDays.forEach(day => {
            timeSlots.forEach(time => {
                // Creates a unique key for the day+time combination
                // Using day index is safer than date string avoid timezone issues during lookup
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

    // Calculate position and width for overlapping appointments
    const getAppointmentStyle = useCallback((apt: Appointment) => {
        const aptDate = parseAppointmentDate(apt.date);
        if (!aptDate) return null;

        const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
        if (dayIndex === -1) return null;

        const time = normalizeTime(apt.time);
        const startRowIndex = timeSlots.findIndex(t => t === time);
        if (startRowIndex === -1) return null;

        // Duration-based height calculation
        const duration = apt.duration || 60;
        const heightInPixels = calculateAppointmentCardHeight(cardSize, duration, heightScale);

        // Check for collisions (guard against undefined entries)
        const key = `${dayIndex}-${time}`;
        const sameTimeAppointments = (appointmentsByTimeSlot[key] || []).filter((a): a is Appointment => a != null && typeof a.id === 'string');
        let index = sameTimeAppointments.findIndex(a => a.id === apt.id);
        let count = sameTimeAppointments.length;

        // Durante o drag sobre este slot, redimensionar os cards como se o arrastado já estivesse lá
        const isInDropTargetSlot = dropTarget && isSameDay(dropTarget.date, aptDate) && dropTarget.time === time;
        if (isInDropTargetSlot && dragState.isDragging && dragState.appointment && apt.id !== dragState.appointment.id) {
            const futureCount = targetAppointments.length + 1;
            const futureIndex = targetAppointments.findIndex(a => a.id === apt.id);
            if (futureIndex >= 0) {
                count = futureCount;
                index = futureIndex;
            }
        }

        const outerMargin = 4;
        const gap = 4;

        return {
            gridColumn: `${dayIndex + 2} / span 1`,
            gridRow: `${startRowIndex + 1}`,
            height: `${heightInPixels}px`,
            width: `calc((100% - ${(count + 1) * 4}px) / ${count})`,
            left: `calc(${outerMargin}px + ${index} * ((100% - ${(count + 1) * 4}px) / ${count} + ${gap}px))`,
            top: '0px',
            zIndex: 10 + index
        };
    }, [weekDays, timeSlots, appointmentsByTimeSlot, cardSize, heightScale, dropTarget, dragState, targetAppointments]);

    const isDraggable = !!onAppointmentReschedule;
    const isDraggingThis = useCallback((aptId: string) =>
        dragState.isDragging && dragState.appointment?.id === aptId, [dragState]
    );

    return (
        <TooltipProvider>
            <div className="flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100 font-display h-full relative overflow-hidden">
                {/* Wrap everything in a scroll container (both X and Y) */}
                <div className="overflow-auto w-full h-full custom-scrollbar">
                    <div className="w-full">
                        {/* Header Row */}
                        <div className="grid grid-cols-[60px_repeat(6,1fr)] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm min-w-[600px]">
                            {/* Time icon - Sticky Left */}
                            <div className="h-14 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center sticky left-0 z-50 bg-white dark:bg-slate-950">
                                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
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
                                            isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
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
                        <div className="relative bg-white dark:bg-slate-950" id="calendar-grid">
                            <div className="grid grid-cols-[60px_repeat(6,1fr)] relative min-h-0 min-w-[600px]" style={{
                                gridTemplateRows: `repeat(${timeSlots.length}, ${slotHeight}px)`
                            }}>

                                {/* Current Time Indicator Line - Spans all days */}
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

                                {/* Time Labels Column - Sticky Left */}
                                {timeSlots.map((time, index) => {
                                    const isHour = time.endsWith(':00');
                                    return (
                                        <div
                                            key={`time-${time}`}
                                            className={cn(
                                                "border-r border-slate-100 dark:border-slate-800 text-[11px] font-medium flex justify-end pr-2 pt-2 sticky left-0 z-30 bg-white dark:bg-slate-950",
                                                isHour ? "text-slate-500 dark:text-slate-400 -mt-2.5 translate-y-0" : "text-slate-300 dark:text-slate-600 hidden"
                                            )}
                                            style={{ gridRow: index + 1, gridColumn: 1 }}
                                        >
                                            {isHour ? time : ''}
                                        </div>
                                    );
                                })}

                                {/* Grid Background Cells for Interaction */}
                                {weekDays.map((day, colIndex) => {
                                    // Use memoized closed status
                                    const isClosed = dayClosedStatus[colIndex];

                                    return timeSlots.map((time, rowIndex) => {
                                        // Use memoized blocked status
                                        const key = `${colIndex}-${time}`;
                                        const { blocked } = blockedStatusCache.get(key) || { blocked: false };

                                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;

                                        // targetAppointments do hook já vem filtrado por slot via getAppointmentsForSlot
                                        const slotTargetAppointments = isDropTarget ? targetAppointments : [];

                                        return (
                                            <TimeSlotCell
                                                key={`cell-${colIndex}-${rowIndex}`}
                                                day={day}
                                                time={time}
                                                rowIndex={rowIndex}
                                                colIndex={colIndex}
                                                isClosed={isClosed}
                                                isBlocked={blocked}
                                                isDropTarget={!!isDropTarget}
                                                onTimeSlotClick={onTimeSlotClick}
                                                handleDragOver={handleDragOver}
                                                handleDragLeave={handleDragLeave}
                                                handleDrop={handleDrop}
                                                targetAppointments={slotTargetAppointments}
                                                draggedAppointment={dragState.appointment}
                                            />
                                        );
                                    });
                                })}

                                {/* Appointments Overlay */}
                                {weekAppointments.map(apt => {
                                    const style = getAppointmentStyle(apt);
                                    if (!style) return null;

                                    const aptDate = parseAppointmentDate(apt.date);
                                    if (!aptDate) return null;

                                    const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
                                    if (dayIndex === -1) return null;

                                    const day = weekDays[dayIndex];
                                    const aptTime = normalizeTime(apt.time);

                                    // Use lookup for blocked status
                                    // Note: appointments might have times not in timeSlots list?
                                    // If so, fall back to checkTimeBlocked?
                                    // Since we built cache based on timeSlots, if aptTime is not in list we might miss it.
                                    // But typically appointments align with slots.
                                    // Let's use checkTimeBlocked here as fallback to be safe since it's only for appointments (much fewer than cells)
                                    // or just use cache if we are sure. To match the plan optimization, we should prefer cache if possible.
                                    const key = `${dayIndex}-${aptTime}`;
                                    const cachedBlock = blockedStatusCache.get(key);
                                    const { blocked } = cachedBlock || checkTimeBlocked(day, aptTime);

                                    const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === aptTime;

                                    return (
                                        <CalendarAppointmentCard
                                            key={apt.id}
                                            appointment={apt}
                                            style={style}
                                            isDraggable={isDraggable}
                                            isDragging={isDraggingThis(apt.id)}
                                            isSaving={apt.id === savingAppointmentId}
                                            isDropTarget={!!isDropTarget}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => {
                                                // Allow dropping on existing appointments to add multiple at same time
                                                if (!isDraggingThis(apt.id) && !blocked) {
                                                    handleDragOver(e, day, aptTime);
                                                }
                                            }}
                                            onDrop={(e) => {
                                                // Allow dropping on existing appointments to add multiple at same time
                                                if (!isDraggingThis(apt.id) && !blocked) {
                                                    handleDrop(e, day, aptTime);
                                                }
                                            }}
                                            onEditAppointment={onEditAppointment}
                                            onDeleteAppointment={onDeleteAppointment}
                                            onOpenPopover={setOpenPopoverId}
                                            isPopoverOpen={openPopoverId === apt.id}
                                            selectionMode={selectionMode}
                                            isSelected={selectedIds?.has(apt.id)}
                                            onToggleSelection={onToggleSelection}
                                        />
                                    );
                                })}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
});

CalendarWeekView.displayName = 'CalendarWeekView';

