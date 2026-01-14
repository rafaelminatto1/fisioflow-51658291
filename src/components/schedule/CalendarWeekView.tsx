import React, { memo, useMemo, useState, useCallback } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, AppointmentStatus } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, GripVertical } from 'lucide-react';

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
    getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_DURATION_MINUTES = 30;
const SLOT_HEIGHT = 60; // px per slot

const STATUS_COLORS: Record<AppointmentStatus, string> = {
    agendado: 'bg-blue-500 border-l-blue-500',
    confirmado: 'bg-emerald-500 border-l-emerald-500',
    concluido: 'bg-slate-400 border-l-slate-400',
    cancelado: 'bg-red-500 border-l-red-500',
    realizado: 'bg-slate-400 border-l-slate-400',
    completed: 'bg-slate-400 border-l-slate-400',
    em_andamento: 'bg-yellow-500 border-l-yellow-500',
    avaliacao: 'bg-violet-500 border-l-violet-500',
    aguardando_confirmacao: 'bg-amber-500 border-l-amber-500',
    em_espera: 'bg-indigo-500 border-l-indigo-500',
    atrasado: 'bg-orange-500 border-l-orange-500',
    falta: 'bg-rose-500 border-l-rose-500',
    faltou: 'bg-rose-600 border-l-rose-600',
    remarcado: 'bg-cyan-500 border-l-cyan-500',
    reagendado: 'bg-teal-500 border-l-teal-500',
    atendido: 'bg-green-600 border-l-green-600',
};

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

const getStatusClass = (status: string): string => {
    return STATUS_COLORS[status as AppointmentStatus] || STATUS_COLORS.agendado;
};

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
        const span = Math.ceil(duration / SLOT_DURATION_MINUTES);

        // Check for collisions
        const key = `${dayIndex}-${time}`;
        const sameTimeAppointments = appointmentsByTimeSlot[key] || [];
        const index = sameTimeAppointments.findIndex(a => a.id === apt.id);
        const count = sameTimeAppointments.length;

        // Calculate width and offset
        const cardMargin = 4; // px
        const availableWidth = 100 - (cardMargin * 2);
        const width = count > 1 ? (availableWidth / count) - cardMargin : availableWidth;
        const left = cardMargin + (count > 1 ? index * (width + cardMargin) : 0);

        return {
            gridColumn: dayIndex + 2,
            gridRow: `${startRowIndex + 1} / span ${span}`,
            width: `${width}%`,
            left: `${left}%`,
        };
    }, [weekDays, timeSlots, appointmentsByTimeSlot]);

    const isDraggable = !!onAppointmentReschedule;
    const isDraggingThis = useCallback((aptId: string) =>
        dragState.isDragging && dragState.appointment?.id === aptId, [dragState]
    );

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
                    {/* Time icon */}
                    <div className="h-20 border-r border-slate-700 bg-slate-800 flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Days Headers */}
                    {weekDays.map((day, i) => {
                        const isTodayDate = isSameDay(day, new Date());
                        const dayAppointments = weekAppointments.filter(apt => {
                            const aptDate = parseAppointmentDate(apt.date);
                            return aptDate && isSameDay(aptDate, day);
                        });

                        const confirmed = dayAppointments.filter(a =>
                            a.status === 'confirmado' || a.status === 'confirmed'
                        ).length;
                        const scheduled = dayAppointments.filter(a =>
                            a.status === 'agendado' || a.status === 'scheduled'
                        ).length;

                        return (
                            <div key={i} className="h-20 flex flex-col items-center justify-center border-r border-slate-700 bg-slate-800/50">
                                <span className={cn(
                                    "text-xs font-bold uppercase tracking-wide mb-1",
                                    isTodayDate ? "text-blue-400" : "text-slate-500"
                                )}>
                                    {format(day, 'EEE', { locale: ptBR })}
                                </span>
                                <span className={cn(
                                    "text-2xl font-bold",
                                    isTodayDate ? "text-blue-400" : "text-slate-200"
                                )}>
                                    {format(day, 'd')}
                                </span>

                                {/* Status indicators */}
                                <div className="flex items-center gap-1.5 mt-1">
                                    {confirmed > 0 && (
                                        <Badge variant="outline" className="h-5 px-1.5 bg-emerald-900/20 border-emerald-700 text-emerald-400 text-[9px]">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1" />
                                            {confirmed}
                                        </Badge>
                                    )}
                                    {scheduled > 0 && (
                                        <Badge variant="outline" className="h-5 px-1.5 bg-blue-900/20 border-blue-700 text-blue-400 text-[9px]">
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
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-950">
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{
                        gridTemplateRows: `repeat(${timeSlots.length}, ${SLOT_HEIGHT}px)`
                    }}>

                        {/* Time Labels Column */}
                        {timeSlots.map((time, index) => {
                            const isHalfHour = time.includes(':30');
                            return (
                                <div
                                    key={`time-${time}`}
                                    className={cn(
                                        "border-r border-slate-800 text-xs flex justify-center pt-2 sticky left-0 z-10",
                                        isHalfHour ? "bg-slate-900/50 text-slate-600" : "bg-slate-900 text-slate-500"
                                    )}
                                    style={{ gridRow: index + 1, gridColumn: 1 }}
                                >
                                    {time}
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
                                    <div
                                        key={`cell-${colIndex}-${rowIndex}`}
                                        className={cn(
                                            "border-b border-r border-slate-800/50 transition-colors relative",
                                            colIndex === 6 && "border-r-0",
                                            isClosed && "bg-slate-900/40",
                                            !isClosed && !blocked && "hover:bg-blue-500/5 cursor-pointer",
                                            blocked && "bg-red-900/10 cursor-not-allowed",
                                            isDropTarget && "bg-blue-500/10 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.5)]"
                                        )}
                                        style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
                                        onClick={() => !blocked && !isClosed && onTimeSlotClick(day, time)}
                                        onDragOver={(e) => !blocked && !isClosed && handleDragOver(e, day, time)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => !blocked && !isClosed && handleDrop(e, day, time)}
                                    >
                                        {/* Add button on hover */}
                                        {!blocked && !isClosed && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                                                <span className="text-[10px] bg-blue-600/20 text-blue-200 px-1 rounded">+</span>
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
                                                "absolute rounded-md p-2 flex flex-col justify-center border-l-4 transition-all shadow-md cursor-pointer overflow-hidden",
                                                isDraggable && "cursor-grab active:cursor-grabbing",
                                                !dragging && "hover:z-20 hover:scale-[1.02] hover:shadow-lg",
                                                dragging && "opacity-40 scale-95 rotate-1",
                                                !dragging && dragState.isDragging && "opacity-60 scale-[0.98]",
                                                isDraggable && hovered && !dragging && "ring-2 ring-blue-400/50",
                                                getStatusColor(apt.status)
                                            )}
                                            style={{
                                                ...style,
                                                zIndex: dragging ? 5 : hovered ? 20 : 10,
                                            }}
                                        >
                                            {/* Drag handle indicator */}
                                            {isDraggable && hovered && !dragging && (
                                                <div className="absolute top-1 left-1 z-10" aria-label="Arraste para reagendar">
                                                    <div className="bg-white/90 dark:bg-slate-800/90 rounded-md p-1 shadow-md">
                                                        <GripVertical className="w-3 h-3 text-slate-600 dark:text-slate-400" />
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
                                                <div className="w-full h-full flex flex-col">
                                                    {/* Nome do Paciente */}
                                                    <p className="text-xs font-bold text-white truncate drop-shadow-sm leading-tight">
                                                        {apt.patientName || 'Paciente não identificado'}
                                                    </p>

                                                    {/* Horário e Terapeuta */}
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] font-medium bg-black/30 px-1.5 py-0.5 rounded text-white/90">
                                                            {normalizeTime(apt.time)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-200 truncate">
                                                            {apt.therapistName || apt.therapistId || 'Terapeuta'}
                                                        </span>
                                                    </div>

                                                    {/* Tipo e Sala */}
                                                    <div className="flex gap-1 items-center mt-auto">
                                                        <span className="text-[10px] text-slate-300 truncate opacity-90">
                                                            {apt.type}
                                                        </span>
                                                        {apt.room && (
                                                            <span className="text-[9px] bg-black/20 px-1 rounded text-white/80">
                                                                {apt.room}
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
                                            <p className="text-xs text-slate-500">{apt.type} • {apt.duration}min</p>
                                            <p className="text-xs text-slate-500">Status: {apt.status}</p>
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
