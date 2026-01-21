import React, { memo, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { Button } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Calendar, Clock, User, Stethoscope } from 'lucide-react';

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

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_HEIGHT = 64; // px per slot

export const CalendarWeekViewRefactored = memo(({
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

    // Calculate grid position
    const getGridRow = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const minutesFromStart = (h - START_HOUR) * 60 + m;
        return Math.floor(minutesFromStart / 30) + 1; // +1 because header is separate
    };

    const getGridSpan = (duration: number) => {
        return Math.ceil(duration / 30);
    };

    const isDraggable = !!onAppointmentReschedule;

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

            {/* Header with Days */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50/50">
                <div className="grid grid-cols-[80px_repeat(7,1fr)] divide-x divide-slate-200">
                    {/* Time Column Header */}
                    <div className="h-20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Day Headers */}
                    {weekDays.map((day, i) => {
                        const isToday = isSameDay(day, new Date());
                        const dayAppointments = weekAppointments.filter(apt => {
                            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
                            return aptDate && isSameDay(aptDate, day);
                        });

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "h-20 flex flex-col items-center justify-center py-2 transition-colors",
                                    isToday && "bg-blue-50/50"
                                )}
                            >
                                <span className={cn(
                                    "text-xs font-medium uppercase tracking-wide mb-1",
                                    isToday ? "text-blue-600" : "text-slate-500"
                                )}>
                                    {format(day, 'EEE', { locale: ptBR })}
                                </span>
                                <span className={cn(
                                    "text-2xl font-bold",
                                    isToday ? "text-blue-600" : "text-slate-900"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {dayAppointments.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                        <Calendar className="w-3 h-3" />
                                        <span>{dayAppointments.length}</span>
                                    </div>
                                )}
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
                    {timeSlots.map((time, index) => (
                        <div
                            key={`time-${time}`}
                            className="sticky left-0 z-10 bg-slate-50 border-b border-slate-100 flex items-start justify-center pt-2"
                            style={{ gridRow: index + 1, gridColumn: 1 }}
                        >
                            <span className="text-xs font-medium text-slate-500">{time}</span>
                        </div>
                    ))}

                    {/* Grid Cells */}
                    {weekDays.map((day, colIndex) => {
                        const isClosed = isDayClosedForDate(day);

                        return timeSlots.map((time, rowIndex) => {
                            const { blocked } = checkTimeBlocked(day, time);
                            const isDropTarget = dropTarget &&
                                isSameDay(dropTarget.date, day) &&
                                dropTarget.time === time;

                            return (
                                <div
                                    key={`cell-${colIndex}-${rowIndex}`}
                                    className={cn(
                                        "border-b border-slate-100 transition-colors relative group",
                                        isClosed && "bg-slate-50/50",
                                        blocked && "bg-red-50/30 cursor-not-allowed",
                                        !blocked && !isClosed && "hover:bg-blue-50/30 cursor-pointer",
                                        isDropTarget && "bg-blue-100/50 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.5)]"
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
                                    {/* Hour indicator line */}
                                    {rowIndex % 2 === 0 && (
                                        <div className="absolute inset-x-0 top-0 h-px bg-slate-200" />
                                    )}

                                    {/* Add button on hover */}
                                    {!blocked && !isClosed && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                                                <span className="text-white text-sm font-medium">+</span>
                                            </div>
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

                        return (
                            <div
                                key={apt.id}
                                draggable={isDraggable}
                                onDragStart={(e) => handleDragStart(e, apt)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "m-1.5 rounded-lg p-3 border-l-4 transition-all cursor-pointer shadow-sm hover:shadow-md",
                                    "hover:scale-[1.02] hover:z-20",
                                    dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50",
                                    getStatusColor(apt.status, isOverCapacity(apt))
                                )}
                                style={{
                                    gridColumn: dayIndex + 2,
                                    gridRow: `${startRowIndex + 1} / span ${span}`,
                                    zIndex: 10
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAppointmentClick) {
                                        onAppointmentClick(apt);
                                    }
                                }}
                            >
                                <AppointmentQuickView
                                    appointment={apt}
                                    open={openPopoverId === apt.id}
                                    onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                    onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                    onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                                >
                                    <div className="space-y-1">
                                        {/* Header with therapist */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Stethoscope className="w-3 h-3 text-white/70" />
                                                <p className="text-xs font-bold text-white truncate">
                                                    {apt.therapistId || 'Dr. Desconhecido'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/90">
                                                {apt.time}
                                            </span>
                                        </div>

                                        {/* Patient name */}
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3 h-3 text-white/70" />
                                            <p className="text-sm font-semibold text-white truncate">
                                                {apt.patientName}
                                            </p>
                                        </div>

                                        {/* Footer with type and room */}
                                        <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                            <span className="text-[10px] text-white/80 truncate flex-1">
                                                {apt.type}
                                            </span>
                                            {apt.room && (
                                                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/90 ml-2">
                                                    {apt.room}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </AppointmentQuickView>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

CalendarWeekViewRefactored.displayName = 'CalendarWeekViewRefactored';
