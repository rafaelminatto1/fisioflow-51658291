import React, { memo, useState } from 'react';
import { ptBR } from 'date-fns/locale';




import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { generateTimeSlots } from '@/lib/config/agenda';
import { DayColumn } from './CalendarDayColumn';
import { Button } from '@/components/ui/button';

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
    // Criar datas com horário fixo (meio-dia) para evitar problemas de timezone
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0);
    });
    const timeSlots = generateTimeSlots(currentDate);

    // Mobile: Show one day at a time with navigation
    const [mobileDayIndex, setMobileDayIndex] = useState(() => {
        const today = new Date();
        const todayIndex = weekDays.findIndex(d => isSameDay(d, today));
        return todayIndex >= 0 ? todayIndex : 0;
    });

    const currentMobileDay = weekDays[mobileDayIndex];
    const dayAppointments = currentMobileDay ? getAppointmentsForDate(currentMobileDay) : [];
    const isClosed = currentMobileDay ? isDayClosedForDate(currentMobileDay) : false;

    const handlePrevDay = () => {
        setMobileDayIndex(prev => Math.max(0, prev - 1));
    };

    const handleNextDay = () => {
        setMobileDayIndex(prev => Math.min(weekDays.length - 1, prev + 1));
    };

    return (
        <div className="flex bg-background h-full overflow-hidden flex-col">
            {/* Mobile Day Selector - Only visible on mobile */}
            <div className="md:hidden flex items-center justify-between p-2 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevDay}
                    disabled={mobileDayIndex === 0}
                    className="h-9 w-9 p-0 touch-target"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex flex-col items-center">
                    <span className={`text-lg font-bold ${isToday(currentMobileDay) ? 'text-primary' : ''}`}>
                        {format(currentMobileDay, 'd')}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                        {format(currentMobileDay, 'EEE', { locale: ptBR })}
                    </span>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextDay}
                    disabled={mobileDayIndex === weekDays.length - 1}
                    className="h-9 w-9 p-0 touch-target"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Week Grid - Desktop */}
            <div className="hidden md:flex flex-1 overflow-hidden">
                {/* Time column - Sticky e otimizado */}
                <div className="w-20 border-r border-border/50 bg-gradient-to-b from-card via-muted/30 to-muted/50 flex-shrink-0 flex flex-col">
                    <div className="h-16 border-b border-border/50 flex items-center justify-center bg-gradient-primary backdrop-blur-sm z-20 shadow-md shrink-0">
                        <Clock className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex flex-col">
                            {timeSlots.map(time => (
                                <div key={time} className="h-16 border-b border-border/30 p-2 text-xs text-foreground/70 font-bold flex items-center justify-center hover:bg-accent/50 transition-colors shrink-0">
                                    {time}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Week days - Grid */}
                <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-7 min-w-full bg-background/30">
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

            {/* Mobile Single Day View */}
            <div className="md:hidden flex-1 flex overflow-hidden">
                {/* Time column - Mobile */}
                <div className="w-14 border-r border-border/50 bg-gradient-to-b from-card via-muted/30 to-muted/50 flex-shrink-0 flex flex-col">
                    <div className="h-14 border-b border-border/50 flex items-center justify-center bg-gradient-primary backdrop-blur-sm z-20 shadow-md shrink-0">
                        <Clock className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex flex-col">
                            {timeSlots.map(time => (
                                <div key={time} className="h-12 border-b border-border/30 p-1 text-[10px] text-foreground/70 font-bold flex items-center justify-center hover:bg-accent/50 transition-colors shrink-0">
                                    {time}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Single Day Column - Mobile */}
                <div className="flex-1 overflow-auto">
                    <div className="min-w-full bg-background/30">
                        <DayColumn
                            key={currentMobileDay.toISOString()}
                            day={currentMobileDay}
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
                    </div>
                </div>
            </div>
        </div>
    );
});

CalendarWeekView.displayName = 'CalendarWeekView';

export { CalendarWeekView };
