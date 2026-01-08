import React, { memo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addWeeks, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { AppointmentQuickView } from './AppointmentQuickView';

interface CalendarMonthViewProps {
    currentDate: Date;
    appointments: Appointment[];
    onDateChange: (date: Date) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    // Helpers
    getAppointmentsForDate: (date: Date) => Appointment[];
    getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
}

const CalendarMonthView = memo(({
    currentDate,
    onDateChange,
    onEditAppointment,
    onDeleteAppointment,
    getAppointmentsForDate,
    getStatusColor,
    isOverCapacity,
    openPopoverId,
    setOpenPopoverId
}: CalendarMonthViewProps) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const weeks = [];
    let currentWeekStart = startDate;

    while (currentWeekStart <= endDate) {
        const week = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
        weeks.push(week);
        currentWeekStart = addWeeks(currentWeekStart, 1);
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20 overflow-hidden">
            {/* Week headers com melhor estilo */}
            <div className="grid grid-cols-7 border-b bg-gradient-to-r from-muted/50 to-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="p-4 text-center text-sm font-semibold border-r border-border/50 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 grid grid-rows-6 relative overflow-y-auto">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0 min-h-[100px]">
                        {week.map(day => {
                            const dayAppointments = getAppointmentsForDate(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "border-r border-border/50 last:border-r-0 p-3 cursor-pointer transition-all duration-200 group relative",
                                        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                                        isCurrentMonth && "hover:bg-primary/5 hover:shadow-inner"
                                    )}
                                    onClick={() => onDateChange(day)}
                                >
                                    <div className={cn(
                                        "text-sm mb-2 font-medium transition-all duration-200 w-8 h-8 flex items-center justify-center rounded-full",
                                        isToday(day)
                                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold shadow-lg ring-2 ring-primary/20"
                                            : "group-hover:text-primary group-hover:bg-primary/10"
                                    )}>
                                        {format(day, 'd')}
                                    </div>

                                    <div className="space-y-1.5 overflow-hidden">
                                        {dayAppointments.slice(0, 3).map(apt => (
                                            <AppointmentQuickView
                                                key={apt.id}
                                                appointment={apt}
                                                open={openPopoverId === apt.id}
                                                onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                                onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                                onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                                            >
                                                <div
                                                    className={cn(
                                                        "text-xs p-2 rounded-lg text-white cursor-pointer truncate shadow-md border-l-3 transition-all duration-300",
                                                        getStatusColor(apt.status, isOverCapacity(apt)),
                                                        "hover:shadow-xl hover:scale-110 hover:-translate-x-0.5",
                                                        isOverCapacity(apt) && "animate-pulse"
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="font-bold truncate drop-shadow-sm flex items-center gap-1">
                                                        {isOverCapacity(apt) && <AlertTriangle className="h-3 w-3 flex-shrink-0" />}
                                                        {apt.time}
                                                    </div>
                                                    <div className="truncate opacity-95 text-xs font-medium">{apt.patientName}</div>
                                                </div>
                                            </AppointmentQuickView>
                                        ))}
                                        {dayAppointments.length > 3 && (
                                            <div className="text-xs font-medium text-primary pl-2 pt-1 hover:underline">
                                                +{dayAppointments.length - 3} mais
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
});

CalendarMonthView.displayName = 'CalendarMonthView';

export { CalendarMonthView };
