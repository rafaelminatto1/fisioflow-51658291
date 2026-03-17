import React, { memo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addWeeks, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Clock3 } from 'lucide-react';
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
    const MAX_VISIBLE_APPOINTMENTS = 4;
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
            <div className="grid grid-cols-7 border-b bg-gradient-to-r from-muted/50 to-muted/30 sticky top-0 z-10 backdrop-blur-sm shadow-sm" role="row">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => (
                    <div key={day} className="p-3 xs:p-4 text-center text-xs xs:text-sm font-semibold border-r border-border/50 last:border-r-0" role="columnheader">
                        <span className="sr-only">{day}</span>
                        <span aria-hidden="true">{day.substring(0, 3)}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 min-h-0 overflow-auto calendar-scroll" role="grid">
                <div
                    className="grid min-h-full"
                    style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(9.5rem, 1fr))` }}
                >
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-border/50 last:border-b-0" role="row">
                        {week.map(day => {
                            const dayAppointments = [...getAppointmentsForDate(day)].sort((a, b) => {
                                const timeA = a.time?.substring(0, 5) || '00:00';
                                const timeB = b.time?.substring(0, 5) || '00:00';
                                if (timeA !== timeB) return timeA.localeCompare(timeB);
                                return a.patientName.localeCompare(b.patientName);
                            });
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const dayString = format(day, 'dd/MM/yyyy');

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "flex h-full min-h-[9.5rem] flex-col border-r border-border/50 p-2.5 md:p-3 cursor-pointer transition-colors duration-200 group relative overflow-hidden",
                                        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                                        isToday(day) && "bg-primary/5 ring-1 ring-inset ring-primary/15 shadow-sm",
                                        isCurrentMonth && !isToday(day) && "hover:bg-primary/5 active:bg-primary/10"
                                    )}
                                    onClick={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (
                                            target.closest('[data-week-appointment="true"]') ||
                                            target.closest('[role="dialog"]') ||
                                            target.closest('[role="alertdialog"]')
                                        ) {
                                            return;
                                        }
                                        if (onTimeSlotClick) {
                                            onTimeSlotClick(day, '08:00');
                                        }
                                        onDateChange(day);
                                    }}
                                    role="gridcell"
                                    aria-label={`${dayString}${isToday(day) ? ' (Hoje)' : ''}${!isCurrentMonth ? ' - Outro mês' : ''}`}
                                    aria-current={isToday(day) ? 'date' : undefined}
                                >
                                    <div className="mb-3 flex items-start justify-between gap-2">
                                        <div className={cn(
                                            "text-xs xs:text-sm font-semibold transition-all duration-200 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-2xl shrink-0",
                                            isToday(day)
                                                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold shadow-lg ring-2 ring-primary/20"
                                                : "group-hover:text-primary group-hover:bg-primary/10"
                                        )}>
                                            {format(day, 'd')}
                                            <span className="sr-only">{format(day, 'EEEE', { locale: ptBR })}</span>
                                        </div>

                                        {dayAppointments.length > 0 && (
                                            <div className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] md:text-[11px] font-semibold text-muted-foreground shadow-sm border border-border/60">
                                                {dayAppointments.length}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-y-auto pr-1"
                                        role="list"
                                        aria-label={`${dayAppointments.length} agendamentos`}
                                    >
                                        {dayAppointments.slice(0, MAX_VISIBLE_APPOINTMENTS).map(apt => (
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
                                                        "appointment-card rounded-xl px-2 py-2 text-white cursor-pointer shadow-sm backdrop-blur-sm transition-all duration-200 group/card border",
                                                        "hover:-translate-y-0.5 hover:shadow-md hover:z-10",
                                                        getStatusColor(apt.status, isOverCapacity(apt)),
                                                        isOverCapacity(apt) && "animate-pulse ring-1 ring-amber-400"
                                                    )}
                                                    title={`${apt.patientName} - ${apt.time}`}
                                                    onPointerDownCapture={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenPopoverId(apt.id);
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`${apt.patientName} às ${apt.time} - ${apt.type || 'Agendamento'}`}
                                                >
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/85">
                                                                <Clock3 className="h-3 w-3 shrink-0" />
                                                                {apt.time}
                                                            </span>
                                                            {isOverCapacity(apt) && (
                                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-200" aria-label="Excedente" />
                                                            )}
                                                        </div>

                                                        <span className="line-clamp-2 text-[11px] md:text-xs font-semibold leading-tight text-white drop-shadow-sm">
                                                            {apt.patientName}
                                                        </span>

                                                        {apt.type && (
                                                            <span className="truncate text-[10px] text-white/75">
                                                                {apt.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </AppointmentQuickView>
                                        ))}
                                        {dayAppointments.length > MAX_VISIBLE_APPOINTMENTS && (
                                            <div className="more-appointments-indicator mt-auto rounded-lg border border-dashed border-primary/25 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary" role="status" aria-label={`${dayAppointments.length - MAX_VISIBLE_APPOINTMENTS} agendamentos adicionais`}>
                                                +{dayAppointments.length - MAX_VISIBLE_APPOINTMENTS} agendamentos adicionais
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
        </div>
    );
});

CalendarMonthView.displayName = 'CalendarMonthView';

export { CalendarMonthView };
