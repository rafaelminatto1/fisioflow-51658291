import React, { memo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Ban, Calendar, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';

interface CalendarDayViewProps {
    currentDate: Date;
    currentTime: Date;
    currentTimePosition: number;
    // appointments, // We will use getAppointmentsForDate instead for consistency
    getAppointmentsForDate: (date: Date) => Appointment[];

    timeSlots: string[];
    isDayClosed: boolean;
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    // Drag and drop
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    handleDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
    // Helpers
    isTimeBlocked: (time: string) => boolean;
    getBlockReason: (time: string) => string | undefined;
    _getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
    // Selection props
    selectionMode?: boolean;
    selectedIds?: Set<string>;
    onToggleSelection?: (id: string) => void;
}

const CalendarDayView = memo(({
    currentDate,
    currentTime,
    currentTimePosition,
    // appointments, // We will use getAppointmentsForDate instead for consistency
    getAppointmentsForDate,
    timeSlots,
    isDayClosed,
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
    isTimeBlocked,
    getBlockReason,
    // _getStatusColor, // Not used with CalendarAppointmentCard
    // isOverCapacity, // Not used with CalendarAppointmentCard
    openPopoverId,
    setOpenPopoverId,
    selectionMode = false,
    selectedIds = new Set(),
    onToggleSelection
}: CalendarDayViewProps) => {

    // Logic inconsistency fix: usage of helper passed from parent
    const dayAppointments = getAppointmentsForDate(currentDate);

    // Local state for hover effects (handled by Card now, but might be needed for other things? probably not)
    // const [hoveredAppointmentId, setHoveredAppointmentId] = useState<string | null>(null);

    if (isDayClosed) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Ban className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Clínica fechada neste dia</p>
                <p className="text-sm">Não há horários disponíveis</p>
            </div>
        );
    }

    return (
        <div className="flex bg-gradient-to-br from-background to-muted/20 h-[calc(100vh-240px)] md:h-full overflow-hidden">
            {/* Styles for responsive positioning */}
            <style dangerouslySetInnerHTML={{
                __html: `
                  @media (min-width: 768px) {
                    [style*="--top-desktop"][style*="--height-desktop"] {
                      top: var(--top-desktop) !important;
                      height: var(--height-desktop) !important;
                    }
                  }
                `}} />

            {/* Time column com design melhorado */}
            <div className="w-20 md:w-24 border-r bg-muted/30 backdrop-blur-sm flex-shrink-0" role="columnheader" aria-label="Horários">
                <div className="h-16 md:h-20 border-b flex items-center justify-center sticky top-0 bg-muted/30 z-10 backdrop-blur-sm shadow-sm" aria-hidden="true">
                    <Clock className="h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 overflow-hidden">
                    {timeSlots.map(time => (
                        <div key={time} className="h-16 md:h-20 border-b border-border/50 p-2 md:p-3 text-sm font-medium text-muted-foreground flex items-center" role="listitem">
                            {time}
                        </div>
                    ))}
                </div>
            </div>

            {/* Day column com hover states */}
            <div className="flex-1 relative bg-background/50 min-w-0">
                <div className="h-16 md:h-20 border-b bg-gradient-to-r from-primary/10 to-primary/5 p-2 md:p-4 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                    <div className="font-semibold text-center flex items-center justify-center gap-2 text-sm md:text-base">
                        <Calendar className="h-3.5 md:h-4 w-3.5 md:w-4" />
                        <span className="hidden sm:inline">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
                        <span className="sm:hidden">{format(currentDate, "EEE, d/M", { locale: ptBR })}</span>
                    </div>
                </div>

                {/* Time slots */}
                <div className="relative">
                    {timeSlots.map(time => {
                        const hour = parseInt(time.split(':')[0]);
                        const isCurrentHour = hour === currentTime.getHours();
                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, currentDate) && dropTarget.time === time;
                        const blocked = isTimeBlocked(time);
                        const blockReason = getBlockReason(time);

                        return (
                            <TooltipProvider key={time}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "calendar-time-slot group",
                                                blocked
                                                    ? "blocked"
                                                    : "",
                                                isCurrentHour && !blocked && "bg-primary/5",
                                                // Enhanced drop target styles
                                                isDropTarget && !blocked && cn(
                                                    "is-drop-target",
                                                    "bg-primary/20 ring-inset ring-2 ring-primary/60 animate-pulse-subtle"
                                                ),
                                                // Show drag hint when dragging
                                                dragState.isDragging && !blocked && !isDropTarget && "bg-primary/5"
                                            )}
                                            onClick={() => !blocked && onTimeSlotClick(currentDate, time)}
                                            onDragOver={(e) => !blocked && handleDragOver(e, currentDate, time)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => !blocked && handleDrop(e, currentDate, time)}
                                        >
                                            {blocked ? (
                                                <span className="absolute inset-0 flex items-center justify-center text-xs text-destructive/70">
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Bloqueado
                                                </span>
                                            ) : (
                                                <span className={cn(
                                                    "absolute inset-0 flex items-center justify-center text-xs text-muted-foreground transition-all duration-200",
                                                    !isDropTarget && "opacity-0 group-hover:opacity-100",
                                                    isDropTarget && "opacity-100 text-primary font-medium"
                                                )}>
                                                    {isDropTarget ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <CalendarIcon className="w-4 h-4" />
                                                            <span>Solte aqui</span>
                                                        </div>
                                                    ) : 'Clique para agendar'}
                                                </span>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    {blocked && blockReason && (
                                        <TooltipContent>
                                            <p>{blockReason}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}

                    {/* Current time indicator */}
                    {isSameDay(currentDate, currentTime) && currentTimePosition >= 0 && currentTimePosition <= 100 && (
                        <div
                            className="absolute left-0 right-0 z-20 pointer-events-none"
                            style={{ top: `${currentTimePosition}%` }}
                        >
                            <div className="flex items-center">
                                <div className="w-24 flex items-center justify-center">
                                    <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse-glow">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {format(currentTime, 'HH:mm')}
                                    </div>
                                </div>
                                <div className="flex-1 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                            </div>
                        </div>
                    )}

                    {/* Appointments overlay - with stacking support */}
                    {(() => {
                        // Agrupar appointments por horário para calcular offset horizontal
                        const appointmentsByTime: Record<string, Appointment[]> = {};
                        dayAppointments.forEach(apt => {
                            // Safety check for time - handle null, undefined, or empty string
                            const time = apt.time && apt.time.trim() ? apt.time : '09:00';
                            if (!appointmentsByTime[time]) {
                                appointmentsByTime[time] = [];
                            }
                            appointmentsByTime[time].push(apt);
                        });

                        return dayAppointments.map(apt => {
                            // Safety check for time - handle null, undefined, or empty string
                            const aptTime = apt.time && apt.time.trim() ? apt.time : '09:00';
                            const [hours, minutes] = aptTime.split(':').map(Number);
                            const slotIndex = timeSlots.findIndex(slot => {
                                const [slotHour, slotMin] = slot.split(':').map(Number);
                                return slotHour === hours && slotMin === minutes;
                            });

                            if (slotIndex === -1) return null;

                            // Calcular offset horizontal para appointments empilhados
                            const sameTimeAppointments = appointmentsByTime[aptTime] || [];
                            const stackIndex = sameTimeAppointments.findIndex(a => a.id === apt.id);
                            const stackCount = sameTimeAppointments.length;

                            // Calcular largura e offset baseado em quantos appointments estão empilhados
                            const widthPercent = stackCount > 1 ? (100 / stackCount) - 2 : 100;
                            const leftOffset = stackCount > 1 ? (stackIndex * (100 / stackCount)) + 1 : 0;

                            // Calcular altura baseada na duração (cada slot = 80px desktop, 64px mobile, cada slot = 30min)
                            const duration = apt.duration || 60;
                            const heightMobile = (duration / 30) * 64;
                            const heightDesktop = (duration / 30) * 80;
                            const topMobile = slotIndex * 64;
                            const topDesktop = slotIndex * 80;
                            const isDraggable = !!onAppointmentReschedule;
                            const isDraggingThis = dragState.isDragging && dragState.appointment?.id === apt.id;

                            // Responsive positioning style
                            const style: React.CSSProperties = {
                                top: `${topMobile}px`,
                                height: `${heightMobile}px`,
                                left: stackCount > 1 ? `${leftOffset}%` : '4px',
                                right: stackCount > 1 ? 'auto' : '4px',
                                width: stackCount > 1 ? `${widthPercent}%` : 'calc(100% - 8px)',
                                zIndex: isDraggingThis ? 5 : (stackCount > 1 ? 20 : 1),
                                ['--top-desktop' as string]: `${topDesktop}px`,
                                ['--height-desktop' as string]: `${heightDesktop}px`,
                                transform: isDraggingThis ? 'rotate(2deg)' : undefined,
                            };

                            return (
                                <CalendarAppointmentCard
                                    key={apt.id}
                                    appointment={apt}
                                    style={style}
                                    isDraggable={isDraggable}
                                    isDragging={isDraggingThis}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onEditAppointment={onEditAppointment}
                                    onDeleteAppointment={onDeleteAppointment}
                                    onOpenPopover={setOpenPopoverId}
                                    isPopoverOpen={openPopoverId === apt.id}
                                    selectionMode={selectionMode}
                                    isSelected={selectedIds?.has(apt.id)}
                                    onToggleSelection={onToggleSelection}
                                />
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
});

CalendarDayView.displayName = 'CalendarDayView';

export { CalendarDayView };
