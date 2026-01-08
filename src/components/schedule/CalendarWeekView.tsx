import React, { memo } from 'react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { Clock } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { DayColumn } from './CalendarDayColumn';

interface CalendarWeekViewProps {
    currentDate: Date;
    appointments: Appointment[];
    onTimeSlotClick: (date: Date, time: string) => void;
    onAppointmentClick?: (appointment: Appointment) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    // Drag and drop props
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    handleDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
    // Helpers
    checkTimeBlocked: (date: Date, time: string) => { blocked: boolean; reason?: string };
    isDayClosedForDate: (date: Date) => boolean;
    getAppointmentsForDate: (date: Date) => Appointment[];
    getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
}

const CalendarWeekView = memo(({
    currentDate,
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
    getAppointmentsForDate,
    getStatusColor,
    isOverCapacity,
    openPopoverId,
    setOpenPopoverId
}: CalendarWeekViewProps) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const timeSlots = generateTimeSlots(currentDate);

    return (
        <div className="flex bg-background h-full overflow-hidden">
            {/* Time column - Sticky e otimizado */}
            <div className="w-16 sm:w-20 border-r border-border/50 bg-gradient-to-b from-card via-muted/30 to-muted/50 flex-shrink-0 flex flex-col">
                <div className="h-14 sm:h-16 border-b border-border/50 flex items-center justify-center bg-gradient-primary backdrop-blur-sm z-20 shadow-md shrink-0">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex flex-col">
                        {timeSlots.map(time => (
                            <div key={time} className="h-12 sm:h-16 border-b border-border/30 p-1 sm:p-2 text-[10px] sm:text-xs text-foreground/70 font-bold flex items-center justify-center hover:bg-accent/50 transition-colors shrink-0">
                                {time}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Week days - Grid com scroll horizontal suave */}
            <div className="flex-1 overflow-auto">
                <div className="inline-flex sm:grid sm:grid-cols-7 min-w-full bg-background/30">
                    {weekDays.map(day => {
                        const dayAppointments = getAppointmentsForDate(day);
                        const isClosed = isDayClosedForDate(day);

                        return (
                            <DayColumn
                                key={day.toISOString()}
                                day={day}
                                timeSlots={timeSlots}
                                appointments={dayAppointments}
                                isDayClosed={isClosed}
                                onTimeSlotClick={onTimeSlotClick}
                                onEditAppointment={onEditAppointment}
                                onDeleteAppointment={onDeleteAppointment}
                                dragState={dragState}
                                dropTarget={dropTarget}
                                handleDragStart={handleDragStart}
                                handleDragEnd={handleDragEnd}
                                handleDragOver={handleDragOver}
                                handleDragLeave={handleDragLeave}
                                handleDrop={handleDrop}
                                checkTimeBlocked={checkTimeBlocked}
                                getStatusColor={getStatusColor}
                                isOverCapacity={isOverCapacity}
                                openPopoverId={openPopoverId}
                                setOpenPopoverId={setOpenPopoverId}
                                onAppointmentReschedule={onAppointmentReschedule}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

CalendarWeekView.displayName = 'CalendarWeekView';

export { CalendarWeekView };
