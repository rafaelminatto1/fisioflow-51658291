import React, { memo, useState } from 'react';
import { Appointment, AppointmentStatus } from '@/types/appointment';
import { STATUS_CONFIG } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { MoreVertical, GripVertical, CheckCircle2, Circle, Clock } from 'lucide-react';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTouch } from '@/hooks/use-touch';

interface CalendarAppointmentCardProps {
    appointment: Appointment;
    style: React.CSSProperties;
    isDraggable: boolean;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    onDragEnd: () => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    onOpenPopover: (id: string | null) => void;
    isPopoverOpen: boolean;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    isDropTarget?: boolean;
    selectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
}

const normalizeTime = (time: string | null | undefined): string => {
    if (!time || !time.trim()) return '00:00';
    return time.substring(0, 5);
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const getStatusStyles = (status: string) => {
    // Vivid & Standardized Palette
    const styles = {
        confirmado: {
            border: 'border-emerald-500',
            bg: 'bg-emerald-100/90 dark:bg-emerald-500/20',
            hoverBg: 'hover:bg-emerald-200/90 dark:hover:bg-emerald-500/30',
            text: 'text-emerald-900 dark:text-emerald-50',
            subtext: 'text-emerald-800/80 dark:text-emerald-200/80',
            accent: 'bg-emerald-600',
            indicator: 'text-emerald-700'
        },
        agendado: {
            border: 'border-blue-500',
            bg: 'bg-blue-100/90 dark:bg-blue-500/20',
            hoverBg: 'hover:bg-blue-200/90 dark:hover:bg-blue-500/30',
            text: 'text-blue-900 dark:text-blue-50',
            subtext: 'text-blue-800/80 dark:text-blue-200/80',
            accent: 'bg-blue-600',
            indicator: 'text-blue-700'
        },
        em_andamento: {
            border: 'border-amber-500',
            bg: 'bg-amber-100/90 dark:bg-amber-500/20',
            hoverBg: 'hover:bg-amber-200/90 dark:hover:bg-amber-500/30',
            text: 'text-amber-900 dark:text-amber-50',
            subtext: 'text-amber-800/80 dark:text-amber-200/80',
            accent: 'bg-amber-600',
            indicator: 'text-amber-700'
        },
        // Combined Red for negative states
        cancelado: {
            border: 'border-red-500',
            bg: 'bg-red-100/90 dark:bg-red-500/20',
            hoverBg: 'hover:bg-red-200/90 dark:hover:bg-red-500/30',
            text: 'text-red-900 dark:text-red-50',
            subtext: 'text-red-800/80 dark:text-red-200/80',
            accent: 'bg-red-600',
            indicator: 'text-red-700'
        },
        falta: {
            border: 'border-red-500', // Same vibrant red
            bg: 'bg-red-100/90 dark:bg-red-500/20',
            hoverBg: 'hover:bg-red-200/90 dark:hover:bg-red-500/30',
            text: 'text-red-900 dark:text-red-50',
            subtext: 'text-red-800/80 dark:text-red-200/80',
            accent: 'bg-red-600',
            indicator: 'text-red-700'
        },
        concluido: {
            border: 'border-indigo-500',
            bg: 'bg-indigo-100/90 dark:bg-indigo-500/20',
            hoverBg: 'hover:bg-indigo-200/90 dark:hover:bg-indigo-500/30',
            text: 'text-indigo-900 dark:text-indigo-50',
            subtext: 'text-indigo-800/80 dark:text-indigo-200/80',
            accent: 'bg-indigo-600',
            indicator: 'text-indigo-700'
        },
        avaliacao: {
            border: 'border-violet-500',
            bg: 'bg-violet-100/90 dark:bg-violet-500/20',
            hoverBg: 'hover:bg-violet-200/90 dark:hover:bg-violet-500/30',
            text: 'text-violet-900 dark:text-violet-50',
            subtext: 'text-violet-800/80 dark:text-violet-200/80',
            accent: 'bg-violet-600',
            indicator: 'text-violet-700'
        },
        default: {
            border: 'border-slate-500',
            bg: 'bg-slate-100/90 dark:bg-slate-500/20',
            hoverBg: 'hover:bg-slate-200/90 dark:hover:bg-slate-500/30',
            text: 'text-slate-900 dark:text-slate-50',
            subtext: 'text-slate-700/80 dark:text-slate-300/80',
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
    onDragStart,
    onDragEnd,
    onEditAppointment,
    onDeleteAppointment,
    onOpenPopover,
    isPopoverOpen,
    onDragOver,
    onDrop,
    isDropTarget = false,
    selectionMode = false,
    isSelected = false,
    onToggleSelection
}: CalendarAppointmentCardProps) => {
    const isMobile = useIsMobile();
    const isTouch = useIsTouch();
    const [isHovered, setIsHovered] = useState(false);

    // Status visual config
    const statusStyles = getStatusStyles(appointment.status);
    const config = STATUS_CONFIG[appointment.status as AppointmentStatus] || STATUS_CONFIG.agendado;
    const StatusIcon = config.icon;

    const duration = appointment.duration || 60;
    const isSmall = duration <= 30; // 30 min or less
    const isTiny = duration < 30; // Less than 30 min (e.g. 15, 20)

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    // Disable dragging in selection mode or on touch devices (Mobile/iPad) for better UX
    // This allows clicks to register immediately without waiting for drag detection
    const draggable = isDraggable && !selectionMode && !isTouch;

    const handleClick = (e: React.MouseEvent) => {
        // Always stop propagation to prevent parent handlers (like calendar slot click) from firing
        e.stopPropagation();

        if (selectionMode && onToggleSelection) {
            onToggleSelection(appointment.id);
            return;
        }

        // On touch devices (Mobile/iPad), we trigger the popover manually via click
        // This ensures reliable opening even if drag/drop logic would otherwise interfere
        if (isTouch) {
            onOpenPopover(appointment.id);
        }
    };

    const cardContent = (
        <motion.div
            layout // Smooth layout changes
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.005, zIndex: 20 }}
            draggable={draggable}
            onDragStart={(e) => {
                if (draggable) {
                    onOpenPopover(null); // Close popover if open
                    onDragStart(e as any, appointment);
                }
            }}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
                if (onDragOver && !selectionMode) onDragOver(e as any);
            }}
            onDrop={(e) => {
                if (onDrop && !selectionMode) onDrop(e as any);
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={cn(
                "absolute rounded-md flex flex-col overflow-hidden transition-colors border",
                "shadow-xs hover:shadow-md cursor-pointer",
                statusStyles.bg,
                statusStyles.hoverBg,
                statusStyles.border,
                draggable && "cursor-grab active:cursor-grabbing",
                isDragging && "opacity-60 scale-95 z-50 ring-2 ring-blue-400 grayscale",
                !isDragging && isHovered && !selectionMode && "ring-1 ring-black/10 dark:ring-white/10",
                isDropTarget && !isDragging && "ring-2 ring-primary/60 ring-offset-1 shadow-lg scale-[1.02] z-25",
                selectionMode && "hover:opacity-90",
                isSelected && "ring-2 ring-primary ring-offset-1 z-40"
            )}
            style={{
                ...style,
                backgroundColor: undefined, // Override calculator styles
            }}
        >
            <div className={cn(
                "flex flex-col h-full relative",
                isTiny ? "p-0.5 justify-center items-center" : "p-1.5"
            )}>
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
                        <div className="flex items-center justify-between gap-1 mb-0.5 w-full">
                            <div className="flex items-center gap-1.5 min-w-0">
                                {/* Accent Bar logic instead of dot for cleaner look */}
                                <div className={cn("w-1 h-3 rounded-full shrink-0 opacity-80", statusStyles.accent)} />

                                <span className={cn(
                                    "font-mono font-semibold truncate leading-none tracking-tight",
                                    statusStyles.text,
                                    isSmall ? "text-[10px]" : "text-[11px]"
                                )}>
                                    {normalizeTime(appointment.time)}
                                </span>
                            </div>

                            {/* Selection or Icon */}
                            {selectionMode ? (
                                <div className="flex-shrink-0">
                                    {isSelected ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-background" />
                                    ) : (
                                        <Circle className="w-3.5 h-3.5 opacity-40" />
                                    )}
                                </div>
                            ) : (
                                StatusIcon && !isSmall && (
                                    <StatusIcon className={cn("w-3 h-3 opacity-50", statusStyles.indicator)} />
                                )
                            )}
                        </div>

                        {/* Patient Name & Details */}
                        <div className="flex items-start gap-1.5 mt-0.5 min-h-0 w-full">
                            {/* Avatar only for regular cards (> 30m) */}
                            {!isSmall && (
                                <div className="hidden sm:block shrink-0 mt-0.5">
                                    <Avatar className="h-5 w-5 border border-white/40 shadow-sm">
                                        <AvatarFallback className={cn("text-[8px] font-bold", statusStyles.accent, "text-white")}>
                                            {getInitials(appointment.patientName)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <span className={cn(
                                    "block font-bold leading-tight line-clamp-2 tracking-tight",
                                    statusStyles.text,
                                    // Responsive text sizing
                                    isSmall ? "text-[11px]" : "text-[12px]"
                                )}>
                                    {appointment.patientName}
                                </span>

                                {!isSmall && (
                                    <span className={cn(
                                        "block text-[10px] truncate opacity-70 mt-0.5 font-medium",
                                        statusStyles.subtext
                                    )}>
                                        {appointment.type}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Hover Actions (Edit/Drag) - Only if not tiny, or if hovered on tiny */}
                {!isMobile && isHovered && draggable && !isDragging && !selectionMode && (
                    <AnimatePresence>
                        <motion.div
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute bottom-0.5 right-0.5 opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing backdrop-blur-[1px] p-0.5 rounded-sm"
                        >
                            <GripVertical className={cn("w-3 h-3", statusStyles.subtext)} />
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
        prev.isDropTarget !== next.isDropTarget ||
        prev.selectionMode !== next.selectionMode ||
        prev.isSelected !== next.isSelected ||
        prev.isPopoverOpen !== next.isPopoverOpen
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
