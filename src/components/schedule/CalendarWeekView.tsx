
// =====================================================================
// TYPES
// =====================================================================

import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CalendarAppointmentCard } from './CalendarAppointmentCard';
import { TimeSlotCell } from './TimeSlotCell';
import { useCardSize } from '@/hooks/useCardSize';
import { calculateAppointmentCardHeight, calculateSlotHeightFromCardSize } from '@/lib/calendar/cardHeightCalculator';
import { getOverlapStackPosition } from '@/lib/calendar';

interface CalendarWeekViewProps {
    currentDate: Date;
    appointments: Appointment[];
    savingAppointmentId: string | null;
    timeSlots: string[];
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    targetAppointments?: Appointment[];
    handleDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
    checkTimeBlocked: (date: Date, time: string) => { blocked: boolean; reason?: string };
    isDayClosedForDate: (date: Date) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
    // Selection props
    selectionMode?: boolean;
    selectedIds?: Set<string>;
    onToggleSelection?: (id: string) => void;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;
const SLOT_DURATION_MINUTES = 30;

/** Margem à esquerda do primeiro card (em px). */
const _OVERLAP_LAYOUT_MARGIN_PX = 2;

/** Espaçamento entre cards sobrepostos (em px). */
const _OVERLAP_LAYOUT_GAP_PX = 2;

/** Espaço reservado à direita para área clicável (em px). */
const _CLICKABLE_AREA_WIDTH_PX = 16;

/**
 * Calcula a largura e posição de cards sobrepostos na agenda.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Card 1 │▓│ Card 2 │▓│ Card 3 │▓│ Click │
 * └─────────────────────────────────────────────────────────────┘
 *   ↑       ↑   ↑       ↑   ↑       ↑   ↑   ↑
 *   margin  gap      gap      gap   gap  clickable_area
 *
 * @param count - Número de cards sobrepostos
 * @param index - Índice do card atual (0-based)
 * @returns Objeto com width e left para CSS (usando percentuais)
 */
const calculateOverlapStyle = (count: number, index: number) => {
    // Espaço total disponível para cards (exclui área clicável à direita)
    // Usamos percentuais para que funcione corretamente dentro da célula da grid
    const availableWidthPercent = 99; // 99% da largura disponível

    // Gap mínimo entre cards (praticamente colados)
    const gapPercent = 0.1; // ~0.1% por gap - mínimo para separação visual
    const totalGapsPercent = Math.max(0, (count - 1) * gapPercent);

    // Margem esquerda mínima
    const marginLeftPercent = 0.1;

    // Largura disponível após margens e gaps
    const usableWidth = availableWidthPercent - marginLeftPercent - totalGapsPercent;

    // Cada card recebe uma fatia igual
    const cardWidthPercent = usableWidth / count;

    // Posição do card: margem + (index * (largura + gap))
    const leftPercent = marginLeftPercent + (index * (cardWidthPercent + gapPercent));

    return {
        width: `${cardWidthPercent}%`,
        left: `${leftPercent}%`
    };
};

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

const normalizeTime = (time: string | null | undefined): string => {
    if (!time || !time.trim()) return '00:00';
    return time.substring(0, 5);
};

const parseAppointmentDate = (date: string | Date | null | undefined): Date | null => {
    if (!date) return null;
    return typeof date === 'string' ? parseISO(date) : date;
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export const CalendarWeekView = memo(({
    currentDate,
    appointments,
    savingAppointmentId,
    timeSlots,
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
    checkTimeBlocked,
    isDayClosedForDate,
    openPopoverId,
    setOpenPopoverId,
    selectionMode = false,
    selectedIds = new Set(),
    onToggleSelection
}: CalendarWeekViewProps) => {
    // Get card size configuration from user preferences
    const { cardSize, heightScale } = useCardSize();
    const slotHeight = calculateSlotHeightFromCardSize(cardSize, heightScale);

    const weekDays = useMemo(() => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
    }, [currentDate]);

    const derivedStartHour = useMemo(() => {
        if (!timeSlots.length) return DEFAULT_START_HOUR;
        const [h] = timeSlots[0].split(':').map(Number);
        return Number.isFinite(h) ? h : DEFAULT_START_HOUR;
    }, [timeSlots]);

    const derivedEndHour = useMemo(() => {
        if (!timeSlots.length) return DEFAULT_END_HOUR;
        const [h] = timeSlots[timeSlots.length - 1].split(':').map(Number);
        return Number.isFinite(h) ? h + 1 : DEFAULT_END_HOUR;
    }, [timeSlots]);

    // Removed hoveredAppointmentId state to prevent global re-renders
    const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

    // Update current time indicator position
    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            if (currentHour < derivedStartHour || currentHour > derivedEndHour) {
                setCurrentTimePosition(null);
                return;
            }

            const totalMinutesFromStart = (currentHour - derivedStartHour) * 60 + currentMinute;
            const position = (totalMinutesFromStart / SLOT_DURATION_MINUTES) * slotHeight;
            setCurrentTimePosition(position);
        };

        updatePosition();
        const interval = setInterval(updatePosition, 60000);
        return () => clearInterval(interval);
    }, [slotHeight, derivedStartHour, derivedEndHour]);

    // Filter appointments for this week (exclude null/undefined to avoid "reading 'id'" on drag)
    const weekAppointments = useMemo(() => {
        const start = startOfDay(weekDays[0]);
        const end = startOfDay(addDays(weekDays[5], 1)); // End at end of Saturday

        return (appointments || []).filter((apt): apt is Appointment => {
            if (apt == null || typeof (apt as Appointment).id !== 'string') return false;
            const aptDate = parseAppointmentDate(apt.date);
            return !!(aptDate && aptDate >= start && aptDate < end);
        });
    }, [appointments, weekDays]);

    // Agendamentos agrupados por índice do dia (evita filtrar weekAppointments N vezes em getAppointmentStyle)
    const appointmentsByDayIndex = useMemo(() => {
        const map = new Map<number, Appointment[]>();
        weekDays.forEach((day, dayIndex) => {
            const dayApts = weekAppointments.filter((apt) => {
                const d = parseAppointmentDate(apt.date);
                return d && isSameDay(d, day);
            });
            map.set(dayIndex, dayApts);
        });
        return map;
    }, [weekAppointments, weekDays]);

    // Optimize blocked time checks by memoizing the status for all cells
    // This avoids O(N*M) calculations during render
    const blockedStatusCache = useMemo(() => {
        const cache = new Map<string, { blocked: boolean; reason?: string }>();

        weekDays.forEach(day => {
            timeSlots.forEach(time => {
                // Creates a unique key for the day+time combination
                // Using day index is safer than date string avoid timezone issues during lookup
                const dayIndex = weekDays.indexOf(day);
                const uniqueKey = `${dayIndex}-${time}`;
                cache.set(uniqueKey, checkTimeBlocked(day, time));
            });
        });

        return cache;
    }, [weekDays, timeSlots, checkTimeBlocked]);

    // Memoize isDayClosed status
    const dayClosedStatus = useMemo(() => {
        return weekDays.map(day => isDayClosedForDate(day));
    }, [weekDays, isDayClosedForDate]);

    // Calculate position and width for overlapping appointments
    const getAppointmentStyle = useCallback((apt: Appointment) => {
        const aptDate = parseAppointmentDate(apt.date);
        if (!aptDate) return null;

        const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
        if (dayIndex === -1) return null;

        const time = normalizeTime(apt.time);
        const startRowIndex = timeSlots.findIndex(t => t === time);
        if (startRowIndex === -1) return null;

        // Duration-based height calculation
        const duration = apt.duration || 60;
        const heightInPixels = calculateAppointmentCardHeight(cardSize, duration, heightScale);

        // Overlap by time range (same day): lateral layout so 08:30 and 09:00 show side by side
        const dayAppointments = appointmentsByDayIndex.get(dayIndex) ?? [];
        // Keep card sizing stable while dragging; preview handles target feedback.
        const { index, count } = getOverlapStackPosition(dayAppointments, apt);

        // Calcular largura e posição baseado na quantidade de cards sobrepostos
        const { width, left } = calculateOverlapStyle(count, index);

        return {
            gridColumn: `${dayIndex + 2} / span 1`,
            gridRow: `${startRowIndex + 1}`,
            height: `${heightInPixels}px`,
            width,
            left,
            top: '0px',
            zIndex: 10 + index
        };
    }, [weekDays, timeSlots, appointmentsByDayIndex, cardSize, heightScale]);

    const isDraggable = !!onAppointmentReschedule;
    const isDraggingThis = useCallback((aptId: string) =>
        dragState.isDragging && dragState.appointment?.id === aptId, [dragState]
    );

    return (
        <TooltipProvider>
            <div className="flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-slate-100 font-display h-full relative overflow-hidden">
                {/* Wrap everything in a scroll container (both X and Y) */}
                <div className="overflow-auto w-full h-full custom-scrollbar">
                    <div className="w-full">
                        {/* Header Row - Responsivo com scroll horizontal em mobile */}
                        <div className="grid grid-cols-[60px_repeat(6,1fr)] bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm overflow-x-auto -mx-2 px-2">
                            {/* Time icon - Sticky Left */}
                            <div className="h-14 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center sticky left-0 z-50 bg-white dark:bg-slate-950">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                                    <span className="text-[10px] font-bold">GMT-3</span>
                                </div>
                            </div>

                            {/* Days Headers */}
                            {weekDays.map((day, i) => {
                                const isTodayDate = isSameDay(day, new Date());
                                return (
                                    <div key={i} className={cn(
                                        "h-14 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800/50 relative group transition-colors",
                                        isTodayDate ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                                    )}>
                                        {isTodayDate && (
                                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                                        )}
                                        <span className={cn(
                                            "text-[10px] font-medium uppercase tracking-wider mb-0.5",
                                            isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-gray-500"
                                        )}>
                                            {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
                                        </span>
                                        <div className={cn(
                                            "text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                            isTodayDate
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                : "text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                                        )}>
                                            {format(day, 'd')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Scrollable Grid Area */}
                        <div className="relative bg-white dark:bg-slate-950" id="calendar-grid" data-calendar-drop-zone>
                            <div className="grid grid-cols-[60px_repeat(6,1fr)] relative min-h-0" style={{
                                gridTemplateRows: `repeat(${timeSlots.length}, ${slotHeight}px)`
                            }}>

                                {/* Current Time Indicator Line - Spans all days */}
                                {currentTimePosition !== null && (
                                    <div
                                        className="absolute z-20 pointer-events-none flex items-center w-full"
                                        style={{
                                            top: `${currentTimePosition}px`,
                                            left: '60px',
                                            right: 0
                                        }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0"></div>
                                        <div className="h-px bg-red-500 flex-1 shadow-sm"></div>
                                    </div>
                                )}

                                {/* Time Labels Column - Sticky Left */}
                                {timeSlots.map((time, index) => {
                                    const isHour = time.endsWith(':00');
                                    return (
                                        <div
                                            key={`time-${time}`}
                                            className={cn(
                                                "border-r border-slate-100 dark:border-slate-800 text-[11px] font-medium flex justify-end pr-2 pt-2 sticky left-0 z-30 bg-white dark:bg-slate-950",
                                                isHour ? "text-slate-900 dark:text-slate-200 -mt-2.5 translate-y-0" : "text-gray-500 dark:text-slate-600 hidden"
                                            )}
                                            style={{ gridRow: index + 1, gridColumn: 1 }}
                                        >
                                            {isHour ? time : ''}
                                        </div>
                                    );
                                })}

                                {/* Grid Background Cells for Interaction */}
                                {weekDays.map((day, colIndex) => {
                                    // Use memoized closed status
                                    const isClosed = dayClosedStatus[colIndex];

                                    return timeSlots.map((time, rowIndex) => {
                                        // Use memoized blocked status
                                        const key = `${colIndex}-${time}`;
                                        const { blocked } = blockedStatusCache.get(key) || { blocked: false };

                                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;

                                        // targetAppointments do hook já vem filtrado por slot via getAppointmentsForSlot
                                        const slotTargetAppointments = isDropTarget ? targetAppointments : [];

                                        return (
                                            <TimeSlotCell
                                                key={`cell-${colIndex}-${rowIndex}`}
                                                day={day}
                                                time={time}
                                                rowIndex={rowIndex}
                                                colIndex={colIndex}
                                                isClosed={isClosed}
                                                isBlocked={blocked}
                                                isDropTarget={!!isDropTarget}
                                                onTimeSlotClick={onTimeSlotClick}
                                                handleDragOver={handleDragOver}
                                                handleDragLeave={handleDragLeave}
                                                handleDrop={handleDrop}
                                                targetAppointments={slotTargetAppointments}
                                                draggedAppointment={dragState.appointment}
                                            />
                                        );
                                    });
                                })}

                                {/* Appointments Overlay */}
                                {weekAppointments.map(apt => {
                                    const style = getAppointmentStyle(apt);
                                    if (!style) return null;

                                    const aptDate = parseAppointmentDate(apt.date);
                                    if (!aptDate) return null;

                                    const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
                                    if (dayIndex === -1) return null;

                                    const day = weekDays[dayIndex];
                                    const aptTime = normalizeTime(apt.time);

                                    // Use lookup for blocked status
                                    // Note: appointments might have times not in timeSlots list?
                                    // If so, fall back to checkTimeBlocked?
                                    // Since we built cache based on timeSlots, if aptTime is not in list we might miss it.
                                    // But typically appointments align with slots.
                                    // Let's use checkTimeBlocked here as fallback to be safe since it's only for appointments (much fewer than cells)
                                    // or just use cache if we are sure. To match the plan optimization, we should prefer cache if possible.
                                    const key = `${dayIndex}-${aptTime}`;
                                    const cachedBlock = blockedStatusCache.get(key);
                                    const { blocked } = cachedBlock || checkTimeBlocked(day, aptTime);

                                    const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === aptTime;
                                    const dayAppointmentsForGhost = appointmentsByDayIndex.get(dayIndex) ?? [];
                                    const overlapCount = getOverlapStackPosition(dayAppointmentsForGhost, apt).count;
                                    // dragHandleOnly=false significa que o drag pode ser iniciado de qualquer parte do card
                                    // Quando true, drag só pode ser iniciado pelo grip handle
                                    const dragHandleOnly = false;
                                    const hideGhostWhenSiblings = isDraggingThis(apt.id) && overlapCount > 1 && !dragHandleOnly;
                                    // Quando dragHandleOnly é true, NÃO esconder cards irmãos
                                    // O handle (24x24px) é pequeno, então cards vizinhos devem permanecer visíveis
                                    // para que dragOver seja propagado pelo card raiz durante a transição

                                    return (
                                        <CalendarAppointmentCard
                                            key={apt.id}
                                            appointment={apt}
                                            style={style}
                                            isDraggable={isDraggable}
                                            isDragging={isDraggingThis(apt.id)}
                                            isSaving={apt.id === savingAppointmentId}
                                            isDropTarget={!!isDropTarget}
                                            hideGhostWhenSiblings={hideGhostWhenSiblings}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => {
                                                // Allow dropping on existing appointments to add multiple at same time
                                                if (!isDraggingThis(apt.id) && !blocked) {
                                                    handleDragOver(e, day, aptTime);
                                                }
                                            }}
                                            onDrop={(e) => {
                                                // Allow dropping on existing appointments to add multiple at same time
                                                if (!isDraggingThis(apt.id) && !blocked) {
                                                    handleDrop(e, day, aptTime);
                                                }
                                            }}
                                            onEditAppointment={onEditAppointment}
                                            onDeleteAppointment={onDeleteAppointment}
                                            onOpenPopover={setOpenPopoverId}
                                            isPopoverOpen={openPopoverId === apt.id}
                                            selectionMode={selectionMode}
                                            isSelected={selectedIds?.has(apt.id)}
                                            onToggleSelection={onToggleSelection}
                                            dragHandleOnly={dragHandleOnly}
                                        />
                                    );
                                })}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
});

CalendarWeekView.displayName = 'CalendarWeekView';
