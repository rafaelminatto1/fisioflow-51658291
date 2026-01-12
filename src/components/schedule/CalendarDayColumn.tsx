import React, { memo } from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Ban, AlertTriangle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Badge } from '@/components/ui/badge';

interface DayColumnProps {
    day: Date;
    timeSlots: string[];
    appointments: Appointment[];
    isDayClosed: boolean;
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    handleDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
    checkTimeBlocked: (date: Date, time: string) => { blocked: boolean; reason?: string };
    getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
}

export const DayColumn = memo(({
    day,
    timeSlots,
    appointments,
    isDayClosed,
    onTimeSlotClick,
    onEditAppointment,
    onDeleteAppointment,
    dragState,
    dropTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    checkTimeBlocked,
    getStatusColor,
    isOverCapacity,
    openPopoverId,
    setOpenPopoverId,
    onAppointmentReschedule
}: DayColumnProps) => {
    const isTodayDate = isToday(day);
    const isDraggable = !!onAppointmentReschedule;

    return (
        <div
            className="w-full sm:w-auto border-r border-border/50 last:border-r-0 relative group flex-shrink-0"
        >
            <div className={cn(
                "h-14 sm:h-16 border-b border-border/50 sticky top-0 z-10 p-2 sm:p-3 text-center text-xs sm:text-sm backdrop-blur-md transition-all duration-300 shadow-sm",
                isTodayDate
                    ? "bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 ring-2 ring-primary/40"
                    : "bg-gradient-to-br from-muted/60 to-muted/40 hover:from-muted/80 hover:to-muted/60"
            )}>
                <div className="font-extrabold uppercase tracking-wider text-[10px] sm:text-xs">
                    {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={cn(
                    "text-lg sm:text-2xl font-black mt-0.5 sm:mt-1",
                    isTodayDate && "drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                )}>
                    {format(day, 'd')}
                </div>
            </div>

            {/* Time slots interativos */}
            <div className="relative">
                {isDayClosed ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs p-4 min-h-[500px]">
                        <div className="flex flex-col items-center gap-2">
                            <Ban className="h-4 w-4" />
                            <span>Fechado</span>
                        </div>
                    </div>
                ) : (
                    timeSlots.map(time => {
                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, day) && dropTarget.time === time;
                        const { blocked, reason } = checkTimeBlocked(day, time);

                        return (
                            <TooltipProvider key={time}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "h-12 sm:h-16 border-b border-border/20 cursor-pointer transition-all duration-200 group/slot relative",
                                                blocked
                                                    ? "bg-destructive/10 cursor-not-allowed"
                                                    : "hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/5 active:bg-primary/20",
                                                isDropTarget && !blocked && "bg-primary/25 ring-2 ring-primary ring-inset"
                                            )}
                                            onClick={() => !blocked && onTimeSlotClick(day, time)}
                                            onDragOver={(e) => !blocked && handleDragOver(e, day, time)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => !blocked && handleDrop(e, day, time)}
                                        >
                                            {blocked ? (
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-destructive/60">
                                                    <Ban className="h-2 w-2" />
                                                </span>
                                            ) : (
                                                <span className={cn(
                                                    "absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-foreground opacity-0 group-hover/slot:opacity-100 transition-all duration-200 scale-95 group-hover/slot:scale-100 pointer-events-none",
                                                    isDropTarget && "opacity-100"
                                                )}>
                                                    <span className="bg-gradient-primary px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg">
                                                        {isDropTarget ? '↓ Soltar' : '+ Novo'}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    {blocked && reason && (
                                        <TooltipContent>
                                            <p>{reason}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })
                )}

                {/* Appointments overlay - with stacking support for multiple appointments at same time */}
                {(() => {
                    // Agrupar appointments por horário para calcular offset horizontal
                    const appointmentsByTime: Record<string, Appointment[]> = {};
                    appointments.forEach(apt => {
                        const time = apt.time || '09:00';
                        if (!appointmentsByTime[time]) {
                            appointmentsByTime[time] = [];
                        }
                        appointmentsByTime[time].push(apt);
                    });

                    return appointments.map(apt => {
                        const [hours, minutes] = (apt.time || '09:00').split(':').map(Number);
                        const slotIndex = timeSlots.findIndex(slot => {
                            const [slotHour, slotMin] = slot.split(':').map(Number);
                            return slotHour === hours && slotMin === minutes;
                        });

                        if (slotIndex === -1 && !isDayClosed) return null;

                        // Calcular offset horizontal para appointments empilhados no mesmo horário
                        const sameTimeAppointments = appointmentsByTime[apt.time || '09:00'] || [];
                        const stackIndex = sameTimeAppointments.findIndex(a => a.id === apt.id);
                        const stackCount = sameTimeAppointments.length;

                        // Calcular largura e offset baseado em quantos appointments estão empilhados
                        const widthPercent = stackCount > 1 ? (100 / stackCount) - 2 : 100;
                        const leftPercent = stackCount > 1 ? (stackIndex * (100 / stackCount)) + 1 : 0;

                        // Altura e posição baseada na duração: 48px/slot mobile, 64px/slot desktop (cada slot = 30min)
                        const duration = apt.duration || 60;
                        const slots = duration / 30;
                        const heightMobile = slots * 48; // h-12 = 48px
                        const heightDesktop = slots * 64; // sm:h-16 = 64px
                        const topMobile = slotIndex >= 0 ? slotIndex * 48 : 0;
                        const topDesktop = slotIndex >= 0 ? slotIndex * 64 : 0;

                        return (
                            <AppointmentQuickView
                                key={apt.id}
                                appointment={apt}
                                open={openPopoverId === apt.id}
                                onOpenChange={(open) => setOpenPopoverId(open ? apt.id : null)}
                                onEdit={onEditAppointment ? () => onEditAppointment(apt) : undefined}
                                onDelete={onDeleteAppointment ? () => onDeleteAppointment(apt) : undefined}
                            >
                                <div
                                    draggable={isDraggable}
                                    onDragStart={(e) => handleDragStart(e, apt)}
                                    onDragEnd={handleDragEnd}
                                    className={cn(
                                        "absolute p-2 rounded-lg text-white cursor-pointer shadow-md border-l-[4px] backdrop-blur-sm animate-fade-in overflow-hidden flex flex-col justify-between",
                                        getStatusColor(apt.status, isOverCapacity(apt)),
                                        "hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group/card ring-1 ring-white/10",
                                        isDraggable && "cursor-grab active:cursor-grabbing",
                                        dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50 scale-95",
                                        isOverCapacity(apt) && "animate-pulse"
                                    )}
                                    style={{
                                        top: `${topMobile}px`,
                                        height: `${heightMobile}px`,
                                        // Posicionamento dinâmico para appointments empilhados
                                        left: stackCount > 1 ? `${leftPercent}%` : '2px',
                                        right: stackCount > 1 ? 'auto' : '2px',
                                        width: stackCount > 1 ? `${widthPercent}%` : 'calc(100% - 4px)',
                                        ['--top-desktop' as any]: `${topDesktop}px`,
                                        ['--height-desktop' as any]: `${heightDesktop}px`,
                                        // Garantir que empilhados fiquem visíveis
                                        zIndex: stackCount > 1 ? 10 + stackIndex : undefined,
                                    } as React.CSSProperties}
                                    onClick={(e) => e.stopPropagation()}
                                    title={`${apt.patientName} - ${apt.type} (${apt.status})${stackCount > 1 ? ` [${stackIndex + 1}/${stackCount}]` : ''}`}
                                >
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                  @media (min-width: 640px) {
                    [style*="--top-desktop"][style*="--height-desktop"] {
                      top: var(--top-desktop) !important;
                      height: var(--height-desktop) !important;
                    }
                  }
                `}} />
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        {/* Therapist Name - Like the "Dr. Ana" in mockup */}
                                        <div className={cn(
                                            "text-[10px] font-bold uppercase tracking-wide opacity-90 truncate",
                                            apt.therapistId?.includes('Ana') ? "text-yellow-200" :
                                                apt.therapistId?.includes('Paulo') ? "text-cyan-200" :
                                                    apt.therapistId?.includes('Carla') ? "text-purple-200" : "text-white/90"
                                        )}>
                                            {apt.therapistId || 'Sem Terapeuta'}
                                        </div>

                                        {/* Patient Name */}
                                        <div className="font-bold text-[11px] sm:text-xs leading-tight line-clamp-2 text-white shadow-sm">
                                            {isOverCapacity(apt) && <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-300" />}
                                            {apt.patientName}
                                        </div>

                                        {/* Service Type */}
                                        <div className="text-[9px] sm:text-[10px] opacity-80 truncate hidden sm:block">
                                            {apt.type}
                                        </div>
                                    </div>

                                    {/* Bottom Info: Time & Room */}
                                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] bg-black/10 -mx-2 -mb-2 px-2 py-1 mt-1 font-medium">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5 opacity-70" />
                                            {apt.time}
                                        </div>
                                        {apt.room && (
                                            <div className="flex items-center gap-1 opacity-80">
                                                <span>{apt.room}</span>
                                            </div>
                                        )}
                                    </div>

                                    {isDraggable && (
                                        <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-50 transition-opacity">
                                            <GripVertical className="h-3 w-3 hidden sm:block" />
                                        </div>
                                    )}
                                </div>
                            </AppointmentQuickView>
                        );
                    });
                })()}
            </div>
        </div>
    );
});

DayColumn.displayName = 'DayColumn';
