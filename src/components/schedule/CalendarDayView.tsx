import React, { memo } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Ban, AlertTriangle, Calendar, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types/appointment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppointmentQuickView } from './AppointmentQuickView';
import { Badge } from '@/components/ui/badge';

interface CalendarDayViewProps {
    currentDate: Date;
    currentTime: Date;
    currentTimePosition: number;
    appointments: Appointment[]; // This should now be passed ALREADY filtered or filter it inside? 
    // Parent passes 'appointments' as the full list in CalendarView.tsx currently. 
    // Let's stick to filtering inside for now to avoid changing parent logic drastically, 
    // BUT we should use the helper if possible to be consistent with WeekView?
    // Actually, for DayView, 'getAppointmentsForDate' is needed if we iterate.
    // But here we only render ONE day. So we can just filter once.
    getAppointmentsForDate: (date: Date) => Appointment[];

    timeSlots: string[];
    isDayClosed: boolean;
    onTimeSlotClick: (date: Date, time: string) => void;
    onEditAppointment?: (appointment: Appointment) => void;
    onDeleteAppointment?: (appointment: Appointment) => void;
    // Drag and drop
    onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<void>;
    dragState: { appointment: Appointment | null; isDragging: boolean };
    dropTarget: { date: Date; time: string } | null;
    handleDragStart: (e: React.DragEvent, appointment: Appointment) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
    // Helpers
    checkTimeBlocked: (date: Date, time: string) => { blocked: boolean; reason?: string };
    isTimeBlocked: (time: string) => boolean;
    getBlockReason: (time: string) => string | undefined;
    getStatusColor: (status: string, isOverCapacity?: boolean) => string;
    isOverCapacity: (apt: Appointment) => boolean;
    openPopoverId: string | null;
    setOpenPopoverId: (id: string | null) => void;
}

const CalendarDayView = memo(({
    currentDate,
    currentTime,
    currentTimePosition,
    // appointments, // We will use getAppointmentsForDate instead for consistency
    getAppointmentsForDate,
    timeSlots,
    isDayClosed,
    onTimeSlotClick,
    onEditAppointment,
    onDeleteAppointment,
    onAppointmentReschedule,
    dragState,
    dropTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    checkTimeBlocked,
    isTimeBlocked,
    getBlockReason,
    getStatusColor,
    isOverCapacity,
    openPopoverId,
    setOpenPopoverId
}: CalendarDayViewProps) => {

    // Logic inconsistency fix: usage of helper passed from parent
    const dayAppointments = getAppointmentsForDate(currentDate);

    if (isDayClosed) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Ban className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Clínica fechada neste dia</p>
                <p className="text-sm">Não há horários disponíveis</p>
            </div>
        );
    }

    return (
        <div className="flex bg-gradient-to-br from-background to-muted/20 min-h-[800px]">
            {/* Time column com design melhorado */}
            <div className="w-24 border-r bg-muted/30 backdrop-blur-sm">
                <div className="h-16 border-b flex items-center justify-center sticky top-0 bg-muted/30 z-10 backdrop-blur-sm shadow-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                {timeSlots.map(time => (
                    <div key={time} className="h-16 border-b border-border/50 p-3 text-sm font-medium text-muted-foreground flex items-center">
                        {time}
                    </div>
                ))}
            </div>

            {/* Day column com hover states */}
            <div className="flex-1 relative bg-background/50">
                <div className="h-16 border-b bg-gradient-to-r from-primary/10 to-primary/5 p-4 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                    <div className="font-semibold text-center flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </div>
                </div>

                {/* Time slots */}
                <div className="relative">
                    {timeSlots.map(time => {
                        const hour = parseInt(time.split(':')[0]);
                        const isCurrentHour = hour === currentTime.getHours();
                        const isDropTarget = dropTarget && isSameDay(dropTarget.date, currentDate) && dropTarget.time === time;
                        const blocked = isTimeBlocked(time);
                        const blockReason = getBlockReason(time);

                        return (
                            <TooltipProvider key={time}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "h-16 border-b border-border cursor-pointer transition-colors group relative",
                                                blocked
                                                    ? "bg-destructive/10 cursor-not-allowed"
                                                    : "hover:bg-primary/5",
                                                isCurrentHour && !blocked && "bg-primary/5",
                                                isDropTarget && !blocked && "bg-primary/20 ring-2 ring-primary ring-inset"
                                            )}
                                            onClick={() => !blocked && onTimeSlotClick(currentDate, time)}
                                            onDragOver={(e) => !blocked && handleDragOver(e, currentDate, time)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => !blocked && handleDrop(e, currentDate, time)}
                                        >
                                            {blocked ? (
                                                <span className="absolute inset-0 flex items-center justify-center text-xs text-destructive/70">
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Bloqueado
                                                </span>
                                            ) : (
                                                <span className={cn(
                                                    "absolute inset-0 flex items-center justify-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                                                    isDropTarget && "opacity-100 text-primary font-medium"
                                                )}>
                                                    {isDropTarget ? 'Soltar aqui' : 'Clique para agendar'}
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

                    {/* Appointments overlay - with stacking support */}
                    {(() => {
                        // Agrupar appointments por horário para calcular offset horizontal
                        const appointmentsByTime: Record<string, Appointment[]> = {};
                        dayAppointments.forEach(apt => {
                            const time = apt.time || '09:00';
                            if (!appointmentsByTime[time]) {
                                appointmentsByTime[time] = [];
                            }
                            appointmentsByTime[time].push(apt);
                        });

                        return dayAppointments.map(apt => {
                            const [hours, minutes] = (apt.time || '09:00').split(':').map(Number);
                            const slotIndex = timeSlots.findIndex(slot => {
                                const [slotHour, slotMin] = slot.split(':').map(Number);
                                return slotHour === hours && slotMin === minutes;
                            });

                            if (slotIndex === -1) return null;

                            // Calcular offset horizontal para appointments empilhados
                            const sameTimeAppointments = appointmentsByTime[apt.time || '09:00'] || [];
                            const stackIndex = sameTimeAppointments.findIndex(a => a.id === apt.id);
                            const stackCount = sameTimeAppointments.length;

                            // Calcular largura e offset baseado em quantos appointments estão empilhados
                            const widthPercent = stackCount > 1 ? (100 / stackCount) - 2 : 100;
                            const leftOffset = stackCount > 1 ? (stackIndex * (100 / stackCount)) + 1 : 0;

                            // Calcular altura baseada na duração (cada slot = 64px, cada slot = 30min)
                            const duration = apt.duration || 60;
                            const heightInPixels = (duration / 30) * 64;
                            const top = slotIndex * 64;
                            const isDraggable = !!onAppointmentReschedule;

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
                                            "absolute p-2 rounded-xl text-white cursor-pointer shadow-xl border-l-4 backdrop-blur-sm animate-fade-in overflow-hidden",
                                            getStatusColor(apt.status, isOverCapacity(apt)),
                                            "hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group/card",
                                            isDraggable && "cursor-grab active:cursor-grabbing",
                                            dragState.isDragging && dragState.appointment?.id === apt.id && "opacity-50 scale-95",
                                            isOverCapacity(apt) && "animate-pulse"
                                        )}
                                        style={{
                                            top: `${top}px`,
                                            height: `${heightInPixels}px`,
                                            // Posicionamento dinâmico para appointments empilhados
                                            left: stackCount > 1 ? `${leftOffset}%` : '4px',
                                            right: stackCount > 1 ? 'auto' : '4px',
                                            width: stackCount > 1 ? `${widthPercent}%` : 'calc(100% - 8px)',
                                            zIndex: stackCount > 1 ? 10 + stackIndex : 1,
                                        }}
                                        title={`${apt.patientName} - ${apt.type}${stackCount > 1 ? ` [${stackIndex + 1}/${stackCount}]` : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-1">
                                            <div className="font-bold text-sm line-clamp-3 leading-tight flex-1 flex items-center gap-1">
                                                {isOverCapacity(apt) && (
                                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-white" />
                                                )}
                                                {apt.patientName}
                                            </div>
                                            {isDraggable && (
                                                <GripVertical className="h-4 w-4 opacity-50 flex-shrink-0 group-hover/card:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                        <div className="text-xs opacity-90 flex items-center gap-1 mt-1">
                                            <Clock className="h-3 w-3 flex-shrink-0" />
                                            <span>{apt.time}</span>
                                            {isOverCapacity(apt) && (
                                                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-white/20 text-white ml-1">
                                                    EXCEDENTE
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </AppointmentQuickView>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
});

CalendarDayView.displayName = 'CalendarDayView';

export { CalendarDayView };
