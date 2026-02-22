/**
 * VirtualizedWeekView - Visão de semana virtualizada
 *
 * Performance: Otimizado para exibir 7 dias com virtualização
 * - Virtualização vertical dos time slots
 * - Header fixo com dias da semana
 * - Slots agrupados por dia
 * - Overscan para scroll suave
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';

interface VirtualizedWeekViewProps {
  weekStart: Date;
  appointments: Appointment[];
  onSlotClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  selectedSlot?: Date | null;
  selectedAppointmentId?: string;
  startHour?: number;
  endHour?: number;
  slotDuration?: number;
  slotHeight?: number;
  className?: string;
}

const WEEK_CONFIG = {
  startHour: 6,
  endHour: 22,
  slotDuration: 15,
  slotHeight: 60,
};

// Header com dias da semana
const WeekHeader = React.memo(({ weekStart, endHour, slotHeight }: { weekStart: Date; endHour: number; slotHeight: number }) => {
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  return (
    <div className="sticky top-0 z-20 bg-background border-b">
      <div className="flex">
        {/* Coluna de horários */}
        <div className="w-12 flex-shrink-0 border-r border-border/30">
          <div
            style={{ height: `${((endHour - WEEK_CONFIG.startHour) * 4 + 1) * slotHeight}px` }}
            className="flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">Horário</span>
          </div>
        </div>

        {/* Colunas dos dias */}
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={cn(
              'flex-1 border-r border-border/30 text-center py-2',
              isToday(day) && 'bg-primary/5'
            )}
          >
            <div className={cn(
              'text-sm font-semibold',
              isToday(day) && 'text-primary'
            )}>
              {format(day, 'EEE', { locale: ptBR })}
            </div>
            <div className={cn(
              'text-xs',
              isToday(day) ? 'text-primary font-medium' : 'text-muted-foreground'
            )}>
              {format(day, 'd MMM')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

WeekHeader.displayName = 'WeekHeader';

// Item do slot (linha horizontal)
const WeekSlotItem = memo(
  ({
    index,
    style,
    data,
  }: ListChildComponentProps<{
    weekStart: Date;
    appointments: Appointment[];
    startHour: number;
    slotDuration: number;
    onSlotClick?: (date: Date) => void;
    onAppointmentClick?: (appointment: Appointment) => void;
    selectedSlot: Date | null;
    selectedAppointmentId?: string;
  }>) => {
    const {
      weekStart,
      appointments,
      startHour,
      slotDuration,
      onSlotClick,
      onAppointmentClick,
      selectedSlot,
      selectedAppointmentId,
    } = data;

    const slotMinutes = index * slotDuration;
    const slotHour = startHour + Math.floor(slotMinutes / 60);
    const slotMinute = slotMinutes % 60;

    const isHourStart = slotMinute === 0;

    return (
      <div style={style}>
        <div className="flex h-full min-h-[60px] border-b border-border/20">
          {/* Coluna de horário */}
          <div className="w-12 flex-shrink-0 border-r border-border/30 flex items-center justify-center">
            {isHourStart && (
              <span className="text-xs text-muted-foreground">
                {String(slotHour).padStart(2, '0')}:00
              </span>
            )}
          </div>

          {/* Colunas dos dias */}
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const dayDate = addDays(weekStart, dayIndex);
            const slotDate = new Date(dayDate);
            slotDate.setHours(slotHour, slotMinute, 0, 0);

            const isSelected = selectedSlot && isSameDay(selectedSlot, slotDate) &&
              format(selectedSlot, 'HH:mm') === format(slotDate, 'HH:mm');

            // Encontrar agendamentos neste slot/dia
            const slotAppointments = useMemo(() => {
              const slotEnd = new Date(slotDate.getTime() + slotDuration * 60000);
              return appointments.filter((apt) => {
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                return isSameDay(aptStart, dayDate) && aptStart < slotEnd && aptEnd > slotDate;
              });
            }, [appointments, slotDate, slotDuration, dayDate]);

            const hasAppointment = slotAppointments.length > 0;

            return (
              <div
                key={dayIndex}
                className={cn(
                  'flex-1 border-r border-border/20 relative transition-colors',
                  hasAppointment && 'bg-primary/5',
                  isToday(dayDate) && 'bg-primary/[0.02]',
                  'hover:bg-muted/50',
                  isSelected && 'ring-2 ring-primary ring-inset',
                  'cursor-pointer min-w-[80px]'
                )}
                onClick={() => onSlotClick?.(slotDate)}
              >
                {/* Agendamentos */}
                <div className="absolute inset-0 p-1 space-y-0.5">
                  {slotAppointments.slice(0, 2).map((apt) => (
                    <div
                      key={apt.id}
                      className={cn(
                        'p-1 rounded text-[10px] font-medium cursor-pointer truncate',
                        apt.status === 'completed' && 'bg-muted/60 text-muted-foreground',
                        apt.status === 'cancelled' && 'bg-destructive/10 text-destructive/80',
                        apt.status === 'confirmed' && 'bg-emerald-500 text-white',
                        apt.status === 'pending' && 'bg-primary text-primary-foreground',
                        apt.status === 'no-show' && 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
                        selectedAppointmentId === apt.id && 'ring-1 ring-ring'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick?.(apt);
                      }}
                    >
                      {apt.patientName || apt.patient?.name}
                    </div>
                  ))}

                  {/* Indicador de mais agendamentos */}
                  {slotAppointments.length > 2 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{slotAppointments.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

WeekSlotItem.displayName = 'WeekSlotItem';

export const VirtualizedWeekView = memo(({
  weekStart,
  appointments,
  onSlotClick,
  onAppointmentClick,
  selectedSlot,
  selectedAppointmentId,
  startHour = WEEK_CONFIG.startHour,
  endHour = WEEK_CONFIG.endHour,
  slotDuration = WEEK_CONFIG.slotDuration,
  slotHeight = WEEK_CONFIG.slotHeight,
  className,
}: VirtualizedWeekViewProps) => {
  const listRef = useRef<List>(null);

  // Calcular total de slots
  const totalSlots = useMemo(() => {
    return ((endHour - startHour) * 60) / slotDuration;
  }, [startHour, endHour, slotDuration]);

  // Dados do item
  const itemData = useMemo(
    () => ({
      weekStart,
      appointments,
      startHour,
      slotDuration,
      onSlotClick,
      onAppointmentClick,
      selectedSlot,
      selectedAppointmentId,
    }),
    [
      weekStart,
      appointments,
      startHour,
      slotDuration,
      onSlotClick,
      onAppointmentClick,
      selectedSlot,
      selectedAppointmentId,
    ]
  );

  // Scroll para agora
  const scrollToNow = useCallback(() => {
    const now = new Date();
    const weekOfNow = startOfWeek(now, { weekStartsOn: 1 });
    const isCurrentWeek = isSameDay(weekStart, weekOfNow);

    if (isCurrentWeek) {
      const currentHour = now.getHours();
      if (currentHour >= startHour && currentHour <= endHour) {
        const currentMinute = now.getMinutes();
        const currentSlotIndex = ((currentHour - startHour) * 60 + currentMinute) / slotDuration;
        listRef.current?.scrollToItem(Math.floor(currentSlotIndex), 'center');
      }
    }
  }, [weekStart, startHour, endHour, slotDuration]);

  // Scroll para slot específico
  const scrollToSlot = useCallback(
    (slotDate: Date) => {
      const slotDayIndex = Math.floor((slotDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

      if (slotDayIndex >= 0 && slotDayIndex < 7) {
        const slotHour = slotDate.getHours();
        const slotMinute = slotDate.getMinutes();

        if (slotHour >= startHour && slotHour <= endHour) {
          const slotIndex = ((slotHour - startHour) * 60 + slotMinute) / slotDuration;
          listRef.current?.scrollToItem(Math.floor(slotIndex), 'center');
        }
      }
    },
    [weekStart, startHour, endHour, slotDuration]
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
      {/* Header */}
      <WeekHeader
        weekStart={weekStart}
        endHour={endHour}
        slotHeight={slotHeight}
      />

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
              initialScrollOffset={isToday(weekStart) ? Math.max(0, (new Date().getHours() - startHour) * slotHeight * 4 - height / 2) : 0}
            >
              {WeekSlotItem}
            </List>
          )}
        </AutoSizer>
      </div>

      {/* FAB para voltar a agora */}
      {isToday(weekStart) && (
        <button
          onClick={scrollToNow}
          className="fixed bottom-20 right-4 z-10 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          aria-label="Voltar para agora"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
    </div>
  );
});

VirtualizedWeekView.displayName = 'VirtualizedWeekView';
