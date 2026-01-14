import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, AppointmentStatus } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, CheckCircle, Clock, MoreVertical, GripVertical, AlertCircle, XCircle } from 'lucide-react';

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
    // getStatusColor: (status: string, isOverCapacity?: boolean) => string; // Unused
    // isOverCapacity: (apt: Appointment) => boolean; // Unused
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
}

import { STATUS_CONFIG } from '@/lib/config/agenda';

// =====================================================================
// CONSTANTS
// =====================================================================

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_DURATION_MINUTES = 30;
const SLOT_HEIGHT = 80; // px per slot, matches the design's spacious feel

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

const normalizeTime = (time: string | null | undefined): string => {
    if (!time || !time.trim()) return '00:00';
    return time.substring(0, 5); // "08:00:00" -> "08:00"
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
    setOpenPopoverId
}: CalendarWeekViewProps) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const timeSlots = generateTimeSlots(currentDate);

    // Local state for hover effects
    const [hoveredAppointmentId, setHoveredAppointmentId] = useState<string | null>(null);
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
        const interval = setInterval(updatePosition, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    // Filter appointments for this week
    const weekAppointments = useMemo(() => {
        const start = startOfDay(weekDays[0]);
        const end = startOfDay(addDays(weekDays[6], 1));

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
        // Accurate height calculation based on duration
        const heightInPixels = (duration / SLOT_DURATION_MINUTES) * SLOT_HEIGHT;

        // Check for collisions
        const key = `${dayIndex}-${time}`;
        const sameTimeAppointments = appointmentsByTimeSlot[key] || [];
        const index = sameTimeAppointments.findIndex(a => a.id === apt.id);
        const count = sameTimeAppointments.length;

        // GAP and MARGIN config (in pixels)
        const outerMargin = 4;
        const gap = 4;

        return {
            gridColumn: `${dayIndex + 2} / span 1`,
            gridRow: `${startRowIndex + 1}`,
            height: `${heightInPixels}px`,
            width: `calc((100% - ${(count + 1) * 4}px) / ${count})`,
            left: `calc(${outerMargin}px + ${index} * ((100% - ${(count + 1) * 4}px) / ${count} + ${gap}px))`,
            top: '0px', // Align with the grid row start
            zIndex: 10 + index // stacking context for overlaps
        };
    }, [weekDays, timeSlots, appointmentsByTimeSlot]);

    const isDraggable = !!onAppointmentReschedule;
    const isDraggingThis = useCallback((aptId: string) =>
        dragState.isDragging && dragState.appointment?.id === aptId, [dragState]
    );

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-slate-900 dark:text-slate-100 font-display">
                {/* Header Row */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
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
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white dark:bg-slate-950" id="calendar-grid">
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] relative min-h-0" style={{
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
                                        isHour ? "text-slate-500 dark:text-slate-400 -mt-2.5 translate-y-0" : "text-slate-300 dark:text-slate-600 hidden" // Hide half-hour labels for cleaner look or style differently
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
                                const isHourStart = time.endsWith(':00');

                                return (
                                    <div
                                        key={`cell-${colIndex}-${rowIndex}`}
                                        className={cn(
                                            "border-r border-slate-100 dark:border-slate-800 relative transition-all duration-200",
                                            isHourStart && "border-t border-slate-100 dark:border-slate-800", // Solid line for hours
                                            !isHourStart && "border-t border-dashed border-slate-50 dark:border-slate-900", // Dashed for half-hours
                                            colIndex === 6 && "border-r-0",
                                            isClosed && "bg-slate-50/50 dark:bg-slate-900/20 pattern-diagonal-lines",
                                            !isClosed && !blocked && "hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer group/cell",
                                            blocked && "bg-slate-100/50 dark:bg-slate-800/50 cursor-not-allowed",
                                            isDropTarget && "bg-blue-50 dark:bg-blue-900/20 shadow-inner"
                                        )}
                                        style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
                                        onClick={() => !blocked && !isClosed && onTimeSlotClick(day, time)}
                                        onDragOver={(e) => !blocked && !isClosed && handleDragOver(e, day, time)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => !blocked && !isClosed && handleDrop(e, day, time)}
                                    >
                                        {/* Add button on hover - subtle */}
                                        {!blocked && !isClosed && (
                                            <div className="absolute inset-x-0 mx-auto w-fit -top-2.5 z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white shadow-md transform scale-75 group-hover/cell:scale-100 transition-transform">
                                                    <span className="text-sm leading-none mb-px">+</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })}

                        {/* Appointments Overlay */}
                        {weekAppointments.map(apt => {
                            const style = getAppointmentStyle(apt);
                            if (!style) return null;

                            const dragging = isDraggingThis(apt.id);
                            const hovered = hoveredAppointmentId === apt.id;
                            const config = STATUS_CONFIG[apt.status as AppointmentStatus] || STATUS_CONFIG.agendado;
                            const StatusIcon = config.icon;

                            // Determine if small card
                            const isSmall = (apt.duration || 60) <= 30;

                            const cardContent = (
                                <div
                                    draggable={isDraggable}
                                    onDragStart={(e) => handleDragStart(e, apt)}
                                    onDragEnd={handleDragEnd}
                                    onMouseEnter={() => setHoveredAppointmentId(apt.id)}
                                    onMouseLeave={() => setHoveredAppointmentId(null)}
                                    className={cn(
                                        "absolute rounded-md flex flex-col border-l-[3px] transition-all shadow-sm cursor-pointer overflow-hidden group hover:shadow-md",
                                        config.twBg,
                                        config.twBorder,
                                        "dark:bg-slate-800 dark:border-l-[3px]",
                                        isDraggable && "cursor-grab active:cursor-grabbing",
                                        dragging && "opacity-50 scale-95 z-50 ring-2 ring-blue-400",
                                        !dragging && hovered && "z-30 ring-1 ring-black/5 dark:ring-white/10",
                                        apt.status === 'cancelado' && "opacity-80 grayscale-[0.5]"
                                    )}
                                    style={{
                                        ...style,
                                        // Adjust z-index if needed
                                    }}
                                >
                                    <div className="p-1.5 flex flex-col h-full relative">
                                        {/* Header Line (Time + Status) */}
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase tracking-wide leading-none",
                                                config.twText?.replace('text-', 'text-opacity-80 text-') || ""
                                            )}>
                                                {normalizeTime(apt.time)} - {normalizeTime(addDays(parseISO(`2000-01-01T${apt.time}`), 0).toISOString().split('T')[1]?.substring(0, 5) /* quick hack for end time if not avail, normally would calc */)}
                                                {apt.duration &&
                                                    (() => {
                                                        const [h, m] = (apt.time || "00:00").split(':').map(Number);
                                                        const end = new Date(); end.setHours(h, m + apt.duration);
                                                        return format(end, 'HH:mm');
                                                    })()
                                                }
                                            </span>
                                            {StatusIcon && !isSmall && (
                                                <StatusIcon className={cn("w-3 h-3 opacity-70", config.twText)} />
                                            )}
                                        </div>

                                        {/* Patient Name */}
                                        <div className="flex items-start gap-1">
                                            <span className={cn(
                                                "text-[11px] font-bold truncate leading-tight",
                                                "text-slate-800 dark:text-slate-100",
                                                apt.status === 'cancelado' && "line-through decoration-red-500/50"
                                            )}>
                                                {apt.patientName || 'Paciente'}
                                            </span>
                                        </div>

                                        {/* Type/Treatment */}
                                        {!isSmall && (
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                                                {apt.type || 'Consulta'}
                                            </span>
                                        )}

                                        {/* Actions / Drag Handle Popup */}
                                        {hovered && isDraggable && !dragging && (
                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                                                <div className="bg-white/80 dark:bg-black/50 rounded p-0.5 hover:bg-white dark:hover:bg-black shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditAppointment?.(apt);
                                                    }}
                                                >
                                                    <MoreVertical className="w-3 h-3 text-slate-500" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Drag Handle (Visible on hover) */}
                                        {hovered && isDraggable && (
                                            <div className="absolute bottom-1 right-1 opacity-20 group-hover:opacity-100 cursor-grab">
                                                <GripVertical className="w-3 h-3 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );

                            return (
                                <Tooltip key={apt.id}>
                                    <AppointmentQuickView
                                        appointment={apt}
                                        open={openPopoverId === apt.id}
                                        onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                        onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                        onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                                    >
                                        <TooltipTrigger asChild>
                                            {cardContent}
                                        </TooltipTrigger>
                                    </AppointmentQuickView>

                                    <TooltipContent side="right" className="p-0 overflow-hidden border-none shadow-xl">
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 w-56">
                                            <div className={cn("w-full h-1.5 rounded-full mb-2", config.twBg?.replace('bg-', 'bg-').replace('50', '500') || "")} />
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-0.5">{apt.patientName}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                                <Clock className="w-3 h-3" />
                                                {apt.time} - {apt.duration}min
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className={cn("text-[10px] uppercase", config.twText, config.twBg, config.twBorder)}>
                                                    {apt.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}

                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
});

CalendarWeekView.displayName = 'CalendarWeekView';
