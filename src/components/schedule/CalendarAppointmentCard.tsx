import React, { memo, useState } from 'react';
import { Appointment } from '@/types/appointment';
import { CARD_SIZE_CONFIGS } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { MoreVertical, GripVertical, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { AppointmentQuickView } from './AppointmentQuickView';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTouch } from '@/hooks/use-touch';
import { useCardSize } from '@/hooks/useCardSize';
import { useReducedMotion } from '@/lib/accessibility/a11y-utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
}

const normalizeTime = (time: string | null | undefined): string => {
    if (!time || !time.trim()) return '00:00';
    return time.substring(0, 5);
};

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
    return styles[status as keyof typeof styles] || styles.default;
};

const CalendarAppointmentCardBase = ({
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
    dragHandleOnly = false
}: CalendarAppointmentCardProps) => {
    const isMobile = useIsMobile();
    const isTouch = useIsTouch();
    const reducedMotion = useReducedMotion();
    const [isHovered, setIsHovered] = useState(false);
    const { cardSize, fontPercentage } = useCardSize();

    // Status visual config
    const statusStyles = getStatusStyles(appointment.status);

    // Get card size configuration
    const sizeConfig = CARD_SIZE_CONFIGS[cardSize];

    // Calculate scaled font sizes based on user preference
    const fontScale = fontPercentage / 100; // Convert percentage to multiplier (0.5 to 1.5)
    const scaledTimeFontSize = Math.round(sizeConfig.timeFontSize * fontScale);
    const scaledNameFontSize = Math.max(14, Math.round(sizeConfig.nameFontSize * fontScale));
    const scaledTypeFontSize = Math.round(sizeConfig.typeFontSize * fontScale);

    const duration = appointment.duration || 60;
    const isSmall = duration <= 30; // 30 min or less
    const isTiny = duration < 30; // Less than 30 min (e.g. 15, 20)

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    // Disable dragging in selection mode or on touch devices (Mobile/iPad) for better UX
    // This allows clicks to register immediately without waiting for drag detection
    const draggable = isDraggable && !selectionMode && !isTouch;
    // When dragHandleOnly, only the grip handle initiates drag
    // But root MUST be draggable to receive dragOver events while cursor transitions to drop target
    const rootDraggable = draggable;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (selectionMode && onToggleSelection) {
            onToggleSelection(appointment.id);
            return;
        }

        // NOTA: O onOpenPopover é tratado pelo AppointmentQuickView wrapper
        // Removemos a chamada direta aqui para evitar duplicação
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
                opacity: isDragging && hideGhostWhenSiblings ? 0 : (isDragging ? 0.45 : 1),
                scale: reducedMotion ? 1 : (isDragging ? 0.98 : 1),
                y: 0,
                boxShadow: isDragging || isHovered ? "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
            }}
            whileTap={reducedMotion ? undefined : {
                scale: isTouch ? 0.97 : 0.99,
                transition: { duration: 0.1 }
            }}
            draggable={rootDraggable}
            onDragStart={(e) => {
                // Quando dragHandleOnly, apenas o handle deve iniciar o drag
                // Mas o card raiz precisa ser draggable para receber dragOver
                if (!rootDraggable && e && 'dataTransfer' in e) {
                    // Prevenir drag pelo card raiz quando dragHandleOnly é true
                    e.preventDefault();
                    return;
                }
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
                "calendar-appointment-card absolute rounded-lg flex flex-col overflow-hidden [transition:left_150ms_ease-out,width_150ms_ease-out,opacity_150ms_ease-out,transform_150ms_ease-out,box-shadow_150ms_ease-out] border",
                "cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                statusStyles.bg,
                statusStyles.hoverBg,
                statusStyles.border,
                draggable && "cursor-grab active:cursor-grabbing",
                isDragging && "z-50 ring-2 ring-dashed ring-primary/50 shadow-xl backdrop-blur-[1px]",
                isSaving && "animate-pulse-subtle ring-2 ring-amber-400/60 ring-offset-1 z-30",
                !isDragging && isHovered && !selectionMode && "ring-2 ring-black/5 dark:ring-white/10 shadow-xl",
                isDropTarget && !isDragging && "ring-2 ring-primary/70 ring-offset-1 shadow-2xl z-25",
                selectionMode && "hover:opacity-90 active:scale-[0.98] transition-all duration-150",
                isSelected && "ring-2 ring-primary ring-offset-1 shadow-xl z-40",
                isTouch && "active:scale-[0.98] transition-transform duration-150"
            )}
            style={{
                ...style,
                backgroundColor: undefined,
                pointerEvents: isDragging && hideGhostWhenSiblings && !dragHandleOnly ? 'none' : undefined,
                // Quando dragHandleOnly é true, mantém pointerEvents ativo
                // para permitir dragOver no card raiz durante a transição do handle
            }}
            role="button"
            tabIndex={0}
            aria-label={`${appointment.patientName} - ${normalizeTime(appointment.time)} - ${appointment.status}`}
            aria-selected={isSelected}
            aria-pressed={isSelected}
        >
            <div
                className={cn(
                    "flex flex-col h-full relative",
                    isTiny && "p-0.5 justify-center items-center"
                )}
                style={isTiny ? undefined : { padding: `max(8px, ${sizeConfig.padding})`, paddingRight: '1.5rem' }}
            >
                {/* 1. Tiny View (< 30m): Minimal indicator */}
                {isTiny ? (
                    <div className="flex items-center gap-1 w-full justify-center">
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusStyles.accent)} />
                        {/* Only show time if > 15m allows? Actually for 15m, usually just color is enough on grid */}
                        {duration >= 20 && (
                            <span className={cn("text-[9px] font-bold", statusStyles.text)}>
                                {normalizeTime(appointment.time)}
                            </span>
                        )}
                    </div>
                ) : (
                    /* 2. Normal View (>= 30m) */
                    <>
                        {/* Header: Time & Status */}
                        <div className="flex items-center justify-between gap-2 mb-1 w-full">
                            <div className="flex items-center gap-2 min-w-0">
                                {/* Accent Bar logic instead of dot for cleaner look */}
                                <div className={cn("w-1 h-3 rounded-full shrink-0 opacity-80", statusStyles.accent)} />

                                <span
                                    className={cn(
                                        "font-mono font-semibold truncate leading-none tracking-tight",
                                        statusStyles.text,
                                    )}
                                    style={{ fontSize: `${scaledTimeFontSize}px` }}
                                >
                                    {normalizeTime(appointment.time)}
                                </span>
                            </div>

                            {/* Selection or loading indicator only; status icon removed per repagination */}
                            {isSaving ? (
                                <div className="flex-shrink-0">
                                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                                </div>
                            ) : selectionMode ? (
                                <div className="flex-shrink-0">
                                    {isSelected ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-background" />
                                    ) : (
                                        <Circle className="w-3.5 h-3.5 opacity-40" />
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* Patient Name & Details (tooltip for long names) */}
                        <div className="flex flex-col mt-1 min-h-0 w-full">
                            <div className="min-w-0 flex-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                        className={cn(
                                            "block font-bold leading-tight line-clamp-2 tracking-tight",
                                            statusStyles.text,
                                        )}
                                        style={{ fontSize: `${scaledNameFontSize}px` }}
                                    >
                                        {appointment.patientName}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[280px] break-words">
                                    {appointment.patientName}
                                  </TooltipContent>
                                </Tooltip>

                                {sizeConfig.showType && (
                                    <span
                                        className={cn(
                                            "block truncate opacity-70 mt-1 font-medium",
                                            statusStyles.subtext
                                        )}
                                        style={{ fontSize: `${scaledTypeFontSize}px` }}
                                    >
                                        {appointment.type}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Hover Actions (Edit/Drag). Com dragHandleOnly, mostrar handle sempre para descoberta. */}
                {!isMobile && (isHovered || dragHandleOnly) && draggable && !isDragging && !selectionMode && (
                    <AnimatePresence>
                        <motion.div
                            key="edit-action"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute top-0.5 right-0.5 flex flex-col gap-0.5"
                        >
                            <div
                                role="button"
                                className="p-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors backdrop-blur-[1px]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditAppointment?.(appointment);
                                }}
                            >
                                <MoreVertical className={cn("w-3 h-3", statusStyles.subtext)} />
                            </div>
                        </motion.div>
                        <motion.div
                            key="drag-handle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute bottom-0.5 right-0.5 opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing backdrop-blur-[1px] p-0.5 rounded-sm"
                        >
                            {dragHandleOnly ? (
                                <div
                                    className="size-full min-w-[24px] min-h-[24px] flex items-center justify-center -m-0.5 p-0.5"
                                    draggable
                                    onDragStart={(e) => {
                                        e.stopPropagation();
                                        onOpenPopover(null);
                                        onDragStart(e, appointment);
                                    }}
                                    onDragOver={(e) => {
                                        // Sempre chamar preventDefault para manter o drag ativo
                                        // mesmo quando o cursor está sobre o próprio handle
                                        // Isso evita que o drag "morra" ao sair do handle
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onDragEnd={onDragEnd}
                                    data-drag-handle
                                >
                                    <GripVertical className={cn("w-3 h-3", statusStyles.subtext)} />
                                </div>
                            ) : (
                                <GripVertical className={cn("w-3 h-3", statusStyles.subtext)} />
                            )}
                        </motion.div>
                    </AnimatePresence>
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
};


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
        prev.dragHandleOnly !== next.dragHandleOnly
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
