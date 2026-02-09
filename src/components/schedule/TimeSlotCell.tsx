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
  const isSaturdayBlockedAfterCutoff = isBlocked && day.getDay() === 6 && (() => {
    const [hour] = time.split(':').map(Number);
    return hour >= 13;
  })();

  // Calcular preview cards para o drop target
  // Não incluir o card arrastado no preview se ele já está neste slot (evita dois fantasmas)
  const draggedIsFromThisSlot = draggedAppointment && targetAppointments.some(apt => apt.id === draggedAppointment.id);
  const showPreview = isDropTarget && !isInvalidDrop && draggedAppointment && !draggedIsFromThisSlot;
  // Apenas mostrar outros appointments existentes + o card arrastado quando vindo de outro slot
  const previewCards = showPreview ? [...targetAppointments.filter(apt => apt.id !== draggedAppointment?.id), draggedAppointment] : [];
  const totalCards = previewCards.length;

  // Memoizar handlers para evitar re-renders desnecessários
  const handleClick = useCallback(() => {
    if (!isBlocked && !isClosed) {
      onTimeSlotClick(day, time);
    }
  }, [isBlocked, isClosed, onTimeSlotClick, day, time]);

  const handleDragOverWrapper = useCallback((e: React.DragEvent) => {
    // IMPORTANTE: Sempre chamar e.preventDefault() mesmo em slots bloqueados/fechados
    // Isso permite que o drag continue propagando para slots adjacentes válidos.
    // Sem isso, o drag "morre" quando o cursor sai da célula original.
    e.preventDefault();

    // Apenas slots válidos (não bloqueados/fechados) se tornam drop target
    // Isso evita anúncio aria-live enganoso mas permite arrastar por cima de bloqueados
    if (isBlocked || isClosed) return;
    handleDragOver(e, day, time);
  }, [handleDragOver, day, time, isBlocked, isClosed]);

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
        "border-r border-slate-100 dark:border-slate-800 relative",
        "transition-[background-color,box-shadow] duration-200 ease-out",
        isHourStart && "border-t border-slate-100 dark:border-slate-800",
        !isHourStart && "border-t border-dashed border-slate-50 dark:border-slate-900",
        colIndex === 6 && "border-r-0",
        isClosed && "bg-slate-50/50 dark:bg-slate-900/20 pattern-diagonal-lines",
        !isClosed && !isBlocked && "hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer group/cell",
        isBlocked && "bg-red-50/60 dark:bg-red-950/30 cursor-not-allowed",
        // Drop target válido: fundo e anel bem visíveis (redesign agenda DnD)
        isDropTarget && !isInvalidDrop && "bg-primary/10 dark:bg-primary/20 ring-2 ring-inset ring-primary/40 dark:ring-primary/50 shadow-inner",
        // Drop inválido (bloqueado/fechado com drag sobre): feedback explícito
        isInvalidDrop && "bg-red-100/80 dark:bg-red-900/30 ring-2 ring-inset ring-red-400/50",
        showPreview && "z-40"
      )}
      style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
      onClick={handleClick}
      onDragOver={handleDragOverWrapper}
      onDragLeave={handleDragLeave}
      onDrop={handleDropWrapper}
    >
      {/* Indicador de bloqueio/fechado - ícone + texto (não só cor) */}
      {(isClosed || (isBlocked && !isSaturdayBlockedAfterCutoff)) && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-destructive/80 dark:text-destructive font-medium" aria-hidden="true">
          <Ban className="h-4 w-4 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">{isClosed ? 'Fechado' : 'Bloqueado'}</span>
        </span>
      )}

      {/* Preview dinâmica: como os cards ficarão após o drop */}
      {showPreview && (
        <div className="absolute inset-0 flex items-center px-1 gap-1 pointer-events-none animate-in fade-in duration-150" aria-hidden="true">
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

          {totalCards > MAX_CARDS_WITHOUT_BADGE && (
            <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              {totalCards}
            </div>
          )}

          {/* Dica "Solte aqui" sobre o preview */}
          <div className="absolute bottom-0.5 left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-[9px] font-medium text-primary/90 bg-background/80 dark:bg-background/90 px-1.5 py-0.5 rounded">
              Solte aqui
            </span>
          </div>
        </div>
      )}

      {/* Drop target sem preview (ex.: antes do primeiro dragOver) - indicador "Solte aqui" */}
      {isDropTarget && !isInvalidDrop && !showPreview && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-primary font-medium" aria-hidden="true">
          <Calendar className="h-5 w-5 text-primary/80" />
          <span className="text-xs">Solte aqui</span>
        </div>
      )}

      {/* Botão + no hover - só quando não está em drag e slot disponível */}
      {!isBlocked && !isClosed && !isInvalidDrop && !showPreview && (
        <div className="absolute inset-x-0 mx-auto w-fit -top-2.5 z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 pointer-events-none" aria-hidden="true">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-200 ease-out group-hover/cell:scale-100 scale-90">
            <span className="text-sm leading-none">+</span>
          </div>
        </div>
      )}

      {/* Área clicável à direita - permite adicionar agendamentos mesmo com múltiplos cards */}
      {/* z-50 garante que fique acima dos cards de agendamento (que têm z-10+) */}
      {!isBlocked && !isClosed && !isInvalidDrop && !showPreview && (
        <div
          className="absolute right-0 top-0 bottom-0 w-[16px] z-50 border-l border-transparent hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group/add"
          aria-label="Clique para adicionar agendamento"
          onClick={(e) => {
            e.stopPropagation();
            onTimeSlotClick(day, time);
          }}
        >
          {/* Indicador "+" sutil que aparece no hover */}
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/add:opacity-100 transition-opacity text-primary/60 hover:text-primary font-medium text-sm leading-none">
            +
          </span>
        </div>
      )}
    </div>
  );
});

TimeSlotCell.displayName = 'TimeSlotCell';
