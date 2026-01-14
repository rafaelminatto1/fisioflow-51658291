import React, { memo, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, differenceInMinutes, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { logger } from '@/lib/errors/logger';

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
const END_HOUR = 21; // Until 21:00 inclusive = 21 * 60 minutes from start
const SLOT_DURATION_MINUTES = 30; // 30 min slots

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
        // Each slot is 1 row.
        return Math.floor(minutesFromStart / SLOT_DURATION_MINUTES) + 2;
    };

    // Calculate grid span based on duration
    const getGridSpan = (duration: number) => {
        return Math.ceil(duration / SLOT_DURATION_MINUTES);
    };

    const isDraggable = !!onAppointmentReschedule;

    return (
        <div className="flex flex-col h-full bg-dark-800 rounded-xl border border-gray-800 shadow-xl overflow-hidden">
            {/* Note: The user requested specific styling. I'm adapting their `calendar-grid` class concept into inline styles or Tailwind arbitrary values for React control */}

            {/* Header Row */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-dark-800 border-b border-gray-700 sticky top-0 z-30">
                {/* Empty corner */}
                <div className="h-16 border-r border-gray-700 bg-dark-800/95 backdrop-blur-sm"></div>

                {/* Days Headers */}
                {weekDays.map((day, i) => {
                    const isTodayDate = isSameDay(day, new Date());
                    return (
                        <div key={i} className="h-16 flex flex-col items-center justify-center border-r border-gray-700 bg-dark-800/95 backdrop-blur-sm last:border-r-0">
                            <span className={cn("text-xs font-medium mb-1 uppercase", isTodayDate ? "text-blue-400" : "text-gray-400")}>
                                {format(day, 'EEE', { locale: ptBR })}
                            </span>
                            <span className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-glow transition-all",
                                isTodayDate ? "bg-blue-600 text-white" : "text-gray-200"
                            )}>
                                {format(day, 'd')}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Grid Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-dark-900">
                {/* 
                    Grid Container 
                    Rows: 1fr for each time slot.
                 */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{
                    gridTemplateRows: `repeat(${timeSlots.length}, 60px)` // Fixed height per slot as per mockup
                }}>

                    {/* Time Labels Column */}
                    {timeSlots.map((time, index) => (
                        <div
                            key={`time-${time}`}
                            className="border-r border-gray-800 text-xs text-gray-500 flex justify-center pt-2 sticky left-0 bg-dark-900 z-10"
                            style={{ gridRow: index + 1, gridColumn: 1 }}
                        >
                            {time}
                        </div>
                    ))}

                    {/* Grid Background Cells for Interaction */}
                    {weekDays.map((day, colIndex) => {
                        const isClosed = isDayClosedForDate(day);
                        return timeSlots.map((time, rowIndex) => {
                            const { blocked, reason } = checkTimeBlocked(day, time);
                            const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;

                            return (
                                <div
                                    key={`cell-${colIndex}-${rowIndex}`}
                                    className={cn(
                                        "border-b border-r border-slate-800/50 transition-colors relative",
                                        colIndex === 6 && "border-r-0", // Last col no border right
                                        isClosed ? "bg-slate-900/40 pattern-diagonal-lines" : "hover:bg-white/5",
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
                        const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
                        if (!aptDate) return null;

                        // Find column index (0-6)
                        const dayDist = weekDays.findIndex(d => isSameDay(d, aptDate));
                        if (dayDist === -1) return null;

                        // Calculate Row and Span
                        // Normalize time to HH:mm format (handles "08:00:00" -> "08:00")
                        const rawTime = apt.time || '00:00';
                        const startTime = rawTime.substring(0, 5);
                        const startRowIndex = timeSlots.findIndex(t => t === startTime);
                        if (startRowIndex === -1) return null; // Time not in grid

                        const duration = apt.duration || 60; // Default 60 min
                        const span = Math.ceil(duration / 30); // Assuming 30min slots

                        // Check for collisions to adjust width/position (simple version)
                        // For a robust full calendar, we'd need a complex collision algo.
                        // Here we'll just allow overlaps via z-index or slight offset if exact match

                        return (
                            <div
                                key={apt.id}
                                draggable={isDraggable}
                                onDragStart={(e) => handleDragStart(e, apt)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "m-1 rounded-md p-2 flex flex-col justify-center border-l-4 transition-all hover:z-20 hover:scale-105 shadow-md cursor-pointer overflow-hidden",
                                    dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50",
                                    // Custom styling based on status/type provided in CSS
                                    getStatusColor(apt.status, isOverCapacity(apt))
                                )}
                                style={{
                                    gridColumn: dayDist + 2, // +2 because col 1 is time
                                    gridRow: `${startRowIndex + 1} / span ${span}`,
                                    zIndex: 10
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAppointmentClick && onAppointmentClick(apt);
                                }}
                            >
                                <AppointmentQuickView
                                    appointment={apt}
                                    open={openPopoverId === apt.id}
                                    onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                    onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                    onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                                >
                                    <div className="w-full h-full flex flex-col">
                                        {/* Nome do Paciente - destaque principal */}
                                        <p className="text-xs font-bold text-white truncate drop-shadow-sm leading-tight">
                                            {apt.patientName || 'Paciente não identificado'}
                                        </p>

                                        {/* Horário e Terapeuta */}
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] font-medium bg-black/30 px-1.5 py-0.5 rounded text-white/90">
                                                {startTime}
                                            </span>
                                            <span className="text-[10px] text-gray-200 truncate">
                                                {apt.therapistName || apt.therapistId || 'Terapeuta'}
                                            </span>
                                        </div>

                                        {/* Tipo e Sala */}
                                        <div className="flex gap-1 items-center mt-auto">
                                            <span className="text-[10px] text-gray-300 truncate opacity-90">{apt.type}</span>
                                            {apt.room && (
                                                <span className="text-[9px] bg-black/20 px-1 rounded text-white/80">
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

CalendarWeekView.displayName = 'CalendarWeekView';

