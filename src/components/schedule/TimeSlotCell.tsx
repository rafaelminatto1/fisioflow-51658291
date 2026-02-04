import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Ban } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import {
  calculateCardWidthPercent,
  calculateCardOffsetPercent,
  shouldShowText,
  MAX_CARDS_WITHOUT_BADGE
} from '@/lib/calendar/dragPreview';
import { DropTargetPreviewCard } from './DropTargetPreviewCard';

interface TimeSlotCellProps {
  day: Date;
  time: string;
  rowIndex: number;
  colIndex: number;
  isClosed: boolean;
  isBlocked: boolean;
  isDropTarget: boolean;
  onTimeSlotClick: (date: Date, time: string) => void;
  handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
  // Preview props
  targetAppointments?: Appointment[];
  draggedAppointment?: Appointment | null;
}

/**
 * Componente de célula de slot de tempo para a visualização semanal.
 * Exibe preview dinâmico de cards durante drag and drop.
 *
 * @component
 */
export const TimeSlotCell = memo(({
  day,
  time,
  rowIndex,
  colIndex,
  isClosed,
  isBlocked,
  isDropTarget,
  onTimeSlotClick,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  targetAppointments = [],
  draggedAppointment = null
}: TimeSlotCellProps) => {
  const isHourStart = time.endsWith(':00');
  const isInvalidDrop = isDropTarget && (isBlocked || isClosed);

  // Calcular preview cards para o drop target
  const showPreview = isDropTarget && !isInvalidDrop && draggedAppointment;
  const previewCards = showPreview ? [...targetAppointments, draggedAppointment] : [];
  const totalCards = previewCards.length;

  // Memoizar handlers para evitar re-renders desnecessários
  const handleClick = useCallback(() => {
    if (!isBlocked && !isClosed) {
      onTimeSlotClick(day, time);
    }
  }, [isBlocked, isClosed, onTimeSlotClick, day, time]);

  const handleDragOverWrapper = useCallback((e: React.DragEvent) => {
    handleDragOver(e, day, time);
  }, [handleDragOver, day, time]);

  const handleDropWrapper = useCallback((e: React.DragEvent) => {
    if (!isBlocked && !isClosed) {
      handleDrop(e, day, time);
    }
  }, [isBlocked, isClosed, handleDrop, day, time]);

  // Gerar descrição acessível para screen readers
  const getAriaLabel = () => {
    const dateStr = day.toLocaleDateString('pt-BR');
    if (isClosed) return `Slot ${time} do dia ${dateStr}, clínica fechada`;
    if (isBlocked) return `Slot ${time} do dia ${dateStr}, horário bloqueado`;
    if (showPreview) {
      return `Slot ${time} do dia ${dateStr}, ${totalCards} paciente${totalCards !== 1 ? 's' : ''} agendado${totalCards !== 1 ? 's' : ''}. Solte para reagendar.`;
    }
    return `Slot ${time} do dia ${dateStr}, disponível para agendamento`;
  };

  return (
    <div
      data-testid={`time-slot-${day.toISOString().split('T')[0]}-${time}`}
      role="gridcell"
      aria-label={getAriaLabel()}
      aria-selected={isDropTarget}
      aria-dropeffect={!isBlocked && !isClosed ? 'move' : 'none'}
      className={cn(
        "border-r border-slate-100 dark:border-slate-800 relative transition-all duration-200",
        isHourStart && "border-t border-slate-100 dark:border-slate-800",
        !isHourStart && "border-t border-dashed border-slate-50 dark:border-slate-900",
        colIndex === 6 && "border-r-0",
        isClosed && "bg-slate-50/50 dark:bg-slate-900/20 pattern-diagonal-lines",
        !isClosed && !isBlocked && "hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer group/cell",
        isBlocked && "bg-slate-100/50 dark:bg-slate-800/50 cursor-not-allowed",
        // Drop target styles
        isDropTarget && !isInvalidDrop && "bg-primary/10 dark:bg-primary/20 shadow-inner ring-2 ring-inset ring-primary/30",
        isInvalidDrop && "bg-red-50 dark:bg-red-900/20 shadow-inner ring-2 ring-inset ring-red-500/30",
        // Preview deve ficar acima dos cards existentes (z-40 > z-20 dos cards)
        showPreview && "z-40"
      )}
      style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
      onClick={handleClick}
      onDragOver={handleDragOverWrapper}
      onDragLeave={handleDragLeave}
      onDrop={handleDropWrapper}
    >
      {/* Indicador de bloqueio/fechado */}
      {(isClosed || isBlocked) && (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-destructive/70" aria-hidden="true">
          <Ban className="h-3 w-3 mr-1" />
          {isClosed ? 'Fechado' : 'Bloqueado'}
        </span>
      )}

      {/* Preview dinâmica mostrando como os cards serão organizados */}
      {showPreview && (
        <div className="absolute inset-0 flex items-center px-1 gap-1 pointer-events-none" aria-hidden="true">
          {previewCards.map((apt, index) => {
            const cardWidthPercent = calculateCardWidthPercent(totalCards);
            const leftOffset = calculateCardOffsetPercent(index, totalCards);
            const isDraggedCard = apt.id === draggedAppointment?.id;
            const showText = shouldShowText(cardWidthPercent, totalCards);

            return (
              <DropTargetPreviewCard
                key={apt.id}
                appointment={apt}
                isDraggedCard={!!isDraggedCard}
                cardWidthPercent={cardWidthPercent}
                leftOffset={leftOffset}
                showText={showText}
                variant="week"
              />
            );
          })}

          {/* Indicador de quantidade quando há muitos cards */}
          {totalCards > MAX_CARDS_WITHOUT_BADGE && (
            <div className="absolute bottom-1 right-1 bg-primary/80 text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
              {totalCards}
            </div>
          )}
        </div>
      )}

      {/* Mensagem de "Solte aqui" quando slot vazio */}
      {showPreview && totalCards === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-primary/60 text-xs font-medium animate-pulse" aria-hidden="true">
          <Calendar className="w-4 h-4 mr-1" />
          Solte aqui
        </div>
      )}

      {/* Botão de adicionar no hover - escondido durante drag */}
      {!isBlocked && !isClosed && !isInvalidDrop && !showPreview && (
        <div className="absolute inset-x-0 mx-auto w-fit -top-2.5 z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none" aria-hidden="true">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white shadow-md transform scale-75 group-hover/cell:scale-100 transition-transform">
            <span className="text-sm leading-none mb-px">+</span>
          </div>
        </div>
      )}
    </div>
  );
});

TimeSlotCell.displayName = 'TimeSlotCell';
