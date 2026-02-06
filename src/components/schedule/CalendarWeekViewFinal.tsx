import React, { memo, useMemo, useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Stethoscope, Users, AlertCircle, Info } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppointmentQuickView } from './AppointmentQuickView';
import {

    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
    maxCapacity?: number;
}

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_HEIGHT = 64; // px per slot
const DEFAULT_MAX_CAPACITY = 4;

// Status colors according to requirements
const STATUS_COLORS = {
    agendado: 'bg-blue-500 border-blue-600',
    confirmado: 'bg-emerald-500 border-emerald-600',
    concluido: 'bg-slate-400 border-slate-500',
    cancelado: 'bg-red-500 border-red-600',
    realizado: 'bg-slate-400 border-slate-500',
    completed: 'bg-slate-400 border-slate-500',
} as const;

// Helper to get border-left color class
const getBorderLeftColor = (status: string) => {
    const colorMap: Record<string, string> = {
        agendado: 'border-l-blue-500',
        confirmado: 'border-l-emerald-500',
        concluido: 'border-l-slate-400',
        cancelado: 'border-l-red-500',
        realizado: 'border-l-slate-400',
        completed: 'border-l-slate-400',
    };
    return colorMap[status] || 'border-l-blue-500';
};

export const CalendarWeekViewFinal = memo(({
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
    setOpenPopoverId,
    maxCapacity = DEFAULT_MAX_CAPACITY,
}: CalendarWeekViewProps) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const timeSlots = generateTimeSlots(currentDate);

    // Filter appointments for this week
    const weekAppointments = useMemo(() => {
        const start = new Date(weekDays[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(weekDays[6]);
        end.setHours(23, 59, 59, 999);

        return appointments.filter(apt => {
            if (!apt.date) return false;
            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
            return aptDate >= start && aptDate <= end;
        });
    }, [appointments, weekDays]);

    // Calculate capacity for each time slot
    const getSlotCapacity = (date: Date, time: string) => {
        const slotAppointments = weekAppointments.filter(apt => {
            if (!apt.date) return false;
            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
            return isSameDay(aptDate, date) && apt.time === time;
        });
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

    // Calculate grid position
    const getGridRow = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const minutesFromStart = (h - START_HOUR) * 60 + m;
        return Math.floor(minutesFromStart / 30) + 1;
    };

    const getGridSpan = (duration: number) => {
        return Math.ceil(duration / 30);
    };

    const isDraggable = !!onAppointmentReschedule;

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

                {/* Header with Days */}
                <div className="shrink-0 border-b border-slate-200 bg-slate-50/50">
                    <div className="grid grid-cols-[80px_repeat(7,1fr)] divide-x divide-slate-200">
                        {/* Time Column Header */}
                        <div className="h-24 flex items-center justify-center bg-slate-50">
                            <Clock className="w-5 h-5 text-gray-500" />
                        </div>

                        {/* Day Headers */}
                        {weekDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            const dayAppointments = weekAppointments.filter(apt => {
                                const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
                                return aptDate && isSameDay(aptDate, day);
                            });

                            // Count confirmed vs scheduled
                            const confirmed = dayAppointments.filter(a =>
                                a.status === 'confirmado' || a.status === 'confirmed'
                            ).length;
                            const scheduled = dayAppointments.filter(a =>
                                a.status === 'agendado' || a.status === 'scheduled'
                            ).length;

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-24 flex flex-col items-center justify-center py-3 transition-colors",
                                        isToday && "bg-blue-50/50"
                                    )}
                                >
                                    <span className={cn(
                                        "text-xs font-bold uppercase tracking-wide mb-1",
                                        isToday ? "text-blue-600" : "text-slate-500"
                                    )}>
                                        {format(day, 'EEE', { locale: ptBR })}
                                    </span>
                                    <span className={cn(
                                        "text-3xl font-bold",
                                        isToday ? "text-blue-600" : "text-slate-900"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    {/* Status indicators */}
                                    <div className="flex items-center gap-2 mt-1">
                                        {confirmed > 0 && (
                                            <Badge variant="outline" className="h-5 px-1.5 bg-emerald-50 border-emerald-200 text-emerald-700 text-[10px]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                                                {confirmed}
                                            </Badge>
                                        )}
                                        {scheduled > 0 && (
                                            <Badge variant="outline" className="h-5 px-1.5 bg-blue-50 border-blue-200 text-blue-700 text-[10px]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />
                                                {scheduled}
                                            </Badge>
                                        )}
                                        {dayAppointments.length > 0 && (
                                            <span className="text-[10px] text-gray-500">
                                                {dayAppointments.length} total
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scrollable Calendar Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div
                        className="grid grid-cols-[80px_repeat(7,1fr)] divide-x divide-slate-200"
                        style={{
                            gridTemplateRows: `repeat(${timeSlots.length}, ${SLOT_HEIGHT}px)`,
                            maxHeight: '100%'
                        }}
                    >
                        {/* Time Labels */}
                        {timeSlots.map((time, index) => {
                            const isHalfHour = time.includes(':30');
                            return (
                                <div
                                    key={`time-${time}`}
                                    className={cn(
                                        "sticky left-0 z-10 bg-slate-50 border-b border-slate-100 flex items-start justify-center pt-2",
                                        isHalfHour && "bg-slate-100/50"
                                    )}
                                    style={{ gridRow: index + 1, gridColumn: 1 }}
                                >
                                    <span className={cn(
                                        "text-xs font-medium",
                                        isHalfHour ? "text-gray-500" : "text-slate-600"
                                    )}>
                                        {time}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Grid Cells with Capacity Indicators */}
                        {weekDays.map((day, colIndex) => {
                            const isClosed = isDayClosedForDate(day);

                            return timeSlots.map((time, rowIndex) => {
                                const { blocked } = checkTimeBlocked(day, time);
                                const isDropTarget = dropTarget &&
                                    isSameDay(dropTarget.date, day) &&
                                    dropTarget.time === time;
                                const capacity = getSlotCapacity(day, time);
                                const isHalfHour = time.includes(':30');

                                return (
                                    <div
                                        key={`cell-${colIndex}-${rowIndex}`}
                                        className={cn(
                                            "border-b transition-colors relative group",
                                            // Hour lines: solid for full hour, dashed for half hour
                                            isHalfHour
                                                ? "border-b border-dashed border-slate-200"
                                                : "border-b border-solid border-slate-300",
                                            isClosed && "bg-slate-50/50 pattern-diagonal-lines",
                                            blocked && "bg-red-50/30 cursor-not-allowed",
                                            !blocked && !isClosed && "hover:bg-blue-50/30 cursor-pointer",
                                            isDropTarget && "bg-blue-100/50 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.5)]",
                                            // Visual indication for near/full capacity
                                            capacity.isNearCapacity && !isClosed && "bg-amber-50/30",
                                            capacity.isFull && !isClosed && "bg-red-50/20"
                                        )}
                                        style={{
                                            gridRow: rowIndex + 1,
                                            gridColumn: colIndex + 2
                                        }}
                                        onClick={() => !blocked && !isClosed && onTimeSlotClick(day, time)}
                                        onDragOver={(e) => !blocked && !isClosed && handleDragOver(e, day, time)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => !blocked && !isClosed && handleDrop(e, day, time)}
                                    >
                                        {/* Capacity indicator */}
                                        {!isClosed && !blocked && (capacity.current > 0 || capacity.available > 0) && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="absolute top-1 right-1 flex items-center gap-1">
                                                        {capacity.isFull ? (
                                                            <div className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                                                                CHEIO
                                                            </div>
                                                        ) : capacity.current > 0 ? (
                                                            <div className={cn(
                                                                "flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                                                                capacity.isNearCapacity
                                                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                                            )}>
                                                                <Users className="w-2.5 h-2.5" />
                                                                <span>{capacity.current}/{capacity.max}</span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Capacidade: {capacity.current} de {capacity.max} vagas</p>
                                                    {capacity.isFull && <p className="text-red-600 font-medium">Horário completo!</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}

                                        {/* Add button on hover */}
                                        {!blocked && !isClosed && !capacity.isFull && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors">
                                                    <span className="text-white text-lg font-medium">+</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Blocked indicator */}
                                        {blocked && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <AlertCircle className="w-4 h-4 text-red-400" />
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })}

                        {/* Appointments */}
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

                            return (
                                <AppointmentQuickView
                                    key={apt.id}
                                    appointment={apt}
                                    open={openPopoverId === apt.id}
                                    onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                    onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                    onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                                >
                                    <div
                                        draggable={isDraggable}
                                        onDragStart={(e) => handleDragStart(e, apt)}
                                        onDragEnd={handleDragEnd}
                                        className={cn(
                                            "m-1.5 rounded-lg p-3 border-l-4 transition-all cursor-pointer shadow-sm hover:shadow-md relative",
                                            "hover:scale-[1.02] hover:z-20",
                                            dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50",
                                            getBorderLeftColor(apt.status),
                                            STATUS_COLORS[apt.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.agendado
                                        )}
                                        style={{
                                            gridColumn: dayIndex + 2,
                                            gridRow: `${startRowIndex + 1} / span ${span}`,
                                            zIndex: 10
                                        }}
                                    >
                                        {/* Patient conflict indicator */}
                                        {patientConflict?.hasConflict && (
                                            <div className="absolute -top-1 -right-1 z-20">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                                            <Info className="w-3 h-3 text-white" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-medium">Paciente tem agendamento próximo!</p>
                                                        <p className="text-xs text-slate-500">
                                                            Também agendado para {format(patientConflict.existingDate, 'dd/MM')} às {patientConflict.existingTime}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}

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
                                                    {apt.patientName}
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
                                    </div>
                                </AppointmentQuickView>
                            );
                        })}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
});

CalendarWeekViewFinal.displayName = 'CalendarWeekViewFinal';
