import { DragOverlay } from '@dnd-kit/core';
import { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';
import { CARD_SIZE_CONFIGS } from '@/lib/config/agenda';
import { useCardSize } from '@/hooks/useCardSize';

const getStatusStyles = (status: string) => {
  const styles = {
    confirmado: {
      border: 'border-emerald-500',
      bg: 'bg-emerald-50/95 dark:bg-emerald-500/20',
      hoverBg: 'hover:bg-emerald-100/95 dark:hover:bg-emerald-500/30',
      text: 'text-emerald-900 dark:text-emerald-400',
      subtext: 'text-emerald-800/90 dark:text-emerald-300/90',
      accent: 'bg-emerald-600',
      indicator: 'text-emerald-700'
    },
    agendado: {
      border: 'border-sky-300',
      bg: 'bg-sky-100/95 dark:bg-sky-200/30',
      hoverBg: 'hover:bg-sky-200/95 dark:hover:bg-sky-300/40',
      text: 'text-sky-900 dark:text-sky-300',
      subtext: 'text-sky-800/90 dark:text-sky-400/90',
      accent: 'bg-sky-400',
      indicator: 'text-sky-700'
    },
    em_andamento: {
      border: 'border-amber-500',
      bg: 'bg-amber-50/95 dark:bg-amber-500/20',
      hoverBg: 'hover:bg-amber-100/95 dark:hover:bg-amber-500/30',
      text: 'text-amber-900 dark:text-amber-400',
      subtext: 'text-amber-800/90 dark:text-amber-300/90',
      accent: 'bg-amber-600',
      indicator: 'text-amber-700'
    },
    cancelado: {
      border: 'border-red-500',
      bg: 'bg-red-50/95 dark:bg-red-500/20',
      hoverBg: 'hover:bg-red-100/95 dark:hover:bg-red-500/30',
      text: 'text-red-900 dark:text-red-400',
      subtext: 'text-red-800/90 dark:text-red-300/90',
      accent: 'bg-red-600',
      indicator: 'text-red-700'
    },
    falta: {
      border: 'border-red-500',
      bg: 'bg-red-50/95 dark:bg-red-500/20',
      hoverBg: 'hover:bg-red-100/95 dark:hover:bg-red-500/30',
      text: 'text-red-900 dark:text-red-400',
      subtext: 'text-red-800/90 dark:text-red-300/90',
      accent: 'bg-red-600',
      indicator: 'text-red-700'
    },
    concluido: {
      border: 'border-teal-500',
      bg: 'bg-teal-50/95 dark:bg-teal-500/20',
      hoverBg: 'hover:bg-teal-100/95 dark:hover:bg-teal-500/30',
      text: 'text-teal-900 dark:text-teal-400',
      subtext: 'text-teal-800/90 dark:text-teal-300/90',
      accent: 'bg-teal-600',
      indicator: 'text-teal-700'
    },
    avaliacao: {
      border: 'border-violet-500',
      bg: 'bg-violet-50/95 dark:bg-violet-500/20',
      hoverBg: 'hover:bg-violet-100/95 dark:hover:bg-violet-500/30',
      text: 'text-violet-900 dark:text-violet-400',
      subtext: 'text-violet-800/90 dark:text-violet-300/90',
      accent: 'bg-violet-600',
      indicator: 'text-violet-700'
    },
    default: {
      border: 'border-slate-500',
      bg: 'bg-slate-50/95 dark:bg-slate-500/20',
      hoverBg: 'hover:bg-slate-100/95 dark:hover:bg-slate-500/30',
      text: 'text-slate-900 dark:text-slate-300',
      subtext: 'text-slate-700/90 dark:text-slate-300/90',
      accent: 'bg-slate-600',
      indicator: 'text-slate-700'
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
    <DragOverlay>
      <div
        className={cn(
          "calendar-appointment-card bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border rounded-lg shadow-2xl pointer-events-none",
          "flex flex-col overflow-hidden",
          statusStyles.border,
          statusStyles.bg
        )}
        style={{
          minWidth: '180px',
          maxWidth: '240px',
          minHeight: `${baseHeight}px`,
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
              <div className={cn("w-1 h-3 rounded-full shrink-0 opacity-80", statusStyles.accent)} />

              <span
                className={cn(
                  "font-mono font-semibold truncate leading-none tracking-tight",
                  statusStyles.text,
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
                  "block font-bold leading-tight line-clamp-2",
                  statusStyles.text,
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
              "truncate opacity-70 font-medium mt-1",
              statusStyles.subtext
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
