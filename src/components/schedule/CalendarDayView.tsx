import React, { memo } from 'react';
import { format, isSameDay } from 'date-fns';
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
import { calculateCardWidthPercent, calculateCardOffsetPercent, shouldShowText, MAX_CARDS_WITHOUT_BADGE } from '@/lib/calendar/dragPreview';
import { VirtualizedCalendarGrid } from './virtualized/VirtualizedCalendarGrid';

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

    // Calculate current time position in pixels for virtualization
    const currentTimePositionPx = React.useMemo(() => {
        if (!isSameDay(currentDate, currentTime)) return null;
        const [startH] = (timeSlots[0] || '07:00').split(':').map(Number);
        const [endH] = (timeSlots[timeSlots.length - 1] || '21:00').split(':').map(Number);
        
        const nowH = currentTime.getHours();
        const nowM = currentTime.getMinutes();
        
        if (nowH < startH || nowH > endH) return null;
        
        const minutesFromStart = (nowH - startH) * 60 + nowM;
        // Assuming 30 min slots for the calculation (matches slotHeightMobile)
        return (minutesFromStart / 30) * slotHeightMobile;
    }, [currentDate, currentTime, timeSlots, slotHeightMobile]);

    const [containerHeight, setContainerHeight] = React.useState<number>(600);
    React.useLayoutEffect(() => {
        const updateHeight = () => {
            const el = document.getElementById('day-view-scroll-container');
            if (el) {
                setContainerHeight(el.clientHeight);
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const renderSlot = React.useCallback((time: string, rowIndex: number) => {
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

        const appointmentsStartingInThisSlot = appointmentsByTime.get(time) || [];

        return (
            <div className="flex w-full" style={{ height: slotHeightMobile }}>
                {/* Time column part */}
                <div
                    className="w-16 md:w-24 border-r bg-muted/30 backdrop-blur-sm flex-shrink-0 border-b border-border/50 p-1 md:p-3 text-[11px] md:text-sm font-medium text-muted-foreground flex items-center justify-center md:justify-start"
                    role="listitem"
                >
                    {time}
                </div>

                {/* Day column part */}
                <div className="flex-1 relative border-b border-border/50">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    role="gridcell"
                                    aria-label={ariaLabel}
                                    aria-dropeffect={!blocked ? 'move' : 'none'}
                                    className={cn(
                                        "calendar-time-slot group h-full w-full relative",
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

                    {/* Appointments starting in this slot */}
                    {appointmentsStartingInThisSlot.map(apt => {
                        const aptTime = apt.time && apt.time.trim() ? apt.time : '09:00';
                        const [hours, minutes] = aptTime.split(':').map(Number);
                        const aptMinutesTotal = hours * 60 + minutes;

                        const [slotHour, slotMin] = time.split(':').map(Number);
                        const slotMinutesTotal = slotHour * 60 + slotMin;
                        const offsetMinutes = aptMinutesTotal - slotMinutesTotal;

                        const { index: stackIndex, count: stackCount } = getOverlapStackPosition(dayAppointments, apt);
                        const hasOverlap = stackCount > 1;

                        const widthPercent = hasOverlap ? (96 / stackCount) : 94;
                        const leftOffset = hasOverlap ? (stackIndex * (96 / stackCount)) + 2 : 3;

                        const duration = apt.duration ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
                        const heightMobile = calculateAppointmentCardHeight(cardSize, duration, heightScale);
                        const offsetPxMobile = (offsetMinutes / 30) * slotHeightMobile;

                        const isDraggable = !!onAppointmentReschedule;
                        const isDraggingThis = dragState.isDragging && dragState.appointment?.id === apt.id;

                        const style: React.CSSProperties = {
                            position: 'absolute',
                            top: `${offsetPxMobile}px`,
                            height: `${heightMobile}px`,
                            left: `${leftOffset}%`,
                            width: `${widthPercent}%`,
                            zIndex: isDraggingThis ? 5 : (isDropTarget ? 25 : (hasOverlap ? 20 : 1)),
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
                                    if (!isDraggingThis && !blocked) {
                                        handleDragOver(e, currentDate, aptTime);
                                    }
                                }}
                                onDrop={(e) => {
                                    if (!isDraggingThis && !blocked) {
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
                    })}
                </div>
            </div>
        );
    }, [
        currentTime,
        currentDate,
        dropTarget,
        isTimeBlocked,
        getBlockReason,
        dragState,
        targetAppointments,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        onTimeSlotClick,
        appointmentsByTime,
        slotHeightMobile,
        dayAppointments,
        cardSize,
        heightScale,
        onAppointmentReschedule,
        savingAppointmentId,
        handleDragStart,
        handleDragEnd,
        onEditAppointment,
        onDeleteAppointment,
        setOpenPopoverId,
        openPopoverId,
        selectionMode,
        selectedIds,
        onToggleSelection
    ]);

    // Logic inconsistency fix: usage of helper passed from parent
    const dayAppointments = getAppointmentsForDate(currentDate);

    // Group appointments by time for virtualization
    const appointmentsByTime = React.useMemo(() => {
        const map = new Map<string, Appointment[]>();
        dayAppointments.forEach(apt => {
            const time = apt.time && apt.time.trim() ? apt.time.substring(0, 5) : '09:00';
            if (!map.has(time)) map.set(time, []);
            map.get(time)!.push(apt);
        });
        return map;
    }, [dayAppointments]);

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
    const _totalGridHeight = timeSlots.length * slotHeightMobile;

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-background to-muted/20">
            {/* Styles for responsive positioning and custom scrollbar */}
            <style dangerouslySetInnerHTML={{
                __html: `
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
                `}} />

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden relative" id="day-view-scroll-container">
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Sticky Day Header */}
                    <div className="h-16 md:h-20 border-b bg-gradient-to-r from-primary/10 to-primary/5 p-2 md:p-4 backdrop-blur-sm z-30 shadow-sm flex-shrink-0">
                        <div className="font-semibold text-center flex items-center justify-center gap-2 text-sm md:text-base">
                            <Calendar className="h-3.5 md:h-4 w-3.5 md:w-4" />
                            <span className="hidden sm:inline">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
                            <span className="sm:hidden">{format(currentDate, "EEE, d/M", { locale: ptBR })}</span>
                        </div>
                    </div>

                    {/* Virtualized Grid area */}
                    <div className="flex-1 relative" role="grid" data-calendar-drop-zone>
                        <VirtualizedCalendarGrid
                            timeSlots={timeSlots}
                            slotHeight={slotHeightMobile}
                            containerHeight={containerHeight}
                            renderSlot={renderSlot}
                            className="custom-scrollbar"
                            overscan={5}
                        >
                            {/* Current time indicator - Scrolling inside the grid */}
                            {currentTimePositionPx !== null && (
                                <div
                                    className="absolute left-0 right-0 z-50 pointer-events-none"
                                    style={{ top: `${currentTimePositionPx}px` }}
                                >
                                    <div className="flex items-center">
                                        <div className="w-16 md:w-24 flex items-center justify-center">
                                            <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse-glow">
                                                <Clock className="h-3 w-3 inline mr-1" />
                                                {format(currentTime, 'HH:mm')}
                                            </div>
                                        </div>
                                        <div className="flex-1 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                    </div>
                                </div>
                            )}
                        </VirtualizedCalendarGrid>
                    </div>
                </div>
            </div>
        </div>
    );
});

CalendarDayView.displayName = 'CalendarDayView';

export { CalendarDayView };
