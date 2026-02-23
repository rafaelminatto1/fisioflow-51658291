import React, { memo, useState, forwardRef } from 'react';
import { Appointment } from '@/types/appointment';
import { CARD_SIZE_CONFIGS, normalizeStatus } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { MoreVertical, CheckCircle2 } from 'lucide-react';
import { AppointmentQuickView } from './AppointmentQuickView';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTouch } from '@/hooks/use-touch';
import { useCardSize } from '@/hooks/useCardSize';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { useReducedMotion } from '@/lib/accessibility/a11y-utils';
import { getOptimalTextColor } from '@/utils/colorContrast';
import { normalizeTime, calculateEndTime } from './shared/utils';
import { AppointmentCard } from '@fisioflow/ui';

interface CalendarAppointmentCardProps {
    appointment: Appointment;
    style: React.CSSProperties;
    isDraggable: boolean;
    isDragging: boolean;
    isSaving: boolean;
    onDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    onDragEnd: () => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    onOpenPopover: (id: string | null) => void;
    isPopoverOpen: boolean;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    isDropTarget?: boolean;
    hideGhostWhenSiblings?: boolean;
    selectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
    /** When true, drag starts only from the grip handle (reduces accidental drag when clicking to open) */
    dragHandleOnly?: boolean;
    /** Compact visual density for tight weekly grid layouts */
    density?: 'normal' | 'compact';
}

const getStatusStyles = (status: string) => {
    const normalized = normalizeStatus(status);
    const styles: Record<string, { className: string; accent: string }> = {
        confirmado: {
            className: 'calendar-card-confirmado',
            accent: 'bg-emerald-600',
        },
        agendado: {
            className: 'calendar-card-agendado',
            accent: 'bg-sky-400',
        },
        em_andamento: {
            className: 'calendar-card-em_andamento',
            accent: 'bg-amber-600',
        },
        cancelado: {
            className: 'calendar-card-cancelado',
            accent: 'bg-red-600',
        },
        concluido: {
            className: 'calendar-card-concluido',
            accent: 'bg-slate-600',
        },
        falta: {
            className: 'calendar-card-cancelado',
            accent: 'bg-red-700',
        },
        avaliacao: {
            className: 'calendar-card-avaliacao',
            accent: 'bg-purple-600',
        },
        default: {
            className: 'calendar-card-agendado',
            accent: 'bg-slate-600',
        }
    };
    return styles[normalized] || styles.default;
};

const OVERBOOK_MARKER = '[EXCEDENTE]';

const overbookStyles = {
    className: 'calendar-card-cancelado ring-2 ring-red-600 ring-offset-2',
    accent: 'bg-red-700',
};

const CalendarAppointmentCardBase = forwardRef<HTMLDivElement, CalendarAppointmentCardProps>(({
    appointment,
    style,
    isDraggable,
    isDragging,
    isSaving,
    onDragStart,
    onDragEnd,
    onEditAppointment,
    onDeleteAppointment,
    onOpenPopover,
    isPopoverOpen,
    onDragOver,
    onDrop,
    isDropTarget = false,
    hideGhostWhenSiblings = false,
    selectionMode = false,
    isSelected = false,
    onToggleSelection,
    dragHandleOnly = false,
    density = 'normal'
}, ref) => {
    const isMobile = useIsMobile();
    const isTouch = useIsTouch();
    const reducedMotion = useReducedMotion();
    const [isHovered, setIsHovered] = useState(false);

    const { cardSize } = useCardSize();
    const { getStatusConfig } = useStatusConfig();
    const isCompact = density === 'compact';

    const isOverbooked = Boolean(appointment.isOverbooked || appointment.notes?.includes(OVERBOOK_MARKER));
    const normalizedStatus = normalizeStatus(appointment.status || 'agendado');
    const statusStyles = isOverbooked ? overbookStyles : getStatusStyles(normalizedStatus);
    const sharedStatusConfig = getStatusConfig(normalizedStatus);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    const draggable = isDraggable && !selectionMode && !isTouch;
    const rootDraggable = draggable;

    const handleClick = (e: React.MouseEvent) => {
        if (selectionMode && onToggleSelection) {
            e.stopPropagation();
            onToggleSelection(appointment.id);
            return;
        }
        if (isDragging) return;
        onOpenPopover(appointment.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (selectionMode && onToggleSelection) {
                onToggleSelection(appointment.id);
            } else {
                onOpenPopover(appointment.id);
            }
        }
    };

    const dragDuration = reducedMotion ? 0 : 0.15;
    const duration = appointment.duration || 60;

    const cardContent = (
        <AppointmentCard
            ref={ref}
            patientName={appointment.patientName}
            time={normalizeTime(appointment.time)}
            endTime={calculateEndTime(normalizeTime(appointment.time), duration)}
            type={appointment.type}
            status={normalizedStatus}
            isDragging={isDragging}
            isSaving={isSaving}
            isDropTarget={isDropTarget}
            isSelected={isSelected}
            compact={isCompact}
            statusConfig={{
                color: undefined, // Using classNames instead
                icon: sharedStatusConfig.icon
            }}
            // Animation props passed to MotionCard
            layout={!reducedMotion}
            layoutId={isSaving ? `${appointment.id}-saving` : appointment.id}
            transition={{
                layout: reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 700, damping: 42 },
                opacity: { duration: reducedMotion ? 0 : 0.15 },
                scale: { duration: dragDuration },
                boxShadow: { duration: 0.15 }
            }}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 2 }}
            animate={{
                opacity: isDragging && hideGhostWhenSiblings ? 0 : (isDragging ? 0.2 : 1),
                scale: reducedMotion ? 1 : (isDragging ? 0.98 : 1),
                y: 0,
                boxShadow: isDragging || isHovered ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)" : "0 1px 2px 0 rgba(0, 0, 0, 0.02)"
            }}
            whileTap={reducedMotion ? undefined : {
                scale: isTouch ? 0.97 : 0.99,
                transition: { duration: 0.1 }
            }}
            // Drag props
            draggable={rootDraggable}
            onDragStart={(e: React.DragEvent) => {
                if (rootDraggable && e && 'dataTransfer' in e) {
                    onOpenPopover(null);
                    onDragStart(e, appointment);
                }
            }}
            onDragEnd={onDragEnd}
            onDragOver={(e: React.DragEvent) => {
                if (onDragOver && !selectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    // @ts-ignore
                    e.dataTransfer.dropEffect = 'move';
                    onDragOver(e);
                }
            }}
            onDrop={(e: React.DragEvent) => {
                if (onDrop && !selectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    onDrop(e);
                }
            }}
            // Event handlers
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            // Classes and Styles
            className={cn(
                "absolute", // Positioning needed for calendar grid
                statusStyles.className,
                draggable && "cursor-grab active:cursor-grabbing"
            )}
            style={{
                ...style,
                pointerEvents: isDragging && hideGhostWhenSiblings && !dragHandleOnly ? 'none' : undefined,
                borderRadius: '12px'
            }}
            tabIndex={0}
            role="button"
            aria-label={`${appointment.patientName} - ${normalizeTime(appointment.time)} - ${appointment.status}`}
        >
            {/* Hover Actions - Injected as children */}
            {!isMobile && isHovered && !isDragging && !selectionMode && (
                <div className="absolute top-1 right-1 flex items-center gap-1 z-50">
                    <button
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment?.(appointment);
                        }}
                    >
                        <MoreVertical className="w-3.5 h-3.5 opacity-60" />
                    </button>
                </div>
            )}
        </AppointmentCard>
    );

    if (selectionMode) return cardContent;

    return (
        <AppointmentQuickView
            appointment={appointment}
            open={isPopoverOpen}
            onOpenChange={(open) => {
                if (isDragging && open) return;
                onOpenPopover(open ? appointment.id : null);
            }}
            onEdit={onEditAppointment ? () => onEditAppointment(appointment) : undefined}
            onDelete={onDeleteAppointment ? () => onDeleteAppointment(appointment) : undefined}
        >
            {cardContent}
        </AppointmentQuickView>
    );
});

function appointmentCardAreEqual(prev: CalendarAppointmentCardProps, next: CalendarAppointmentCardProps) {
    // 1. Primitive/Simple booleans
    if (
        prev.isDragging !== next.isDragging ||
        prev.isDraggable !== next.isDraggable ||
        prev.isSaving !== next.isSaving ||
        prev.isDropTarget !== next.isDropTarget ||
        prev.hideGhostWhenSiblings !== next.hideGhostWhenSiblings ||
        prev.selectionMode !== next.selectionMode ||
        prev.isSelected !== next.isSelected ||
        prev.isPopoverOpen !== next.isPopoverOpen ||
        prev.dragHandleOnly !== next.dragHandleOnly ||
        prev.density !== next.density
    ) {
        return false;
    }

    // 2. Appointment Data (Check visual fields)
    if (
        prev.appointment.id !== next.appointment.id ||
        prev.appointment.status !== next.appointment.status ||
        prev.appointment.time !== next.appointment.time ||
        prev.appointment.patientName !== next.appointment.patientName ||
        prev.appointment.type !== next.appointment.type ||
        prev.appointment.duration !== next.appointment.duration ||
        prev.appointment.date !== next.appointment.date
    ) {
        return false;
    }

    // 3. Style (Shallow comparison)
    const prevStyle = prev.style;
    const nextStyle = next.style;

    if (
        prevStyle.height !== nextStyle.height ||
        prevStyle.width !== nextStyle.width ||
        prevStyle.top !== nextStyle.top ||
        prevStyle.left !== nextStyle.left ||
        prevStyle.gridColumn !== nextStyle.gridColumn ||
        prevStyle.gridRow !== nextStyle.gridRow ||
        prevStyle.zIndex !== nextStyle.zIndex
    ) {
        return false;
    }

    return true;
}

export const CalendarAppointmentCard = memo(CalendarAppointmentCardBase, appointmentCardAreEqual);
CalendarAppointmentCard.displayName = 'CalendarAppointmentCard';
