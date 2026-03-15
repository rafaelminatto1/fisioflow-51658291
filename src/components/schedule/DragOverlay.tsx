import { DragOverlay } from '@dnd-kit/core';
import { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';
import { CARD_SIZE_CONFIGS } from '@/lib/config/agenda';
import { useCardSize } from '@/hooks/useCardSize';

const getStatusStyles = (status: string) => {
  const styles = {
    confirmado: {
      className: 'calendar-card-confirmado',
      accent: 'bg-emerald-600',
    },
    agendado: {
      className: 'calendar-card-agendado',
      accent: 'bg-sky-400',
    },
    em_andamento: {
      className: 'calendar-card-em_andamento',
      accent: 'bg-amber-600',
    },
    cancelado: {
      className: 'calendar-card-cancelado',
      accent: 'bg-red-600',
    },
    falta: {
      className: 'calendar-card-cancelado',
      accent: 'bg-red-700',
    },
    concluido: {
      className: 'calendar-card-concluido',
      accent: 'bg-teal-600',
    },
    avaliacao: {
      className: 'calendar-card-avaliacao',
      accent: 'bg-violet-600',
    },
    default: {
      className: 'calendar-card-agendado',
      accent: 'bg-slate-600',
    }
  };
  return styles[status as keyof typeof styles] || styles.default;
};

const normalizeTime = (time: string | null | undefined): string => {
  if (!time || !time.trim()) return '00:00';
  return time.substring(0, 5);
};

interface CalendarDragOverlayProps {
  activeAppointment: Appointment | null;
}

/**
 * Enhanced DragOverlay component for @dnd-kit drag and drop.
 * Shows a visually accurate preview of the appointment being dragged,
 * matching the exact appearance of CalendarAppointmentCard.
 */
export function CalendarDragOverlay({ activeAppointment }: CalendarDragOverlayProps) {
  const { cardSize, fontPercentage } = useCardSize();
  const sizeConfig = CARD_SIZE_CONFIGS[cardSize];
  const fontScale = fontPercentage / 100;

  if (!activeAppointment) return null;

  const statusStyles = getStatusStyles(activeAppointment.status);
  const duration = activeAppointment.duration || 60;
  const isSmall = duration <= 30;

  // Calculate scaled font sizes to match the actual card
  const scaledTimeFontSize = Math.round(sizeConfig.timeFontSize * fontScale);
  const scaledNameFontSize = Math.max(14, Math.round(sizeConfig.nameFontSize * fontScale));
  const scaledTypeFontSize = Math.round(sizeConfig.typeFontSize * fontScale);

  // Calculate height to match the actual card (but with a min/max for overlay)
  const baseHeight = Math.max(48, Math.min(80, duration * 0.8));

  return (
    <DragOverlay dropAnimation={null}>
      <div
        className={cn(
          "calendar-appointment-card border rounded-lg shadow-2xl pointer-events-none scale-105 opacity-90",
          "flex flex-col overflow-hidden",
          statusStyles.className
        )}
        style={{
          minWidth: '220px',
          maxWidth: '280px',
          minHeight: `${baseHeight}px`,
          zIndex: 9999
        }}
      >
        <div
          className={cn(
            "flex flex-col h-full relative",
            isSmall ? "p-2" : "p-3"
          )}
        >
          {/* Header: Time & Status */}
          <div className="flex items-center justify-between gap-2 mb-1 w-full">
            <div className="flex items-center gap-2 min-w-0">
              {/* Accent Bar */}
              <div className={cn("w-1 h-3 rounded-full shrink-0 bg-white/40", statusStyles.accent)} />

              <span
                className={cn(
                  "font-mono font-bold truncate leading-none tracking-tight text-white",
                )}
                style={{ fontSize: `${Math.max(11, scaledTimeFontSize)}px` }}
              >
                {normalizeTime(activeAppointment.time)}
              </span>
            </div>
          </div>

          {/* Patient Name */}
          <div className="flex flex-col min-h-0 w-full">
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  "block font-bold leading-tight line-clamp-2 text-white",
                )}
                style={{ fontSize: `${Math.max(12, scaledNameFontSize)}px` }}
              >
                {activeAppointment.patientName}
              </span>
            </div>
          </div>

          {/* Type (if space permits) */}
          {sizeConfig.showType && activeAppointment.type && (
            <div className={cn(
              "truncate opacity-80 font-medium mt-1 text-white/90"
            )}
            style={{ fontSize: `${Math.max(10, scaledTypeFontSize)}px` }}
            >
              {activeAppointment.type}
            </div>
          )}
        </div>
      </div>
    </DragOverlay>
  );
}
