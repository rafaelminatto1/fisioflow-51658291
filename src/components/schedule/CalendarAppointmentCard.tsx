import React, { memo, useState, forwardRef } from 'react';
import { Appointment } from '@/types/appointment';
import { CARD_SIZE_CONFIGS, normalizeStatus } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { MoreVertical, CheckCircle2 } from 'lucide-react';
import { AppointmentQuickView } from './AppointmentQuickView';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTouch } from '@/hooks/use-touch';
import { useCardSize } from '@/hooks/useCardSize';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { useReducedMotion } from '@/lib/accessibility/a11y-utils';
import { getOptimalTextColor } from '@/utils/colorContrast';
import { normalizeTime, calculateEndTime } from './shared/utils';

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
    // Healthcare palette: primary #0891B2, secondary #22D3EE, success #059669, bg #ECFEFF, text #164E63
    // Contrast ≥ 4.5:1 for readability (ux-guidelines)
    const styles = {
        confirmado: {
            border: 'border-emerald-500',
            bg: 'bg-emerald-50/95 dark:bg-emerald-500/20',
            hoverBg: 'hover:bg-emerald-100/95 dark:hover:bg-emerald-500/30',
            text: 'text-emerald-900 dark:text-emerald-400',
            subtext: 'text-emerald-800/90 dark:text-emerald-300/90',
            accent: 'bg-emerald-600',
            indicator: 'text-emerald-700'
        },
        agendado: {
            border: 'border-sky-300',
            bg: 'bg-sky-100/95 dark:bg-sky-200/30',
            hoverBg: 'hover:bg-sky-200/95 dark:hover:bg-sky-300/40',
            text: 'text-sky-900 dark:text-sky-300',
            subtext: 'text-sky-800/90 dark:text-sky-400/90',
            accent: 'bg-sky-400',
            indicator: 'text-sky-700'
        },
        em_andamento: {
            border: 'border-amber-500',
            bg: 'bg-amber-50/95 dark:bg-amber-500/20',
            hoverBg: 'hover:bg-amber-100/95 dark:hover:bg-amber-500/30',
            text: 'text-amber-900 dark:text-amber-400',
            subtext: 'text-amber-800/90 dark:text-amber-300/90',
            accent: 'bg-amber-600',
            indicator: 'text-amber-700'
        },
        cancelado: {
            border: 'border-red-500',
            bg: 'bg-red-50/95 dark:bg-red-500/20',
            hoverBg: 'hover:bg-red-100/95 dark:hover:bg-red-500/30',
            text: 'text-red-900 dark:text-red-400',
            subtext: 'text-red-800/90 dark:text-red-300/90',
            accent: 'bg-red-600',
            indicator: 'text-red-700'
        },
        falta: {
            border: 'border-red-500',
            bg: 'bg-red-50/95 dark:bg-red-500/20',
            hoverBg: 'hover:bg-red-100/95 dark:hover:bg-red-500/30',
            text: 'text-red-900 dark:text-red-400',
            subtext: 'text-red-800/90 dark:text-red-300/90',
            accent: 'bg-red-600',
            indicator: 'text-red-700'
        },
        concluido: {
            border: 'border-teal-500',
            bg: 'bg-teal-50/95 dark:bg-teal-500/20',
            hoverBg: 'hover:bg-teal-100/95 dark:hover:bg-teal-500/30',
            text: 'text-teal-900 dark:text-teal-400',
            subtext: 'text-teal-800/90 dark:text-teal-300/90',
            accent: 'bg-teal-600',
            indicator: 'text-teal-700'
        },
        reagendado: {
            border: 'border-lime-500',
            bg: 'bg-lime-50/95 dark:bg-lime-500/20',
            hoverBg: 'hover:bg-lime-100/95 dark:hover:bg-lime-500/30',
            text: 'text-lime-900 dark:text-lime-400',
            subtext: 'text-lime-800/90 dark:text-lime-300/90',
            accent: 'bg-lime-600',
            indicator: 'text-lime-700'
        },
        atrasado: {
            border: 'border-orange-500',
            bg: 'bg-orange-50/95 dark:bg-orange-500/20',
            hoverBg: 'hover:bg-orange-100/95 dark:hover:bg-orange-500/30',
            text: 'text-orange-900 dark:text-orange-400',
            subtext: 'text-orange-800/90 dark:text-orange-300/90',
            accent: 'bg-orange-600',
            indicator: 'text-orange-700'
        },
        aguardando_confirmacao: {
            border: 'border-amber-500',
            bg: 'bg-amber-50/95 dark:bg-amber-500/20',
            hoverBg: 'hover:bg-amber-100/95 dark:hover:bg-amber-500/30',
            text: 'text-amber-900 dark:text-amber-400',
            subtext: 'text-amber-800/90 dark:text-amber-300/90',
            accent: 'bg-amber-600',
            indicator: 'text-amber-700'
        },
        em_espera: {
            border: 'border-blue-500',
            bg: 'bg-blue-50/95 dark:bg-blue-500/20',
            hoverBg: 'hover:bg-blue-100/95 dark:hover:bg-blue-500/30',
            text: 'text-blue-900 dark:text-blue-400',
            subtext: 'text-blue-800/90 dark:text-blue-300/90',
            accent: 'bg-blue-600',
            indicator: 'text-blue-700'
        },
        avaliacao: {
            border: 'border-violet-500',
            bg: 'bg-violet-50/95 dark:bg-violet-500/20',
            hoverBg: 'hover:bg-violet-100/95 dark:hover:bg-violet-500/30',
            text: 'text-violet-900 dark:text-violet-400',
            subtext: 'text-violet-800/90 dark:text-violet-300/90',
            accent: 'bg-violet-600',
            indicator: 'text-violet-700'
        },
        default: {
            border: 'border-slate-500',
            bg: 'bg-slate-50/95 dark:bg-slate-500/20',
            hoverBg: 'hover:bg-slate-100/95 dark:hover:bg-slate-500/30',
            text: 'text-slate-900 dark:text-slate-300',
            subtext: 'text-slate-700/90 dark:text-slate-300/90',
            accent: 'bg-slate-600',
            indicator: 'text-slate-700'
        }
    };
    return styles[normalizeStatus(status) as keyof typeof styles] || styles.default;
};

const OVERBOOK_MARKER = '[EXCEDENTE]';

const overbookStyles = {
    border: 'border-red-600',
    bg: 'bg-red-100/95 dark:bg-red-900/40',
    hoverBg: 'hover:bg-red-200/95 dark:hover:bg-red-900/55',
    text: 'text-red-950 dark:text-red-100',
    subtext: 'text-red-900/90 dark:text-red-200/90',
    accent: 'bg-red-700',
    indicator: 'text-red-800 dark:text-red-200'
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

    const { cardSize, fontPercentage } = useCardSize();
    const {
        getStatusConfig: getCustomStatusConfig,
        hasCustomColors,
        isCustomStatus
    } = useStatusConfig();
    const isCompact = density === 'compact';

    const isOverbooked = Boolean(appointment.isOverbooked || appointment.notes?.includes(OVERBOOK_MARKER));
    const normalizedStatus = normalizeStatus(appointment.status || 'agendado');
    const statusStyles = isOverbooked ? overbookStyles : getStatusStyles(normalizedStatus);

    // Use shared status config for labels and icons
    const sharedStatusConfig = getCustomStatusConfig(normalizedStatus);
    const StatusIcon = sharedStatusConfig.icon || CheckCircle2;

    const useCustomStatusStyle =
        !isOverbooked && (hasCustomColors(normalizedStatus) || isCustomStatus(normalizedStatus));
    const customTextColor = useCustomStatusStyle
        ? getOptimalTextColor(sharedStatusConfig.bgColor || sharedStatusConfig.color)
        : null;
    const customCardStyle = useCustomStatusStyle
        ? { backgroundColor: sharedStatusConfig.bgColor, borderColor: sharedStatusConfig.borderColor }
        : undefined;
    const customTextColorStyle = customTextColor ? { color: customTextColor } : undefined;
    const customSubtextStyle = customTextColor ? { color: customTextColor, opacity: 0.85 } : undefined;
    const customAccentStyle = useCustomStatusStyle
        ? { backgroundColor: sharedStatusConfig.color || sharedStatusConfig.borderColor }
        : undefined;

    // Get card size configuration
    const sizeConfig = CARD_SIZE_CONFIGS[cardSize];

    // Calculate scaled font sizes based on user preference
    const fontScale = fontPercentage / 100; // Convert percentage to multiplier (0.5 to 1.5)
    const scaledTimeFontSize = isCompact
        ? Math.max(7, Math.round(sizeConfig.timeFontSize * fontScale * 0.7))
        : Math.round(sizeConfig.timeFontSize * fontScale * 0.9);
    const scaledNameFontSize = isCompact
        ? Math.max(12, Math.round(sizeConfig.nameFontSize * fontScale * 0.95))
        : Math.max(15, Math.round(sizeConfig.nameFontSize * fontScale * 1.1));
    const scaledTypeFontSize = Math.round(sizeConfig.typeFontSize * fontScale);

    const duration = appointment.duration || 60;
    const isTiny = duration < 30; // Less than 30 min (e.g. 15, 20)
    const useCompactLayout = isCompact && !isTiny;

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
    const cardContent = (
        <motion.div
            ref={ref}
            layout={!reducedMotion}
            layoutId={isSaving ? `${appointment.id}-saving` : appointment.id}
            transition={{
                layout: reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 700, damping: 42 },
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
            draggable={rootDraggable}
            onDragStart={(e) => {
                if (rootDraggable && e && 'dataTransfer' in e) {
                    onOpenPopover(null);
                    onDragStart(e as unknown as React.DragEvent, appointment);
                }
            }}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
                if (onDragOver && !selectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    onDragOver(e);
                }
            }}
            onDrop={(e) => {
                if (onDrop && !selectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    onDrop(e);
                }
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
                "calendar-appointment-card absolute rounded-xl flex flex-col overflow-hidden transition-all duration-200 border",
                "bg-white dark:bg-slate-900",
                "cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                !useCustomStatusStyle && statusStyles.bg,
                !useCustomStatusStyle && statusStyles.border,
                draggable && "cursor-grab active:cursor-grabbing",
                isDragging && "z-50 ring-2 ring-primary/40 shadow-2xl",
                isSaving && "animate-pulse ring-2 ring-amber-400/50 z-30",
                !isDragging && isHovered && !selectionMode && "shadow-lg scale-[1.01] z-10",
                isDropTarget && !isDragging && "ring-2 ring-primary/60 shadow-2xl z-25",
                isSelected && "ring-2 ring-primary shadow-xl z-40"
            )}
            style={{
                ...style,
                ...(customCardStyle || {}),
                pointerEvents: isDragging && hideGhostWhenSiblings && !dragHandleOnly ? 'none' : undefined,
                borderRadius: '12px'
            }}
            role="button"
            tabIndex={0}
            aria-label={`${appointment.patientName} - ${normalizeTime(appointment.time)} - ${appointment.status}`}
        >
            {/* Status Border Strip */}
            <div
                className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl opacity-90",
                    !useCustomStatusStyle && statusStyles.accent
                )}
                style={customAccentStyle}
            />

            <div
                className={cn(
                    "flex flex-col h-full relative",
                    isTiny && "p-1 justify-center items-center"
                )}
                style={isTiny
                    ? undefined
                    : {
                        padding: useCompactLayout ? '6px 8px' : '10px 12px',
                        paddingLeft: '14px' // Extra padding for the border strip
                    }}
            >
                {/* 1. Tiny View (< 30m) */}
                {isTiny ? (
                    <div className="flex items-center gap-1.5 w-full">
                        <span
                            className={cn("text-[10px] font-bold truncate", !useCustomStatusStyle && statusStyles.text)}
                            style={customTextColorStyle}
                        >
                            {appointment.patientName}
                        </span>
                    </div>
                ) : (
                    /* 2. Normal View (>= 30m) */
                    <>
                        <div className="flex items-start justify-between gap-1 w-full mb-1">
                            <span
                                className={cn(
                                    "font-mono font-bold tracking-tight leading-none",
                                    !useCustomStatusStyle && statusStyles.text,
                                    "opacity-80"
                                )}
                                style={{ fontSize: `${scaledTimeFontSize}px`, ...(customTextColorStyle || {}) }}
                            >
                                {normalizeTime(appointment.time)}
                                {!useCompactLayout && ` - ${calculateEndTime(normalizeTime(appointment.time), duration)}`}
                            </span>

                            {/* Status Label Badge */}
                            {!isTiny && (
                                <div className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider",
                                    !useCustomStatusStyle && statusStyles.bg,
                                    !useCustomStatusStyle && "bg-white/40 dark:bg-black/20",
                                    !useCustomStatusStyle && statusStyles.text
                                )}
                                    style={{ ...customTextColorStyle, fontSize: `${scaledTimeFontSize}px` }}>
                                    <StatusIcon className="w-2.5 h-2.5" />
                                    {sharedStatusConfig.label}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col min-w-0 w-full overflow-hidden">
                            <span
                                className={cn(
                                    "block font-black leading-[1.15] tracking-tight line-clamp-2",
                                    !useCustomStatusStyle && statusStyles.text,
                                )}
                                style={{ fontSize: `${scaledNameFontSize}px`, ...(customTextColorStyle || {}) }}
                            >
                                {appointment.patientName}
                            </span>

                            {sizeConfig.showType && !useCompactLayout && (
                                <span
                                    className={cn(
                                        "block truncate mt-1 font-medium opacity-70",
                                        !useCustomStatusStyle && statusStyles.subtext
                                    )}
                                    style={{ fontSize: `${scaledTypeFontSize}px`, ...(customSubtextStyle || {}) }}
                                >
                                    {appointment.type}
                                </span>
                            )}
                        </div>
                    </>
                )}

                {/* Hover Actions */}
                {!isMobile && isHovered && !isDragging && !selectionMode && (
                    <div className="absolute top-1 right-1 flex items-center gap-1">
                        <button
                            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditAppointment?.(appointment);
                            }}
                        >
                            <MoreVertical className={cn("w-3.5 h-3.5 opacity-60", !useCustomStatusStyle && statusStyles.text)} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );

    if (selectionMode) return cardContent;

    return (
        <AppointmentQuickView
            appointment={appointment}
            open={isPopoverOpen}
            onOpenChange={(open) => {
                // Prevent opening if currently dragging or if a drag action is likely happening
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
    // The parent creates a new style object on every render, so we must check values.
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
