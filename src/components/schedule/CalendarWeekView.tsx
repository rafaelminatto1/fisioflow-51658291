import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { TimeSlotCell } from './TimeSlotCell';

// =====================================================================
// TYPES
// =====================================================================

interface CalendarWeekViewProps {
    currentDate: Date;
    appointments: Appointment[];
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
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
const SLOT_HEIGHT = 50; // px per slot (reduzido de 80px para 60px -> agora 50px)

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
    onTimeSlotClick,
    onEditAppointment,
    onDeleteAppointment,
    onAppointmentReschedule,
    dragState,
    dropTarget,
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
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
    const timeSlots = generateTimeSlots(currentDate);

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
            const position = (totalMinutesFromStart / SLOT_DURATION_MINUTES) * SLOT_HEIGHT;
            setCurrentTimePosition(position);
        };

        updatePosition();
        const interval = setInterval(updatePosition, 60000);
        return () => clearInterval(interval);
    }, []);

    // Filter appointments for this week
    const weekAppointments = useMemo(() => {
        const start = startOfDay(weekDays[0]);
        const end = startOfDay(addDays(weekDays[5], 1)); // End at end of Saturday

        return appointments.filter(apt => {
            const aptDate = parseAppointmentDate(apt.date);
            return aptDate && aptDate >= start && aptDate < end;
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
        const heightInPixels = (duration / SLOT_DURATION_MINUTES) * SLOT_HEIGHT;

        // Check for collisions
        const key = `${dayIndex}-${time}`;
        const sameTimeAppointments = appointmentsByTimeSlot[key] || [];
        const index = sameTimeAppointments.findIndex(a => a.id === apt.id);
        const count = sameTimeAppointments.length;

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
    }, [weekDays, timeSlots, appointmentsByTimeSlot]);

    const isDraggable = !!onAppointmentReschedule;
    const isDraggingThis = useCallback((aptId: string) =>
        dragState.isDragging && dragState.appointment?.id === aptId, [dragState]
    );

    return (
        <TooltipProvider>
            <div className="flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100 font-display">
                {/* Header Row */}
                <div className="grid grid-cols-[60px_repeat(6,1fr)] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
                    {/* Time icon */}
                    <div className="h-14 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center">
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
                    <div className="grid grid-cols-[60px_repeat(6,1fr)] relative min-h-0" style={{
                        gridTemplateRows: `repeat(${timeSlots.length}, ${SLOT_HEIGHT}px)`
                    }}>

                        {/* Current Time Indicator Line */}
                        {currentTimePosition !== null && (
                            <div
                                className="absolute left-[60px] right-0 z-20 pointer-events-none flex items-center"
                                style={{ top: `${currentTimePosition}px` }}
                            >
                                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                                <div className="h-px bg-red-500 w-full shadow-sm"></div>
                            </div>
                        )}

                        {/* Time Labels Column */}
                        {timeSlots.map((time, index) => {
                            const isHour = time.endsWith(':00');
                            return (
                                <div
                                    key={`time-${time}`}
                                    className={cn(
                                        "border-r border-slate-100 dark:border-slate-800 text-[11px] font-medium flex justify-end pr-2 pt-2 sticky left-0 z-10 bg-white dark:bg-slate-950",
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
                            const isClosed = isDayClosedForDate(day);
                            return timeSlots.map((time, rowIndex) => {
                                const { blocked } = checkTimeBlocked(day, time);
                                const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;

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
                            const { blocked } = checkTimeBlocked(day, aptTime);
                            const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === aptTime;

                            return (
                                <CalendarAppointmentCard
                                    key={apt.id}
                                    appointment={apt}
                                    style={style}
                                    isDraggable={isDraggable}
                                    isDragging={isDraggingThis(apt.id)}
                                    isDropTarget={isDropTarget}
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
        </TooltipProvider>
    );
});

CalendarWeekView.displayName = 'CalendarWeekView';

