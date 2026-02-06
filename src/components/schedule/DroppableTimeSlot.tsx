import { useDroppable } from '@dnd-kit/core';
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Ban } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { DropTargetPreviewCard } from './DropTargetPreviewCard';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import {

  calculateCardWidthPercent,
  calculateCardOffsetPercent,
  shouldShowText,
  MAX_CARDS_WITHOUT_BADGE
} from '@/lib/calendar/dragPreview';

interface DroppableTimeSlotProps {
  day: Date;
  time: string;
  rowIndex: number;
  colIndex: number;
  isClosed: boolean;
  isBlocked: boolean;
  isDropTarget: boolean;
  isDraggingOver: boolean; // From @dnd-kit isOver
  children?: React.ReactNode;
  onClick?: () => void;
  // Preview props
  targetAppointments?: Appointment[];
  draggedAppointment?: Appointment | null;
}

const isHourStart = (time: string): boolean => time.endsWith(':00');

/**
 * Comparison function for React.memo to prevent unnecessary re-renders.
 * Only re-render when the actual drop-related props change.
 */
function droppableTimeSlotAreEqual(
  prev: DroppableTimeSlotProps,
  next: DroppableTimeSlotProps
): boolean {
  return (
    prev.day.getTime() === next.day.getTime() &&
    prev.time === next.time &&
    prev.isClosed === next.isClosed &&
    prev.isBlocked === next.isBlocked &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isDraggingOver === next.isDraggingOver &&
    prev.targetAppointments?.length === next.targetAppointments?.length &&
    prev.draggedAppointment?.id === next.draggedAppointment?.id
  );
}

/**
 * Enhanced Droppable time slot cell for the week view calendar.
 * Uses @dnd-kit's useDroppable hook to register as a drop target.
 * Shows preview cards during drag to indicate how appointments will be arranged.
 */
export const DroppableTimeSlot = memo(({
  day,
  time,
  rowIndex,
  colIndex,
  isClosed,
  isBlocked,
  isDropTarget,
  isDraggingOver,
  children,
  onClick,
  targetAppointments = [],
  draggedAppointment = null
}: DroppableTimeSlotProps) => {
  // ID único para o droppable: "slot-YYYY-MM-DD-HH:mm"
  const dateStr = formatDateToLocalISO(day);
  const id = `slot-${dateStr}-${time}`;

  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isClosed || isBlocked,
    data: {
      date: day,
      time,
    },
  });

  const isInvalidDrop = (isDropTarget || isDraggingOver) && (isBlocked || isClosed);
  const isTargetActive = (isDropTarget || isDraggingOver) && !isInvalidDrop;

  // Calculate preview cards
  const showPreview = isTargetActive && draggedAppointment;
  const previewCards = useMemo(() => {
    if (!showPreview) return [];
    return [...targetAppointments, draggedAppointment];
  }, [showPreview, targetAppointments, draggedAppointment]);

  const totalCards = previewCards.length;

  // Gerar descrição acessível para screen readers
  const getAriaLabel = () => {
    const formattedDate = day.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    if (isClosed) return `Slot ${time} do dia ${formattedDate}, clínica fechada`;
    if (isBlocked) return `Slot ${time} do dia ${formattedDate}, horário bloqueado`;
    if (showPreview) {
      return `Slot ${time} do dia ${formattedDate}. ${totalCards} agendamento${totalCards !== 1 ? 's' : ''}. Solte para reagendar.`;
    }
    if (isDraggingOver) {
      return `Slot ${time} do dia ${formattedDate}. Solte para reagendar.`;
    }
    return `Slot ${time} do dia ${formattedDate}, disponível para agendamento`;
  };

  return (
    <div
      ref={setNodeRef}
      data-testid={`time-slot-${dateStr}-${time}`}
      role="gridcell"
      aria-label={getAriaLabel()}
      aria-selected={isTargetActive}
      aria-dropeffect={!isBlocked && !isClosed ? 'move' : 'none'}
      className={cn(
        "border-r border-slate-100 dark:border-slate-800 relative",
        // Smooth transitions for visual feedback
        "transition-[background-color,box-shadow,ring] duration-200 ease-out",
        isHourStart(time) && "border-t border-slate-100 dark:border-slate-800",
        !isHourStart(time) && "border-t border-dashed border-slate-50 dark:border-slate-900",
        colIndex === 6 && "border-r-0",
        isClosed && "bg-slate-50/50 dark:bg-slate-900/20 pattern-diagonal-lines",
        !isClosed && !isBlocked && !isTargetActive && "hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer group/cell",
        isBlocked && "bg-red-50/60 dark:bg-red-950/30 cursor-not-allowed",
        // @dnd-kit isOver provides real-time hover state during drag
        isOver && !isClosed && !isBlocked && "bg-primary/10 dark:bg-primary/20 ring-2 ring-inset ring-primary/40 dark:ring-primary/50 shadow-inner animate-in fade-in duration-100",
        // Drop inválido (bloqueado/fechado com drag sobre): feedback explícito
        isInvalidDrop && "bg-red-100/80 dark:bg-red-900/30 ring-2 ring-inset ring-red-400/50 animate-in fade-in duration-100",
        isTargetActive && "z-40"
      )}
      style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
      onClick={onClick}
    >
      {/* Indicador de bloqueio/fechado - ícone + texto (acessibilidade) */}
      {(isClosed || isBlocked) && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-destructive/80 dark:text-destructive font-medium" aria-hidden="true">
          <Ban className="h-4 w-4 shrink-0" />
          <span className="text-[10px] uppercase tracking-wide">{isClosed ? 'Fechado' : 'Bloqueado'}</span>
        </span>
      )}

      {/* Preview dinâmica: como os cards ficarão após o drop */}
      {showPreview && (
        <div
          className="absolute inset-0 flex items-center px-1 gap-1 pointer-events-none"
          aria-hidden="true"
        >
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

          {/* Badge com número total de cards */}
          {totalCards > MAX_CARDS_WITHOUT_BADGE && (
            <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-in zoom-in duration-150">
              {totalCards}
            </div>
          )}

          {/* Dica "Solte aqui" sobre o preview */}
          <div className="absolute bottom-0.5 left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-[9px] font-medium text-primary/90 bg-background/80 dark:bg-background/90 px-1.5 py-0.5 rounded shadow-sm animate-in fade-in duration-200">
              Solte aqui
            </span>
          </div>
        </div>
      )}

      {/* Drop target sem preview - indicador "Solte aqui" */}
      {(isDraggingOver || isTargetActive) && !showPreview && !isInvalidDrop && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-primary font-medium animate-in fade-in duration-150" aria-hidden="true">
          <Calendar className="h-5 w-5 text-primary/80" />
          <span className="text-xs">Solte aqui</span>
        </div>
      )}

      {/* Custom content (e.g., existing appointments) */}
      {children}

      {/* Botão + no hover - só quando não está em drag e slot disponível */}
      {!isBlocked && !isClosed && !isInvalidDrop && !isOver && !children && !showPreview && (
        <div className="absolute inset-x-0 mx-auto w-fit -top-2.5 z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 pointer-events-none" aria-hidden="true">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-200 ease-out group-hover/cell:scale-100 scale-90">
            <span className="text-sm leading-none">+</span>
          </div>
        </div>
      )}
    </div>
  );
}, droppableTimeSlotAreEqual);

DroppableTimeSlot.displayName = 'DroppableTimeSlot';
