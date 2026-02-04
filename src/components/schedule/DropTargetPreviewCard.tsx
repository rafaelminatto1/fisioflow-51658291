import React, { memo } from 'react';
import { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';
import { getStatusCardClasses } from '@/lib/calendar/dragPreview';

const normalizeTime = (time: string | null | undefined): string => {
    if (!time || !time.trim()) return '00:00';
    return time.substring(0, 5);
};

interface DropTargetPreviewCardProps {
    appointment: Appointment;
    isDraggedCard: boolean;
    cardWidthPercent: number;
    leftOffset: number;
    showText: boolean;
    variant?: 'day' | 'week';
}

/**
 * Mini-card de preview exibido no slot de destino durante drag and drop.
 * Replica visualmente o CalendarAppointmentCard (barra de status, horário, nome)
 * para indicar como os agendamentos serão organizados após o drop.
 */
export const DropTargetPreviewCard = memo(({
    appointment,
    isDraggedCard,
    cardWidthPercent,
    leftOffset,
    showText,
    variant = 'day'
}: DropTargetPreviewCardProps) => {
    const statusColors = getStatusCardClasses(appointment.status || 'agendado');
    const isCompact = variant === 'week';

    return (
        <div
            className={cn(
                "absolute h-[calc(100%-8px)] rounded-lg border-2 border-dashed",
                "flex flex-col overflow-hidden",
                "transition-[box-shadow,background-color,border-color] duration-150 ease-out",
                "animate-in fade-in duration-150 ease-out",
                "shadow-sm",
                statusColors.bg,
                statusColors.border,
                isDraggedCard && "bg-primary/20 dark:bg-primary/30 border-primary ring-1 ring-primary/30 shadow-md z-10"
            )}
            style={{
                left: `calc(${leftOffset}% + 2px)`,
                width: `calc(${cardWidthPercent}% - 4px)`,
                top: '4px'
            }}
        >
            <div className={cn(
                "flex flex-col h-full min-w-0",
                isCompact ? "p-0.5" : "p-1"
            )}>
                {/* Barra lateral de status - alinhado ao CalendarAppointmentCard */}
                <div className="flex items-start gap-1 min-w-0 flex-1">
                    <div className={cn(
                        "w-1 rounded-full shrink-0 opacity-80 mt-0.5",
                        isDraggedCard ? "bg-primary" : (statusColors.accent || "bg-slate-600")
                    )} />
                    <div className="flex flex-col min-w-0 flex-1 py-0.5">
                        {showText ? (
                            <>
                                <span className={cn(
                                    "font-mono font-semibold text-[10px] leading-none",
                                    isDraggedCard ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {normalizeTime(appointment.time)}
                                </span>
                                <span className={cn(
                                    "block truncate font-medium mt-0.5",
                                    isCompact ? "text-[9px]" : "text-[10px]",
                                    isDraggedCard ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {appointment.patientName || 'Paciente'}
                                </span>
                            </>
                        ) : (
                            <span className={cn(
                                "font-mono font-semibold text-[10px]",
                                isDraggedCard ? "text-primary" : "text-muted-foreground"
                            )}>
                                {normalizeTime(appointment.time)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

DropTargetPreviewCard.displayName = 'DropTargetPreviewCard';
