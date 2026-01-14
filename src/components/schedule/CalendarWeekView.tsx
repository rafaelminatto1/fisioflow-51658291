import React, { memo, useMemo, useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Stethoscope, Users, AlertCircle, Info, GripVertical, Calendar } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarWeekViewProps {
    currentDate: Date;
    appointments: Appointment[];
    onTimeSlotClick: (date: Date, time: string) => void;
    onAppointmentClick?: (appointment: Appointment) => void;
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
    getAppointmentsForDate: (date: Date) => Appointment[];
    getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
}

// Helper to calculate grid position
const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_HEIGHT = 64; // px per slot
const DEFAULT_MAX_CAPACITY = 4;

// Status colors according to requirements
const STATUS_COLORS = {
    agendado: 'bg-blue-500 border-l-blue-500',
    confirmado: 'bg-emerald-500 border-l-emerald-500',
    concluido: 'bg-slate-400 border-l-slate-400',
    cancelado: 'bg-red-500 border-l-red-500',
    realizado: 'bg-slate-400 border-l-slate-400',
    completed: 'bg-slate-400 border-l-slate-400',
} as const;

export const CalendarWeekView = memo(({
    currentDate,
    appointments,
    onTimeSlotClick,
    onAppointmentClick,
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
    getStatusColor,
    isOverCapacity,
    openPopoverId,
    setOpenPopoverId
}: CalendarWeekViewProps) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const timeSlots = generateTimeSlots(currentDate);

    // Local state for hover effects
    const [hoveredAppointmentId, setHoveredAppointmentId] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    // timeSlots should ideally be 07:00, 07:30, ... 20:30

    // Filter appointments for this week
    const weekAppointments = useMemo(() => {
        const start = startOfDay(weekDays[0]);
        const end = startOfDay(addDays(weekDays[6], 1));

        return appointments.filter(apt => {
            if (!apt.date) return false;
            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
            return aptDate >= start && aptDate < end;
        });
    }, [appointments, weekDays]);

    // Calculate grid row for a given time string "HH:mm"
    const getGridRow = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const minutesFromStart = (h - START_HOUR) * 60 + m;
        // Row 1 is header. Row 2 is start time.
        // Each slot is 1 row (30 minutes).
        return Math.floor(minutesFromStart / 30) + 2;
    };

    // Calculate grid span based on duration
    const getGridSpan = (duration: number) => {
        return Math.ceil(duration / 30);
    };

    // Calculate capacity for each time slot
    const getSlotCapacity = (date: Date, time: string) => {
        const slotAppointments = weekAppointments.filter(apt => {
            if (!apt.date) return false;
            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
            return isSameDay(aptDate, date) && apt.time === time;
        });
        const maxCapacity = DEFAULT_MAX_CAPACITY;
        return {
            current: slotAppointments.length,
            max: maxCapacity,
            available: maxCapacity - slotAppointments.length,
            isFull: slotAppointments.length >= maxCapacity,
            isNearCapacity: slotAppointments.length >= maxCapacity * 0.75
        };
    };

    // Check for patient conflicts (patient with appointment within 1 day)
    const checkPatientConflict = (patientId: string, newDate: Date) => {
        const patientAppointments = weekAppointments.filter(
            apt => apt.patientId === patientId
        );

        for (const apt of patientAppointments) {
            if (!apt.date) continue;
            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
            const daysDiff = Math.abs(differenceInDays(newDate, aptDate));

            if (daysDiff <= 1) {
                return {
                    hasConflict: true,
                    existingDate: aptDate,
                    existingTime: apt.time
                };
            }
        }
        return { hasConflict: false };
    };

    // Get status color class
    const getStatusClass = (status: string) => {
        return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.agendado;
    };

    const isDraggable = !!onAppointmentReschedule;

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

                {/* Header Row */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
                    {/* Time icon */}
                    <div className="h-20 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center sticky left-0 z-10">
                        <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>

                    {/* Days Headers */}
                    {weekDays.map((day, i) => {
                        const isTodayDate = isSameDay(day, new Date());
                        const dayAppointments = weekAppointments.filter(apt => {
                            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
                            return aptDate && isSameDay(aptDate, day);
                        });

                        const confirmed = dayAppointments.filter(a =>
                            a.status === 'confirmado' || a.status === 'confirmed'
                        ).length;
                        const scheduled = dayAppointments.filter(a =>
                            a.status === 'agendado' || a.status === 'scheduled'
                        ).length;

                        return (
                            <div key={i} className={cn(
                                "h-20 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 px-2",
                                i < weekDays.length - 1 && "border-r border-slate-200 dark:border-slate-700"
                            )}>
                                <span className={cn("text-xs font-bold uppercase tracking-wide mb-1", isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")}>
                                    {format(day, 'EEE', { locale: ptBR })}
                                </span>
                                <span className={cn(
                                    "text-2xl font-bold",
                                    isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-slate-100"
                                )}>
                                    {format(day, 'd')}
                                </span>

                                {/* Status indicators */}
                                <div className="flex items-center gap-1.5 mt-1">
                                    {confirmed > 0 && (
                                        <Badge variant="outline" className="h-5 px-1.5 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-[9px]">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1" />
                                            {confirmed}
                                        </Badge>
                                    )}
                                    {scheduled > 0 && (
                                        <Badge variant="outline" className="h-5 px-1.5 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-[9px]">
                                            <span className="w-1 h-1 rounded-full bg-blue-500 mr-1" />
                                            {scheduled}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Scrollable Grid Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white dark:bg-slate-950">
                    <div className="grid grid-cols-[80px_repeat(7,1fr)] divide-x divide-slate-200 dark:divide-slate-700" style={{
                        gridTemplateRows: `repeat(${timeSlots.length}, ${SLOT_HEIGHT}px)`,
                        maxHeight: '100%'
                    }}>

                        {/* Time Labels Column */}
                        {timeSlots.map((time, index) => {
                            const isHalfHour = time.includes(':30');
                            return (
                                <div
                                    key={`time-${time}`}
                                    className={cn(
                                        "sticky left-0 z-10 border-b border-slate-100 dark:border-slate-800 flex items-start justify-center pt-2",
                                        isHalfHour ? "bg-slate-50/50 dark:bg-slate-900/50" : "bg-slate-50 dark:bg-slate-900"
                                    )}
                                    style={{ gridRow: index + 1, gridColumn: 1 }}
                                >
                                    <span className={cn("text-xs font-medium", isHalfHour ? "text-slate-400 dark:text-slate-600" : "text-slate-600 dark:text-slate-400")}>
                                        {time}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Grid Background Cells for Interaction */}
                        {weekDays.map((day, colIndex) => {
                            const isClosed = isDayClosedForDate(day);
                            return timeSlots.map((time, rowIndex) => {
                                const { blocked } = checkTimeBlocked(day, time);
                                const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;
                                const capacity = getSlotCapacity(day, time);
                                const isHalfHour = time.includes(':30');

                                return (
                                    <div
                                        key={`cell-${colIndex}-${rowIndex}`}
                                        className={cn(
                                            "transition-all duration-200 relative group",
                                            // Hour lines: solid for full hour, dashed for half hour
                                            isHalfHour
                                                ? "border-b border-dashed border-slate-200 dark:border-slate-700"
                                                : "border-b border-solid border-slate-300 dark:border-slate-600",
                                            isClosed && "bg-slate-100/50 dark:bg-slate-900/40 pattern-diagonal-lines",
                                            blocked && "bg-red-50/30 dark:bg-red-900/10 cursor-not-allowed",
                                            !blocked && !isClosed && "hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer",
                                            // Enhanced drop target styles
                                            isDropTarget && cn(
                                                "bg-blue-100/70 dark:bg-blue-900/40",
                                                "shadow-[inset_0_0_0_3px_rgba(59,130,246,0.6)]",
                                                "animate-pulse-subtle"
                                            ),
                                            // Show drag hint when dragging
                                            dragState.isDragging && !blocked && !isClosed && !isDropTarget && "bg-blue-50/20 dark:bg-blue-900/5",
                                            capacity.isNearCapacity && !isClosed && "bg-amber-50/30 dark:bg-amber-900/10",
                                            capacity.isFull && !isClosed && "bg-red-50/20 dark:bg-red-900/10"
                                        )}
                                        style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
                                        onClick={() => !blocked && !isClosed && onTimeSlotClick(day, time)}
                                        onDragOver={(e) => {
                                            if (!blocked && !isClosed) {
                                                setIsDraggingOver(true);
                                                handleDragOver(e, day, time);
                                            }
                                        }}
                                        onDragLeave={() => {
                                            setIsDraggingOver(false);
                                            handleDragLeave();
                                        }}
                                        onDrop={(e) => {
                                            setIsDraggingOver(false);
                                            if (!blocked && !isClosed) handleDrop(e, day, time);
                                        }}
                                    >
                                        {/* Capacity indicator */}
                                        {!isClosed && !blocked && (capacity.current > 0 || capacity.available > 0) && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="absolute top-1 right-1 flex items-center gap-1">
                                                        {capacity.isFull ? (
                                                            <div className="bg-red-500 dark:bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                                                                CHEIO
                                                            </div>
                                                        ) : capacity.current > 0 ? (
                                                            <div className={cn(
                                                                "flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                                                                capacity.isNearCapacity
                                                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                                            )}>
                                                                <Users className="w-2.5 h-2.5" />
                                                                <span>{capacity.current}/{capacity.max}</span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Capacidade: {capacity.current} de {capacity.max} vagas</p>
                                                    {capacity.isFull && <p className="text-red-600 dark:text-red-400 font-medium">Horário completo!</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {/* Add button on hover - enhanced for drag */}
                                        {!blocked && !isClosed && !capacity.isFull && (
                                            <div className={cn(
                                                "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-200",
                                                // Show + when hovering normally
                                                !dragState.isDragging && "opacity-0 group-hover:opacity-100",
                                                // Show drag hint when dragging
                                                dragState.isDragging && isDraggingOver && isDropTarget && "opacity-100",
                                                dragState.isDragging && !isDropTarget && "opacity-40"
                                            )}>
                                                {dragState.isDragging && isDropTarget ? (
                                                    // Show calendar icon when dragging
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-xl animate-bounce-subtle">
                                                            <Calendar className="w-6 h-6 text-white" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded-full shadow-sm">
                                                            Solte aqui
                                                        </span>
                                                    </div>
                                                ) : (
                                                    // Regular add button
                                                    <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                                                        <span className="text-white text-lg font-medium">+</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Blocked indicator */}
                                        {blocked && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <AlertCircle className="w-4 h-4 text-red-400 dark:text-red-500" />
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })}

                        {/* Appointments Overlay */}
                        {weekAppointments.map(apt => {
                            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
                            if (!aptDate) return null;

                            const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
                            if (dayIndex === -1) return null;

                            const startTime = (apt.time || '00:00').substring(0, 5);
                            const startRowIndex = timeSlots.findIndex(t => t === startTime);
                            if (startRowIndex === -1) return null;

                            const duration = apt.duration || 60;
                            const span = Math.ceil(duration / 30);

                            // Check for patient conflict
                            const patientConflict = apt.patientId
                                ? checkPatientConflict(apt.patientId, aptDate)
                                : null;

                            const isDraggingThis = dragState.isDragging && dragState.appointment?.id === apt.id;
                            const isHovered = hoveredAppointmentId === apt.id;

                            return (
                                <Tooltip key={apt.id}>
                                    <TooltipTrigger asChild>
                                        <div
                                            draggable={isDraggable}
                                            onDragStart={(e) => handleDragStart(e, apt)}
                                            onDragEnd={handleDragEnd}
                                            onMouseEnter={() => setHoveredAppointmentId(apt.id)}
                                            onMouseLeave={() => setHoveredAppointmentId(null)}
                                            className={cn(
                                                "m-1.5 rounded-lg p-3 border-l-4 transition-all duration-200",
                                                // Base cursor
                                                isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                                                // Hover effects
                                                !isDraggingThis && "hover:shadow-lg hover:scale-[1.02] hover:z-20",
                                                // Dragging state - enhanced visual feedback
                                                isDraggingThis && cn(
                                                    "opacity-40 scale-95 shadow-xl",
                                                    "rotate-1",
                                                    "cursor-grabbing"
                                                ),
                                                // Another appointment being dragged
                                                !isDraggingThis && dragState.isDragging && "opacity-60 scale-[0.98]",
                                                getStatusClass(apt.status),
                                                // Drag handle indicator on hover
                                                isDraggable && isHovered && !isDraggingThis && "ring-2 ring-blue-400/50"
                                            )}
                                            style={{
                                                gridColumn: dayIndex + 2,
                                                gridRow: `${startRowIndex + 1} / span ${span}`,
                                                zIndex: isDraggingThis ? 5 : isHovered ? 20 : 10,
                                                transform: isDraggingThis ? 'rotate(2deg)' : undefined,
                                            }}
                                        >
                                            {/* Patient conflict indicator */}
                                            {patientConflict?.hasConflict && (
                                                <div className="absolute -top-1 -right-1 z-20">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
                                                                <Info className="w-3 h-3 text-white" />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="font-medium">Paciente tem agendamento próximo!</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                Também agendado para {format(patientConflict.existingDate, 'dd/MM')} às {patientConflict.existingTime}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            )}

                                            {/* Drag handle indicator - shown on hover */}
                                            {isDraggable && isHovered && !isDraggingThis && (
                                                <div className="absolute top-2 left-2 z-10" aria-label="Arraste para reagendar">
                                                    <div className="bg-white/90 dark:bg-slate-800/90 rounded-md p-1.5 shadow-md">
                                                        <GripVertical className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                                    </div>
                                                </div>
                                            )}

                                            <AppointmentQuickView
                                                appointment={apt}
                                                open={openPopoverId === apt.id}
                                                onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                                onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                                onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                                            >
                                                <div className="space-y-1.5">
                                                    {/* Header with therapist */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <Stethoscope className="w-3.5 h-3.5 text-white/80" />
                                                            <p className="text-xs font-bold text-white truncate">
                                                                {apt.therapistId || 'Dr. Desconhecido'}
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium">
                                                            {apt.time}
                                                        </span>
                                                    </div>

                                                    {/* Patient name */}
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-white/80" />
                                                        <p className="text-sm font-semibold text-white truncate">
                                                            {apt.patientName || 'Paciente não identificado'}
                                                        </p>
                                                    </div>

                                                    {/* Footer with type and room */}
                                                    <div className="flex items-center justify-between pt-1.5 border-t border-white/20">
                                                        <span className="text-[10px] text-white/90 truncate flex-1">
                                                            {apt.type}
                                                        </span>
                                                        {apt.room && (
                                                            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium ml-2">
                                                                Sala {apt.room}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </AppointmentQuickView>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="space-y-1">
                                            <p className="font-medium">{apt.patientName || 'Paciente'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{apt.type} • {apt.duration}min</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Status: {apt.status}</p>
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

