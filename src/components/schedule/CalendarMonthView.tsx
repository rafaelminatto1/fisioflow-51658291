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
    onTimeSlotClick?: (date: Date, time: string) => void;
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
    onTimeSlotClick,
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
        <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20 overflow-hidden" role="region" aria-label="Visualização mensal do calendário">
            {/* Week headers com melhor estilo */}
            <div className="grid grid-cols-7 border-b bg-gradient-to-r from-muted/50 to-muted/30 sticky top-0 z-10 backdrop-blur-sm shadow-sm" role="row">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => (
                    <div key={day} className="p-3 xs:p-4 text-center text-xs xs:text-sm font-semibold border-r border-border/50 last:border-r-0" role="columnheader">
                        <span className="sr-only">{day}</span>
                        <span aria-hidden="true">{day.substring(0, 3)}</span>
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 grid grid-rows-6 relative overflow-y-auto calendar-scroll" role="grid">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0 min-h-[90px] xs:min-h-[100px]" role="row">
                        {week.map(day => {
                            const dayAppointments = getAppointmentsForDate(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const dayString = format(day, 'dd/MM/yyyy');

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "border-r border-border/50 last:border-r-0 p-2 xs:p-3 cursor-pointer transition-all duration-200 group relative",
                                        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                                        isCurrentMonth && "hover:bg-primary/5 active:bg-primary/10"
                                    )}
                                    onClick={() => {
                                        if (onTimeSlotClick) {
                                            onTimeSlotClick(day, '08:00');
                                        }
                                        onDateChange(day);
                                    }}
                                    role="gridcell"
                                    aria-label={`${dayString}${isToday(day) ? ' (Hoje)' : ''}${!isCurrentMonth ? ' - Outro mês' : ''}`}
                                    aria-current={isToday(day) ? 'date' : undefined}
                                >
                                    <div className={cn(
                                        "text-xs xs:text-sm mb-1.5 xs:mb-2 font-medium transition-all duration-200 w-7 h-7 xs:w-8 xs:h-8 flex items-center justify-center rounded-full",
                                        isToday(day)
                                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold shadow-lg ring-2 ring-primary/20 current-day-indicator"
                                            : "group-hover:text-primary group-hover:bg-primary/10"
                                    )}>
                                        {format(day, 'd')}
                                        <span className="sr-only">{format(day, 'EEEE', { locale: ptBR })}</span>
                                    </div>

                                    <div className="space-y-1 overflow-hidden" role="list" aria-label={`${dayAppointments.length} agendamentos`}>
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
                                                        "appointment-card text-[9px] xs:text-[10px] p-1 xs:p-1.5 rounded-md text-white cursor-pointer shadow-sm backdrop-blur-sm border-2 border-white/20 transition-all duration-200 group/card",
                                                        "hover:shadow-md hover:scale-[1.02] hover:z-10 hover:border-white/30",
                                                        isOverCapacity(apt) && "animate-pulse ring-1 ring-amber-400"
                                                    )}
                                                    style={{ background: getStatusColor(apt.status, isOverCapacity(apt)) }}
                                                    title={`${apt.patientName} - ${apt.time}`}
                                                    onPointerDownCapture={(e) => e.stopPropagation()}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`${apt.patientName} às ${apt.time} - ${apt.type || 'Agendamento'}`}
                                                >
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="font-bold truncate leading-tight flex-1">
                                                                {isOverCapacity(apt) && <AlertTriangle className="h-2 w-2 inline mr-0.5 text-amber-300" aria-label="Excedente" />}
                                                                {apt.patientName}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between opacity-90 text-[8px] xs:text-[9px]">
                                                            <span className="font-medium">{apt.time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AppointmentQuickView>
                                        ))}
                                        {dayAppointments.length > 3 && (
                                            <div className="more-appointments-indicator text-[10px] xs:text-xs font-medium text-primary pl-1.5 xs:pl-2 pt-0.5 xs:pt-1 hover:underline cursor-pointer" role="status" aria-label={`${dayAppointments.length - 3} agendamentos adicionais`}>
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
