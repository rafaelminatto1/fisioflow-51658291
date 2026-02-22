/**
 * VirtualizedAppointmentList - Lista virtualizada de agendamentos
 *
 * Performance: Otimizado para lidar com milhares de agendamentos
 * - Usando react-window para virtualização
 * - Renderização apenas de itens visíveis
 * - Altura dinâmica por item
 * - Suporte a reciclagem de itens
 */

import React, { useMemo, useRef, useCallback } from 'react';
import { VariableSizeList as List, ListChildComponentProps, areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Appointment } from '@/types';
import { AppointmentCard } from './AppointmentCard';
import { cn } from '@/lib/utils';

interface VirtualizedAppointmentListProps {
  appointments: Appointment[];
  onItemClick?: (appointment: Appointment) => void;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  selectedAppointmentId?: string;
  className?: string;
  itemHeight?: number | ((index: number, data: any) => number);
  overscanCount?: number;
}

interface AppointmentItemData {
  appointments: Appointment[];
  onItemClick?: (appointment: Appointment) => void;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  selectedAppointmentId?: string;
}

// Componente de item individual
const AppointmentItem = memo(({ index, style, data }: ListChildComponentProps<AppointmentItemData>) => {
  const { appointments, onItemClick, onEdit, onDelete, selectedAppointmentId } = data;
  const appointment = appointments[index];

  if (!appointment) return null;

  const isSelected = selectedAppointmentId === appointment.id;

  return (
    <div style={style} className="p-2">
      <div
        className={cn(
          'transition-all duration-200',
          isSelected && 'ring-2 ring-primary ring-offset-2 rounded-lg scale-[1.02]'
        )}
      >
        <AppointmentCard
          appointment={appointment}
          onClick={() => onItemClick?.(appointment)}
          onEdit={() => onEdit?.(appointment)}
          onDelete={() => onDelete?.(appointment)}
          className={isSelected ? 'shadow-lg' : ''}
        />
      </div>
    </div>
  );
}, areEqual);

AppointmentItem.displayName = 'AppointmentItem';

export const VirtualizedAppointmentList = memo(({
  appointments,
  onItemClick,
  onEdit,
  onDelete,
  selectedAppointmentId,
  className,
  itemHeight = 140, // Altura padrão do card + padding
  overscanCount = 5,
}: VirtualizedAppointmentListProps) => {
  const listRef = useRef<List>(null);

  // Calcular altura dinâmica por item (opcional)
  const getItemHeight = useCallback((index: number) => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index, { appointments });
    }
    return itemHeight as number;
  }, [itemHeight, appointments]);

  // Dados compartilhados entre itens (evita re-renders)
  const itemData = useMemo<AppointmentItemData>(
    () => ({
      appointments,
      onItemClick,
      onEdit,
      onDelete,
      selectedAppointmentId,
    }),
    [appointments, onItemClick, onEdit, onDelete, selectedAppointmentId]
  );

  // Scroll para item específico
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' | 'auto' = 'center') => {
    listRef.current?.scrollToItem(index, align);
  }, []);

  // Expor método de scroll via ref (para uso externo)
  React.useImperativeHandle(
    React.forwardRef(() => listRef),
    () => ({
      scrollToItem,
    })
  );

  if (appointments.length === 0) {
    return (
      <div className={cn('text-center py-12 text-muted-foreground', className)}>
        <p className="text-sm">Nenhum agendamento encontrado</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full', className)}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={appointments.length}
            itemSize={getItemHeight}
            itemData={itemData}
            overscanCount={overscanCount}
            className="scrollbar-thin"
          >
            {AppointmentItem}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

VirtualizedAppointmentList.displayName = 'VirtualizedAppointmentList';

// Hook para scroll programático
export const useAppointmentListScroll = () => {
  const listRef = useRef<List>(null);

  const scrollToAppointment = useCallback(
    (appointmentId: string, appointments: Appointment[]) => {
      const index = appointments.findIndex((a) => a.id === appointmentId);
      if (index !== -1) {
        listRef.current?.scrollToItem(index, 'center');
      }
    },
    []
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToItem(0, 'start');
  }, []);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToItem(9999, 'end');
  }, []);

  return {
    listRef,
    scrollToAppointment,
    scrollToTop,
    scrollToBottom,
  };
};
