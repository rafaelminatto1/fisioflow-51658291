import React, { memo, useMemo } from 'react';
import { format, isToday, isSameDay, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Ban, AlertTriangle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { logger } from '@/lib/errors/logger';

interface DayColumnProps {
    day: Date;
    timeSlots: string[];
    appointments: Appointment[];
    allAppointments?: Appointment[]; // Todos os agendamentos para verificar próximos
    isDayClosed: boolean;
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    handleDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
    checkTimeBlocked: (date: Date, time: string) => { blocked: boolean; reason?: string };
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
}

export const DayColumn = memo(({
    day,
    timeSlots,
    appointments,
    allAppointments,
    isDayClosed,
    onTimeSlotClick,
    onEditAppointment,
    onDeleteAppointment,
    dragState,
    dropTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    checkTimeBlocked,
    isOverCapacity,
    openPopoverId,
    setOpenPopoverId,
    onAppointmentReschedule
}: DayColumnProps) => {
    const isTodayDate = isToday(day);
    const isDraggable = !!onAppointmentReschedule;

    // Função para verificar se o paciente tem agendamento próximo (1 dia de diferença)
    const hasNearbyAppointment = useMemo(() => {
        if (!allAppointments || allAppointments.length === 0) return {};
        const nearbyMap: Record<string, {
            hasNearby: boolean;
            nearbyDates: string[];
        }> = {};

        appointments.forEach(apt => {
            if (!apt.patientId || !apt.date) return;

            const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;

            // Buscar agendamentos do mesmo paciente em dias próximos (diferença de 1 dia)
            const nearby = allAppointments
                .filter(a =>
                    a.patientId === apt.patientId &&
                    a.id !== apt.id &&
                    a.date &&
                    !['cancelado', 'cancelada'].includes(a.status?.toLowerCase() || '')
                )
                .map(a => {
                    const aDate = typeof a.date === 'string' ? parseISO(a.date) : a.date;
                    const diff = Math.abs(differenceInDays(aptDate, aDate));
                    return { appointment: a, diff, date: aDate };
                })
                .filter(({ diff }) => diff === 1) // Apenas diferença de exatamente 1 dia
                .map(({ date }) => ({
                    date: format(date, 'dd/MM')
                }));

            if (nearby.length > 0) {
                nearbyMap[apt.id] = {
                    hasNearby: true,
                    nearbyDates: nearby.map(n => n.date)
                };
            }
        });

        return nearbyMap;
    }, [allAppointments, appointments]);

    // Função para obter a classe CSS baseada no status
    const getStatusClass = (status: string, therapistId?: string | null): string => {
        const normalizedStatus = status?.toLowerCase().replace(/[^a-zà-ú0-9]/g, '') || '';

        // Se tiver fisioterapeuta específico, usa a classe roxa
        if (therapistId) {
            return 'calendar-card-fisioterapeuta';
        }

        // Mapeamento de status para classes CSS
        const statusMap: Record<string, string> = {
            'agendado': 'calendar-card-agendado',
            'confirmado': 'calendar-card-confirmado',
            'realizado': 'calendar-card-realizado',
            'concluido': 'calendar-card-concluido',
            'atendido': 'calendar-card-atendido',
            'completado': 'calendar-card-completado',
            'cancelado': 'calendar-card-cancelado',
            'avaliacao': 'calendar-card-avaliacao',
            'avaliação': 'calendar-card-avaliação',
            'emandamento': 'calendar-card-em_andamento',
            'em_andamento': 'calendar-card-em_andamento',
            'pendente': 'calendar-card-pendente',
        };

        return statusMap[normalizedStatus] || 'calendar-card-agendado';
    };



    return (
        <div
            className="w-full h-full calendar-column-divider last:border-r-0 relative group flex-shrink-0"
            role="column"
            aria-label={`Coluna do dia ${format(day, 'dd/MM/yyyy')}`}
        >
            <div className={cn(
                "calendar-day-header",
                isTodayDate
                    ? "today"
                    : ""
            )}>
                <div className="font-extrabold uppercase tracking-wider text-[11px] sm:text-xs lg:text-sm opacity-90">
                    {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={cn(
                    "day-number text-xl sm:text-2xl lg:text-3xl font-black mt-1 sm:mt-1.5 relative inline-flex items-center justify-center leading-none",
                    isTodayDate && "drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                )}>
                    {format(day, 'd')}
                    {isTodayDate && (
                        <>
                            <span className="sr-only"> (Hoje)</span>
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-pulse shadow-lg" aria-hidden="true" />
                        </>
                    )}
                </div>
            </div>

            {/* Time slots interativos */}
            <div className="relative w-full" role="grid" aria-label={`Slots de horário para ${format(day, 'dd/MM')}`}>
                {isDayClosed ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs p-4 min-h-[500px]" role="status" aria-label="Dia fechado">
                        <div className="flex flex-col items-center gap-2">
                            <Ban className="h-4 w-4" aria-hidden="true" />
                            <span>Fechado</span>
                        </div>
                    </div>
                ) : (
                    timeSlots.map((time) => {
                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;
                        const { blocked, reason } = checkTimeBlocked(day, time);

                        return (
                            <TimeSlot
                                key={time}
                                time={time}
                                day={day}
                                blocked={blocked}
                                reason={reason}
                                isDropTarget={isDropTarget || false}
                                onTimeSlotClick={onTimeSlotClick}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            />
                        );
                    })
                )}

                {/* Appointments overlay - with stacking support for multiple appointments at same time */}
                {(() => {
                    // Agrupar appointments por horário para calcular offset horizontal
                    const appointmentsByTime: Record<string, Appointment[]> = {};
                    appointments.forEach(apt => {
                        const time = apt.time || '09:00';
                        if (!appointmentsByTime[time]) {
                            appointmentsByTime[time] = [];
                        }
                        appointmentsByTime[time].push(apt);
                    });

                    return appointments.map(apt => {
                        // Safety check for time - handle null, undefined, or empty string
                        const time = apt.time && apt.time.trim() ? apt.time : '00:00';
                        const [hours, minutes] = time.split(':').map(Number);
                        const slotIndex = timeSlots.findIndex(slot => {
                            const [slotHour, slotMin] = slot.split(':').map(Number);
                            return slotHour === hours && slotMin === minutes;
                        });

                        // Log se o agendamento não pôde ser posicionado porque o horário não existe nos slots
                        if (slotIndex === -1 && !isDayClosed) {
                            logger.warn(`Agendamento não renderizado: horário não encontrado nos timeSlots`, {
                                aptId: apt.id,
                                aptTime: time,
                                patientName: apt.patientName,
                                day: format(day, 'yyyy-MM-dd'),
                                availableSlots: timeSlots.slice(0, 5).join(', ')
                            }, 'CalendarDayColumn');
                            return null;
                        }

                        // Calcular offset horizontal para appointments empilhados no mesmo horário
                        const sameTimeAppointments = appointmentsByTime[apt.time || '09:00'] || [];
                        const stackIndex = sameTimeAppointments.findIndex(a => a.id === apt.id);
                        const stackCount = sameTimeAppointments.length;

                        // Calcular largura e offset baseado em quantos appointments estão empilhados
                        const widthPercent = stackCount > 1 ? (100 / stackCount) - 2 : 100;
                        const leftPercent = stackCount > 1 ? (stackIndex * (100 / stackCount)) + 1 : 0;

                        // Altura e posição baseada na duração: 48px/slot mobile, 60px/slot desktop (cada slot = 30min)
                        const duration = apt.duration || 60;
                        const slots = duration / 30;
                        const heightMobile = slots * 48; // h-12 = 48px (reduzido de 64px)
                        const heightDesktop = slots * 60; // sm:h-15 = 60px (reduzido de 80px)
                        const topMobile = slotIndex >= 0 ? slotIndex * 48 : 0;
                        const topDesktop = slotIndex >= 0 ? slotIndex * 60 : 0;

                        return (
                            // Wrapper de posicionamento
                            <div
                                key={apt.id}
                                draggable={isDraggable}
                                onDragStart={(e) => handleDragStart(e, apt)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => {
                                    if (apt.date && apt.time) {
                                        const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
                                        handleDragOver(e, aptDate, apt.time);
                                    }
                                }}
                                onDrop={(e) => {
                                    if (apt.date && apt.time) {
                                        const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
                                        handleDrop(e, aptDate, apt.time);
                                    }
                                }}
                                className={cn(
                                    "appointment-card absolute transition-all duration-200 group/card z-10",
                                    dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50 scale-95 dragging-ghost",
                                    "hover:z-20 card-hover" // Garantir que o hover fique por cima
                                )}
                                style={{
                                    top: `${topMobile}px`,
                                    height: `${heightMobile}px`,
                                    // Posicionamento dinâmico para appointments empilhados
                                    left: stackCount > 1 ? `${leftPercent}%` : '4px',
                                    width: stackCount > 1 ? `${widthPercent}%` : 'calc(100% - 8px)',
                                    ['--top-desktop' as string]: `${topDesktop}px`,
                                    ['--height-desktop' as string]: `${heightDesktop}px`,
                                    zIndex: stackCount > 1 ? 10 + stackIndex : undefined,
                                } as React.CSSProperties}
                                onPointerDownCapture={(e) => e.stopPropagation()}
                                role="button"
                                tabIndex={0}
                                aria-label={`${apt.patientName} às ${apt.time} - ${apt.type || 'Agendamento'}`}
                            >
                                <style dangerouslySetInnerHTML={{
                                    __html: `
                  @media (min-width: 640px) {
                    [style*="--top-desktop"][style*="--height-desktop"] {
                      top: var(--top-desktop) !important;
                      height: var(--height-desktop) !important;
                    }
                  }
                `}} />
                                <AppointmentQuickView
                                    appointment={apt}
                                    open={openPopoverId === apt.id}
                                    onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                    onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                    onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                                >
                                    <div className={cn(
                                        "calendar-appointment-card",
                                        getStatusClass(apt.status, apt.therapistId),
                                        isOverCapacity(apt) && "over-capacity"
                                    )}>
                                        {/* Indicador de agendamento próximo (bolinha amarela) */}
                                        {hasNearbyAppointment[apt.id]?.hasNearby && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="nearby-appointment-indicator" aria-hidden="true" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">
                                                            Paciente tem agendamento próximo em: {hasNearbyAppointment[apt.id]?.nearbyDates.join(', ')}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}

                                        {/* Content */}
                                        <div className="calendar-appointment-card-content">
                                            <div className="min-w-0">
                                                {/* Patient Name */}
                                                <div className="calendar-patient-name" title={apt.patientName}>
                                                    {isOverCapacity(apt) && (
                                                        <AlertTriangle className="h-3 w-3 inline mr-1 flex-shrink-0" aria-label="Excedente" />
                                                    )}
                                                    <span className="truncate">{apt.patientName}</span>
                                                </div>

                                                {/* Service Type */}
                                                <div className="calendar-appointment-type" title={apt.type}>
                                                    <span className="truncate">{apt.type || 'Consulta'}</span>
                                                </div>
                                            </div>

                                            {/* Footer: Time & Room */}
                                            <div className="calendar-appointment-footer">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                                    <span>{apt.time}</span>
                                                </div>
                                                {apt.room && (
                                                    <span className="truncate" aria-label={`Sala ${apt.room}`}>
                                                        {apt.room}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Drag handle */}
                                        {isDraggable && (
                                            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-40 transition-opacity" aria-hidden="true">
                                                <GripVertical className="h-3 w-3 hidden sm:block" />
                                            </div>
                                        )}
                                    </div>
                                </AppointmentQuickView>
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
});

DayColumn.displayName = 'DayColumn';

interface TimeSlotProps {
    time: string;
    day: Date;
    blocked: boolean;
    reason?: string;
    isDropTarget: boolean;
    onTimeSlotClick: (date: Date, time: string) => void;
    onDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, date: Date, time: string) => void;
}

const TimeSlot = memo(({
    time,
    day,
    blocked,
    reason,
    isDropTarget,
    onTimeSlotClick,
    onDragOver,
    onDragLeave,
    onDrop
}: TimeSlotProps) => {
    const dayString = format(day, 'dd/MM/yyyy');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (blocked) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTimeSlotClick(day, time);
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "calendar-time-slot cursor-pointer group/slot relative",
                            blocked ? "blocked" : "",
                            isDropTarget && !blocked && "is-drop-target"
                        )}
                        onClick={() => !blocked && onTimeSlotClick(day, time)}
                        onKeyDown={handleKeyDown}
                        onDragOver={(e) => !blocked && onDragOver(e, day, time)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => !blocked && onDrop(e, day, time)}
                        role="button"
                        tabIndex={blocked ? -1 : 0}
                        aria-label={
                            blocked
                                ? `Horário ${time} bloqueado${reason ? ': ' + reason : ''}`
                                : `Criar agendamento para ${dayString} às ${time}`
                        }
                    >
                        {blocked ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-destructive/60" aria-hidden="true">
                                <Ban className="h-2 w-2" />
                            </span>
                        ) : (
                            <span className={cn(
                                "absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-foreground opacity-0 group-hover/slot:opacity-100 transition-all duration-200 scale-95 group-hover/slot:scale-100 pointer-events-none",
                                isDropTarget && "opacity-100"
                            )} aria-hidden="true">
                                <span className="bg-gradient-primary px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg">
                                    {isDropTarget ? '↓ Soltar' : '+ Novo'}
                                </span>
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                {blocked && reason && (
                    <TooltipContent>
                        <p>{reason}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
});

TimeSlot.displayName = 'TimeSlot';
