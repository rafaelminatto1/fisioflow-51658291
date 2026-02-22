/**
 * VirtualizedDayView - Visão de dia virtualizada
 *
 * Performance: Otimizado para exibir slots de horário
 * - Virtualização vertical dos time slots
 * - Altura fixa por slot para performance
 * - Header fixo com slots
 * - Overscan para scroll suave
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { format, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';

interface VirtualizedDayViewProps {
  date: Date;
  appointments: Appointment[];
  onSlotClick?: (slot: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  selectedSlot?: Date | null;
  selectedAppointmentId?: string;
  startHour?: number; // 0-23
  endHour?: number; // 0-23
  slotDuration?: number; // minutos
  slotHeight?: number; // pixels
  className?: string;
}

// Configurações de slot
const SLOT_CONFIG = {
  startHour: 6,
  endHour: 22,
  slotDuration: 15, // 15 minutos por slot
  slotHeight: 60, // 60px por slot
};

// Header com horários
const TimeHeader = React.memo(({ startHour, endHour }: { startHour: number; endHour: number }) => {
  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      {hours.map((hour) => (
        <div
          key={hour}
          className="border-l border-r border-b border-border/30 py-2 px-2 text-xs text-muted-foreground"
          style={{ height: `${SLOT_CONFIG.slotHeight * 4}px` }} // 4 slots de 15min por hora
        >
          {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm', { locale: ptBR })}
        </div>
      ))}
    </div>
  );
});

TimeHeader.displayName = 'TimeHeader';

// Item individual do slot
const SlotItem = memo(
  ({
    index,
    style,
    data,
  }: ListChildComponentProps<{
    date: Date;
    appointments: Appointment[];
    startHour: number;
    slotDuration: number;
    onSlotClick?: (slot: Date) => void;
    onAppointmentClick?: (appointment: Appointment) => void;
    selectedSlot: Date | null;
    selectedAppointmentId?: string;
  }>) => {
    const {
      date,
      appointments,
      startHour,
      slotDuration,
      onSlotClick,
      onAppointmentClick,
      selectedSlot,
      selectedAppointmentId,
    } = data;

    const slotMinutes = index * slotDuration;
    const slotDate = new Date(date);
    slotDate.setHours(startHour, slotMinutes, 0, 0);

    const slotTime = format(slotDate, 'HH:mm');

    // Encontrar agendamentos neste slot
    const slotAppointments = useMemo(() => {
      const slotEnd = new Date(slotDate.getTime() + slotDuration * 60000);
      return appointments.filter((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        return aptStart < slotEnd && aptEnd > slotDate;
      });
    }, [appointments, slotDate, slotDuration]);

    const isSelected = selectedSlot && isSameDay(selectedSlot, slotDate) &&
      format(selectedSlot, 'HH:mm') === slotTime;

    const hasAppointment = slotAppointments.length > 0;

    return (
      <div style={style}>
        <div
          className={cn(
            'border-b border-border/20 h-full min-h-[60px] relative transition-colors',
            hasAppointment ? 'bg-primary/5' : 'hover:bg-muted/50',
            isSelected && 'ring-2 ring-primary ring-inset',
            'cursor-pointer'
          )}
          onClick={() => onSlotClick?.(slotDate)}
        >
          <div className="absolute inset-0 p-1">
            {/* Agendamentos neste slot */}
            {slotAppointments.map((apt) => (
              <div
                key={apt.id}
                className={cn(
                  'mb-1 p-2 rounded-md text-xs font-medium cursor-pointer transition-all hover:shadow-md',
                  apt.status === 'completed' && 'bg-muted/60 text-muted-foreground line-through',
                  apt.status === 'cancelled' && 'bg-destructive/10 text-destructive/80',
                  apt.status === 'pending' && 'bg-primary text-primary-foreground',
                  apt.status === 'confirmed' && 'bg-emerald-500 text-white',
                  apt.status === 'no-show' && 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
                  selectedAppointmentId === apt.id && 'ring-2 ring-ring'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick?.(apt);
                }}
                style={{
                  height: `${Math.max(apt.duration / slotDuration * SLOT_CONFIG.slotHeight - 4, 24)}px`,
                }}
              >
                <div className="font-medium truncate">{apt.patientName || apt.patient?.name}</div>
                {apt.service && <div className="text-[10px] opacity-80 truncate">{apt.service}</div>}
              </div>
            ))}

            {/* Indicador de hora em cheio */}
            {slotMinutes % 60 === 0 && (
              <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-end pr-2">
                <span className="text-[10px] text-muted-foreground">
                  {slotTime}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

SlotItem.displayName = 'SlotItem';

export const VirtualizedDayView = memo(({
  date,
  appointments,
  onSlotClick,
  onAppointmentClick,
  selectedSlot,
  selectedAppointmentId,
  startHour = SLOT_CONFIG.startHour,
  endHour = SLOT_CONFIG.endHour,
  slotDuration = SLOT_CONFIG.slotDuration,
  slotHeight = SLOT_CONFIG.slotHeight,
  className,
}: VirtualizedDayViewProps) => {
  const listRef = useRef<List>(null);

  // Calcular número total de slots
  const totalSlots = useMemo(() => {
    return ((endHour - startHour) * 60) / slotDuration;
  }, [startHour, endHour, slotDuration]);

  // Dados do item
  const itemData = useMemo(
    () => ({
      date,
      appointments,
      startHour,
      slotDuration,
      onSlotClick,
      onAppointmentClick,
      selectedSlot,
      selectedAppointmentId,
    }),
    [
      date,
      appointments,
      startHour,
      slotDuration,
      onSlotClick,
      onAppointmentClick,
      selectedSlot,
      selectedAppointmentId,
    ]
  );

  // Scroll para hora atual
  const scrollToNow = useCallback(() => {
    if (!isToday(date)) return;

    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= startHour && currentHour <= endHour) {
      const currentMinute = now.getMinutes();
      const currentSlotIndex = ((currentHour - startHour) * 60 + currentMinute) / slotDuration;
      listRef.current?.scrollToItem(Math.floor(currentSlotIndex), 'center');
    }
  }, [date, startHour, endHour, slotDuration]);

  // Scroll para slot específico
  const scrollToSlot = useCallback(
    (slotDate: Date) => {
      if (!isSameDay(slotDate, date)) return;

      const slotHour = slotDate.getHours();
      const slotMinute = slotDate.getMinutes();

      if (slotHour >= startHour && slotHour <= endHour) {
        const slotIndex = ((slotHour - startHour) * 60 + slotMinute) / slotDuration;
        listRef.current?.scrollToItem(Math.floor(slotIndex), 'center');
      }
    },
    [date, startHour, endHour, slotDuration]
  );

  // Expor métodos via ref
  React.useImperativeHandle(
    React.forwardRef(() => listRef),
    () => ({
      scrollToNow,
      scrollToSlot,
    })
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header com data */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {format(date, 'EEEE', { locale: ptBR })}
            </h2>
            <p className={cn(
              'text-sm',
              isToday(date) ? 'text-primary font-medium' : 'text-muted-foreground'
            )}>
              {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {isToday(date) && ' • Hoje'}
            </p>
          </div>
          {isToday(date) && (
            <button
              onClick={scrollToNow}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Agora
            </button>
          )}
        </div>
      </div>

      {/* Slots virtualizados */}
      <div className="flex-1 overflow-hidden">
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={totalSlots}
              itemSize={slotHeight}
              itemData={itemData}
              overscanCount={10}
              className="scrollbar-thin"
              initialScrollOffset={isToday(date) ? Math.max(0, (new Date().getHours() - startHour) * slotHeight * 4 - height / 2) : 0}
            >
              {SlotItem}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
});

VirtualizedDayView.displayName = 'VirtualizedDayView';
