import React, { memo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Ban, Calendar, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { DropTargetPreviewCard } from './DropTargetPreviewCard';
import { useCardSize } from '@/hooks/useCardSize';
import { calculateAppointmentCardHeight, calculateSlotHeightFromCardSize } from '@/lib/calendar/cardHeightCalculator';
import { getOverlapStackPosition, DEFAULT_APPOINTMENT_DURATION_MINUTES } from '@/lib/calendar';
import {
  calculateCardWidthPercent,
  calculateCardOffsetPercent,
  shouldShowText,
  MAX_CARDS_WITHOUT_BADGE
} from '@/lib/calendar/dragPreview';

const parseAppointmentDate = (date: string | Date | null | undefined): Date | null => {
    if (!date) return null;
    return typeof date === 'string' ? parseISO(date) : date;
};

const normalizeTime = (time: string | null | undefined): string => {
    if (!time || !time.trim()) return '00:00';
    return time.substring(0, 5);
};

interface CalendarDayViewProps {
    currentDate: Date;
    currentTime: Date;
    currentTimePosition: number;
    // appointments, // We will use getAppointmentsForDate instead for consistency
    getAppointmentsForDate: (date: Date) => Appointment[];
    savingAppointmentId: string | null;

    timeSlots: string[];
    isDayClosed: boolean;
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    // Drag and drop
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    targetAppointments?: Appointment[];
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
    savingAppointmentId,
    timeSlots,
    isDayClosed,
    onTimeSlotClick,
    onEditAppointment,
    onDeleteAppointment,
    onAppointmentReschedule,
    dragState,
    dropTarget,
    targetAppointments = [],
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
    // Get card size configuration from user preferences
    const { cardSize, heightScale } = useCardSize();
    const slotHeight = calculateSlotHeightFromCardSize(cardSize, heightScale);
    const slotHeightMobile = Math.round(slotHeight * 0.96);

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

    // Calculate total grid height for proper scroll container
    const totalGridHeight = timeSlots.length * slotHeightMobile;

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-background to-muted/20">
            {/* Styles for responsive positioning and custom scrollbar */}
            <style dangerouslySetInnerHTML={{
                __html: `
                  @media (min-width: 768px) {
                    [style*="--top-desktop"][style*="--height-desktop"] {
                      top: var(--top-desktop) !important;
                      height: var(--height-desktop) !important;
                    }
                  }
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--border) / 0.5);
                    border-radius: 3px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--border) / 0.8);
                  }
                  .scroll-indicator {
                    position: absolute;
                    left: 0;
                    right: 0;
                    height: 24px;
                    pointer-events: none;
                    z-index: 50;
                    transition: opacity 300ms ease;
                  }
                  .scroll-indicator-top {
                    top: 0;
                    background: linear-gradient(to bottom, hsl(var(--background) / 0.95), transparent);
                  }
                  .scroll-indicator-bottom {
                    bottom: 0;
                    background: linear-gradient(to top, hsl(var(--background) / 0.95), transparent);
                  }
                `}} />

            {/* Scrollable content area with indicators */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Top scroll indicator */}
                <div id="scroll-indicator-top" className="scroll-indicator scroll-indicator-top opacity-0" aria-hidden="true" />

                {/* Main scroll container */}
                <div
                    id="day-view-scroll-container"
                    className="flex flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
                    onScroll={(e) => {
                        const target = e.currentTarget;
                        const topIndicator = document.getElementById('scroll-indicator-top');
                        const bottomIndicator = document.getElementById('scroll-indicator-bottom');
                        if (topIndicator && bottomIndicator) {
                            topIndicator.style.opacity = target.scrollTop > 10 ? '1' : '0';
                            const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 10;
                            bottomIndicator.style.opacity = isNearBottom ? '0' : '1';
                        }
                    }}
                >
                    {/* Time column com design melhorado */}
                    <div className="w-16 md:w-24 border-r bg-muted/30 backdrop-blur-sm flex-shrink-0 sticky left-0 z-20" role="columnheader" aria-label="Horários">
                        <div className="h-14 md:h-20 border-b flex items-center justify-center sticky top-0 bg-muted/30 z-30 backdrop-blur-sm shadow-sm" aria-hidden="true">
                            <Clock className="h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {timeSlots.map((time, slotIndex) => (
                                <div
                                    key={time}
                                    className="border-b border-border/50 p-1 md:p-3 text-[11px] md:text-sm font-medium text-muted-foreground flex items-center justify-center md:justify-start"
                                    role="listitem"
                                    style={{ height: `${slotHeightMobile}px`, minHeight: `${slotHeightMobile}px` }}
                                >
                                    {time}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Day column com hover states */}
                    <div className="flex-1 relative bg-background/50 min-w-0">
                        <div className="h-16 md:h-20 border-b bg-gradient-to-r from-primary/10 to-primary/5 p-2 md:p-4 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
                            <div className="font-semibold text-center flex items-center justify-center gap-2 text-sm md:text-base">
                                <Calendar className="h-3.5 md:h-4 w-3.5 md:w-4" />
                                <span className="hidden sm:inline">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
                                <span className="sm:hidden">{format(currentDate, "EEE, d/M", { locale: ptBR })}</span>
                            </div>
                        </div>

                        {/* Time slots */}
                        <div className="relative" role="grid" data-calendar-drop-zone>
                            {timeSlots.map((time, slotIndex) => {
                        const hour = parseInt(time.split(':')[0]);
                        const isCurrentHour = hour === currentTime.getHours();
                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, currentDate) && dropTarget.time === time;
                        const blocked = isTimeBlocked(time);
                        const blockReason = getBlockReason(time);

                        // Calcular preview cards para o drop target
                        const showPreview = isDropTarget && !blocked && dragState.appointment;
                        const previewCards = showPreview ? [...targetAppointments, dragState.appointment!] : [];
                        const totalCards = previewCards.length;

                        // Descrição acessível para screen readers
                        const ariaLabel = blocked
                            ? `Horário ${time} bloqueado`
                            : showPreview
                                ? `Horário ${time}, ${totalCards} paciente${totalCards !== 1 ? 's' : ''}. Solte para reagendar.`
                                : `Horário ${time} disponível para agendamento`;

                        return (
                            <TooltipProvider key={time}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            role="gridcell"
                                            aria-label={ariaLabel}
                                            aria-dropeffect={!blocked ? 'move' : 'none'}
                                            className={cn(
                                                "calendar-time-slot group relative",
                                                "transition-[background-color,box-shadow] duration-200 ease-out",
                                                blocked && "blocked bg-red-50/60 dark:bg-red-950/30 ring-2 ring-inset ring-red-400/30 cursor-not-allowed",
                                                isCurrentHour && !blocked && "bg-primary/5",
                                                isDropTarget && !blocked && cn(
                                                    "is-drop-target",
                                                    "bg-primary/10 dark:bg-primary/20 ring-2 ring-inset ring-primary/40 dark:ring-primary/50 shadow-inner"
                                                ),
                                                dragState.isDragging && !blocked && !isDropTarget && "bg-primary/5",
                                                showPreview && "z-40"
                                            )}
                                            style={{ height: `${slotHeightMobile}px`, minHeight: `${slotHeightMobile}px` }}
                                            onClick={() => !blocked && onTimeSlotClick(currentDate, time)}
                                            onDragOver={(e) => !blocked && handleDragOver(e, currentDate, time)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => !blocked && handleDrop(e, currentDate, time)}
                                        >
                                            {blocked ? (
                                                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-destructive/80 dark:text-destructive font-medium" aria-hidden="true">
                                                    <Ban className="h-4 w-4 shrink-0" />
                                                    <span className="text-[10px] uppercase tracking-wide">Bloqueado</span>
                                                </span>
                                            ) : showPreview ? (
                                                // Preview dinâmica mostrando como os cards serão organizados
                                                <div className="absolute inset-0 flex items-center px-1 gap-1 pointer-events-none" aria-hidden="true">
                                                    {previewCards.map((apt, index) => {
                                                        const cardWidthPercent = calculateCardWidthPercent(totalCards);
                                                        const leftOffset = calculateCardOffsetPercent(index, totalCards);
                                                        const isDraggedCard = apt.id === dragState.appointment?.id;
                                                        const showText = shouldShowText(cardWidthPercent, totalCards);

                                                        return (
                                                            <DropTargetPreviewCard
                                                                key={apt.id}
                                                                appointment={apt}
                                                                isDraggedCard={!!isDraggedCard}
                                                                cardWidthPercent={cardWidthPercent}
                                                                leftOffset={leftOffset}
                                                                showText={showText}
                                                                variant="day"
                                                            />
                                                        );
                                                    })}

                                                    {/* Indicador de quantidade quando há muitos cards */}
                                                    {totalCards > MAX_CARDS_WITHOUT_BADGE && (
                                                        <div className="absolute bottom-1 right-1 bg-primary/80 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                            {totalCards}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={cn(
                                                    "absolute inset-0 flex items-center justify-center text-xs transition-opacity duration-200",
                                                    !isDropTarget && "opacity-0 group-hover:opacity-100 text-muted-foreground",
                                                    isDropTarget && "opacity-100 text-primary font-medium"
                                                )}>
                                                    {isDropTarget ? (
                                                        <span className="flex flex-col items-center gap-1">
                                                            <CalendarIcon className="w-5 h-5 text-primary/80" />
                                                            <span>Solte aqui</span>
                                                        </span>
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

                    {/* Appointments overlay - with stacking support for overlapping appointments (by time range) */}
                    {(() => {
                        return dayAppointments.map(apt => {
                            // Safety check for time - handle null, undefined, or empty string
                            const aptTime = apt.time && apt.time.trim() ? apt.time : '09:00';
                            const [hours, minutes] = aptTime.split(':').map(Number);
                            const slotIndex = timeSlots.findIndex(slot => {
                                const [slotHour, slotMin] = slot.split(':').map(Number);
                                return slotHour === hours && slotMin === minutes;
                            });

                            if (slotIndex === -1) return null;

                            // Check if this appointment's time slot is blocked
                            const isTimeSlotBlocked = isTimeBlocked(aptTime);
                            const isDropTarget = dropTarget && isSameDay(dropTarget.date, currentDate) && dropTarget.time === aptTime;

                            // Layout lateral: appointments que se sobrepõem no tempo dividem a largura (ex.: 08:30 e 09:00)
                            let { index: stackIndex, count: stackCount } = getOverlapStackPosition(dayAppointments, apt);
                            const hasOverlap = stackCount > 1;

                            // Durante o drag sobre este slot de destino, redimensionar os cards como se o arrastado já estivesse lá
                            if (isDropTarget && dragState.isDragging && dragState.appointment && apt.id !== dragState.appointment.id) {
                                const futureDayAppointments = [...dayAppointments, dragState.appointment];
                                const future = getOverlapStackPosition(futureDayAppointments, apt);
                                stackCount = future.count;
                                stackIndex = future.index;
                            }

                            // Slot de origem: redimensionar os demais cards como se o arrastado já tivesse saído
                            const draggedDate = parseAppointmentDate(dragState.appointment?.date);
                            const draggedTime = dragState.appointment?.time ? normalizeTime(dragState.appointment.time) : null;
                            const isInOriginSlot = dragState.isDragging && draggedDate && draggedTime && isSameDay(currentDate, draggedDate);
                            if (isInOriginSlot && dragState.appointment && apt.id !== dragState.appointment.id) {
                                const originDayAppointments = dayAppointments.filter(a => a.id !== dragState.appointment!.id);
                                const origin = getOverlapStackPosition(originDayAppointments, apt);
                                stackCount = origin.count;
                                stackIndex = origin.index;
                            }

                            const widthPercent = hasOverlap ? (100 / stackCount) - 2 : 100;
                            const leftOffset = hasOverlap ? (stackIndex * (100 / stackCount)) + 1 : 0;

                            const duration = apt.duration ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;

                            // Duration-based card height calculation
                            const heightMobile = calculateAppointmentCardHeight(cardSize, duration, heightScale);
                            const heightDesktop = heightMobile; // Same content, same height
                            const topMobile = slotIndex * slotHeightMobile;
                            const topDesktop = slotIndex * slotHeight;
                            const isDraggable = !!onAppointmentReschedule;
                            const isDraggingThis = dragState.isDragging && dragState.appointment?.id === apt.id;

                            // Responsive positioning style
                            const style: React.CSSProperties = {
                                top: `${topMobile}px`,
                                height: `${heightMobile}px`,
                                left: hasOverlap ? `${leftOffset}%` : '4px',
                                right: hasOverlap ? 'auto' : '4px',
                                width: hasOverlap ? `${widthPercent}%` : 'calc(100% - 8px)',
                                zIndex: isDraggingThis ? 5 : (isDropTarget ? 25 : (hasOverlap ? 20 : 1)),
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
                                    isSaving={apt.id === savingAppointmentId}
                                    isDropTarget={!!isDropTarget}
                                    hideGhostWhenSiblings={isDraggingThis && hasOverlap}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => {
                                        // Allow dropping on existing appointments to add multiple at same time
                                        if (!isDraggingThis && !isTimeSlotBlocked) {
                                            handleDragOver(e, currentDate, aptTime);
                                        }
                                    }}
                                    onDrop={(e) => {
                                        // Allow dropping on existing appointments to add multiple at same time
                                        if (!isDraggingThis && !isTimeSlotBlocked) {
                                            handleDrop(e, currentDate, aptTime);
                                        }
                                    }}
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
                {/* Bottom scroll indicator */}
                <div id="scroll-indicator-bottom" className="scroll-indicator scroll-indicator-bottom opacity-0" aria-hidden="true" />
            </div>
        </div>
    );
});

CalendarDayView.displayName = 'CalendarDayView';

export { CalendarDayView };
