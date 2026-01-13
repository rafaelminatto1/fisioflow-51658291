import React, { memo } from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Ban, AlertTriangle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { logger } from '@/lib/errors/logger';

interface DayColumnProps {
    day: Date;
    timeSlots: string[];
    appointments: Appointment[];
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
    getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
}

export const DayColumn = memo(({
    day,
    timeSlots,
    appointments,
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
    getStatusColor,
    isOverCapacity,
    openPopoverId,
    setOpenPopoverId,
    onAppointmentReschedule
}: DayColumnProps) => {
    const isTodayDate = isToday(day);
    const isDraggable = !!onAppointmentReschedule;

    // Keyboard navigation handler for time slots
    const handleSlotKeyDown = (e: React.KeyboardEvent, date: Date, time: string, blocked: boolean) => {
        if (blocked) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTimeSlotClick(date, time);
        }
    };

    return (
        <div
            className="w-full sm:w-auto border-r border-border/50 last:border-r-0 relative group flex-shrink-0"
            role="column"
            aria-label={`Coluna do dia ${format(day, 'dd/MM/yyyy')}`}
        >
            <div className={cn(
                "h-14 sm:h-16 border-b border-border/50 sticky top-0 z-10 p-2 sm:p-3 text-center text-xs sm:text-sm backdrop-blur-md transition-all duration-300 shadow-sm",
                isTodayDate
                    ? "bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 ring-2 ring-primary/40"
                    : "bg-gradient-to-br from-muted/60 to-muted/40 hover:from-muted/80 hover:to-muted/60"
            )}>
                <div className="font-extrabold uppercase tracking-wider text-[10px] sm:text-xs opacity-90">
                    {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={cn(
                    "text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 relative inline-flex items-center justify-center",
                    isTodayDate && "drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                )}>
                    {format(day, 'd')}
                    {isTodayDate && (
                        <>
                            <span className="sr-only"> (Hoje)</span>
                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" aria-hidden="true" />
                        </>
                    )}
                </div>
            </div>

            {/* Time slots interativos */}
            <div className="relative" role="grid" aria-label={`Slots de horário para ${format(day, 'dd/MM')}`}>
                {isDayClosed ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs p-4 min-h-[500px]" role="status" aria-label="Dia fechado">
                        <div className="flex flex-col items-center gap-2">
                            <Ban className="h-4 w-4" aria-hidden="true" />
                            <span>Fechado</span>
                        </div>
                    </div>
                ) : (
                    timeSlots.map((time, index) => {
                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;
                        const { blocked, reason } = checkTimeBlocked(day, time);
                        const dayString = format(day, 'dd/MM/yyyy');

                        return (
                            <TooltipProvider key={time}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "time-slot h-12 sm:h-16 border-b border-border/20 cursor-pointer transition-all duration-200 group/slot relative",
                                                blocked
                                                    ? "bg-destructive/10 cursor-not-allowed"
                                                    : "hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 active:bg-primary/20",
                                                isDropTarget && !blocked && "bg-primary/25 ring-2 ring-primary ring-inset drop-zone-active"
                                            )}
                                            onClick={() => !blocked && onTimeSlotClick(day, time)}
                                            onKeyDown={(e) => handleSlotKeyDown(e, day, time, blocked)}
                                            onDragOver={(e) => !blocked && handleDragOver(e, day, time)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => !blocked && handleDrop(e, day, time)}
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

                        // Altura e posição baseada na duração: 48px/slot mobile, 64px/slot desktop (cada slot = 30min)
                        const duration = apt.duration || 60;
                        const slots = duration / 30;
                        const heightMobile = slots * 48; // h-12 = 48px
                        const heightDesktop = slots * 64; // sm:h-16 = 64px
                        const topMobile = slotIndex >= 0 ? slotIndex * 48 : 0;
                        const topDesktop = slotIndex >= 0 ? slotIndex * 64 : 0;

                        return (
                            // Wrapper de posicionamento
                            <div
                                key={apt.id}
                                draggable={isDraggable}
                                onDragStart={(e) => handleDragStart(e, apt)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "appointment-card absolute transition-all duration-200 group/card z-10",
                                    dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50 scale-95 dragging-ghost",
                                    "hover:z-20 card-hover" // Garantir que o hover fique por cima
                                )}
                                style={{
                                    top: `${topMobile}px`,
                                    height: `${heightMobile}px`,
                                    // Posicionamento dinâmico para appointments empilhados
                                    left: stackCount > 1 ? `${leftPercent}%` : '2px',
                                    right: stackCount > 1 ? 'auto' : '2px',
                                    width: stackCount > 1 ? `${widthPercent}%` : 'calc(100% - 4px)',
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
                                    <div className="calendar-appointment-card">
                                        {/* Status indicator - border esquerda colorida */}
                                        <div
                                            className="calendar-appointment-card-status-bg"
                                            style={{ background: getStatusColor(apt.status, isOverCapacity(apt)) }}
                                            aria-hidden="true"
                                        />

                                        {/* Content */}
                                        <div className="calendar-appointment-card-content">
                                            <div className="min-w-0">
                                                {/* Patient Name - ALTO CONTRASTE */}
                                                <div className="calendar-patient-name" title={apt.patientName}>
                                                    {isOverCapacity(apt) && (
                                                        <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500 flex-shrink-0" aria-label="Excedente" />
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
