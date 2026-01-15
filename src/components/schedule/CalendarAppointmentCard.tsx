import React, { memo, useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Appointment, AppointmentStatus } from '@/types/appointment';
import { STATUS_CONFIG } from '@/lib/config/agenda';
import { cn } from '@/lib/utils';
import { MoreVertical, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { getOptimalTextColor, isLightColor } from '@/utils/colorContrast';

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
    // Selection props
    selectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
}

const normalizeTime = (time: string | null | undefined): string => {
    if (!time || !time.trim()) return '00:00';
    return time.substring(0, 5);
};

export const CalendarAppointmentCard = memo(({
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
    selectionMode = false,
    isSelected = false,
    onToggleSelection
}: CalendarAppointmentCardProps) => {
    const [isHovered, setIsHovered] = useState(false);

    const config = STATUS_CONFIG[appointment.status as AppointmentStatus] || STATUS_CONFIG.agendado;
    const StatusIcon = config.icon;
    const isSmall = (appointment.duration || 60) <= 30;

    // Calculate optimal text color based on background color
    const textColor = getOptimalTextColor(config.bgColor);
    const isLight = isLightColor(config.bgColor);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    // Disable dragging in selection mode
    const draggable = isDraggable && !selectionMode;

    const handleClick = (e: React.MouseEvent) => {
        if (selectionMode && onToggleSelection) {
            e.stopPropagation();
            onToggleSelection(appointment.id);
        }
    };

    const cardContent = (
        <div
            draggable={draggable}
            onDragStart={(e) => draggable && onDragStart(e, appointment)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
                if (!isDragging && onDragOver && !selectionMode) {
                    onDragOver(e);
                }
            }}
            onDrop={(e) => {
                if (!isDragging && onDrop && !selectionMode) {
                    onDrop(e);
                }
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={cn(
                "absolute rounded-md flex flex-col border-l-[3px] transition-all shadow-sm cursor-pointer overflow-hidden group hover:shadow-md",
                draggable && "cursor-grab active:cursor-grabbing",
                isDragging && "opacity-50 scale-95 z-50 ring-2 ring-blue-400",
                !isDragging && isHovered && !selectionMode && "z-30 ring-1 ring-black/5 dark:ring-white/10",
                appointment.status === 'cancelado' && "opacity-80 grayscale-[0.5]",
                // Selection styles
                selectionMode && "hover:opacity-90",
                isSelected && "ring-2 ring-primary ring-offset-1 z-40"
            )}
            style={{
                ...style,
                backgroundColor: config.bgColor,
                borderLeftColor: config.borderColor,
            }}
        >
            <div className="p-1.5 flex flex-col h-full relative">
                {/* Header Line (Time + Status) */}
                <div className="flex items-center justify-between mb-0.5">
                    <span
                        className="text-[11px] font-bold uppercase tracking-wide leading-none opacity-90"
                        style={{ color: textColor }}
                    >
                        {normalizeTime(appointment.time)}
                        {appointment.duration && (() => {
                            const [h, m] = (appointment.time || "00:00").split(':').map(Number);
                            const end = new Date();
                            end.setHours(h, m + appointment.duration);
                            return ` - ${format(end, 'HH:mm')}`;
                        })()}
                    </span>
                    
                    {/* Selection Indicator or Status Icon */}
                    {selectionMode ? (
                        <div className="flex-shrink-0">
                            {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-primary fill-background" />
                            ) : (
                                <Circle className="w-4 h-4 opacity-50" style={{ color: textColor }} />
                            )}
                        </div>
                    ) : (
                        StatusIcon && !isSmall && (
                            <StatusIcon className="w-3.5 h-3.5 opacity-70" style={{ color: textColor }} />
                        )
                    )}
                </div>

                {/* Patient Name */}
                <div className="flex items-start gap-1">
                    <span
                        className={cn(
                            "text-[13px] font-bold truncate leading-tight",
                            appointment.status === 'cancelado' && "line-through decoration-red-500/50"
                        )}
                        style={{ color: textColor }}
                    >
                        {appointment.patientName || 'Paciente'}
                    </span>
                </div>

                {/* Type/Treatment */}
                {!isSmall && (
                    <span
                        className="text-[11px] truncate mt-0.5 leading-tight opacity-80"
                        style={{ color: textColor }}
                    >
                        {appointment.type || 'Consulta'}
                    </span>
                )}

                {/* Actions / Drag Handle Popup */}
                {isHovered && draggable && !isDragging && !selectionMode && (
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                        <div className={cn(
                            "rounded p-0.5 shadow-sm",
                            isLight ? "bg-black/10 hover:bg-black/20" : "bg-white/20 hover:bg-white/30"
                        )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditAppointment?.(appointment);
                            }}
                        >
                            <MoreVertical className="w-3 h-3" style={{ color: textColor }} />
                        </div>
                    </div>
                )}

                {/* Drag Handle (Visible on hover) */}
                {isHovered && draggable && !selectionMode && (
                    <div className="absolute bottom-1 right-1 opacity-20 group-hover:opacity-100 cursor-grab">
                        <GripVertical className="w-3 h-3" style={{ color: textColor }} />
                    </div>
                )}
            </div>
        </div>
    );

    // If in selection mode, don't use Tooltip/Popover to allow easy clicking
    if (selectionMode) {
        return cardContent;
    }

    return (
        <Tooltip>
            {/* 
               IMPORTANT: Tooltip requires a single child. AppointmentQuickView gives that,
               wrapping the cardContent.
            */}
            <AppointmentQuickView
                appointment={appointment}
                open={isPopoverOpen}
                onOpenChange={(open) => onOpenPopover(open ? appointment.id : null)}
                onEdit={onEditAppointment ? () => onEditAppointment(appointment) : undefined}
                onDelete={onDeleteAppointment ? () => onDeleteAppointment(appointment) : undefined}
            >
                <TooltipTrigger asChild>
                    {cardContent}
                </TooltipTrigger>
            </AppointmentQuickView>

            <TooltipContent side="right" className="p-0 overflow-hidden border-none shadow-xl">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 w-56">
                    <div className={cn("w-full h-1.5 rounded-full mb-2", config.twBg?.replace('bg-', 'bg-').replace('50', '500') || "")} />
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-0.5">{appointment.patientName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <Clock className="w-3 h-3" />
                        {appointment.time} - {appointment.duration}min
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className={cn("text-[10px] uppercase", config.twText, config.twBg, config.twBorder)}>
                            {appointment.status}
                        </Badge>
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
});

CalendarAppointmentCard.displayName = 'CalendarAppointmentCard';
