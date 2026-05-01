import { Clock, Users, CheckCircle2 } from "lucide-react";

export interface ScheduleEventColors {
  background: string;
  accent: string;
  text: string;
}

export interface ScheduleEventContentProps {
  title: string;
  timeText: string;
  isAllDay: boolean;
  isGroup: boolean;
  groupCount?: number;
  isTask: boolean;
  colors: ScheduleEventColors;
  isSelected: boolean;
}

/**
 * React render for a single calendar event. Kept small and style-token-driven
 * so FullCalendar's virtualized render stays fast even with hundreds of events.
 *
 * Hierarchy:
 * 1. Title (patient/task name) — most prominent
 * 2. Time + group/task badges
 */
export function ScheduleEventContent({
  title,
  timeText,
  isAllDay,
  isGroup,
  groupCount,
  isTask,
  colors,
  isSelected,
}: ScheduleEventContentProps) {
  const safeColors = colors || {
    background: "transparent",
    accent: "currentColor",
    text: "inherit",
  };

  const typeLabel = isTask ? "Tarefa" : isGroup ? "Grupo" : "Consulta";

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border-l-4 border border-slate-200/40 p-2 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800/40"
      style={{
        borderLeftColor: safeColors.accent,
        backgroundColor: safeColors.background !== "transparent" ? safeColors.background : "rgba(255,255,255,0.95)",
        color: safeColors.text,
        opacity: isSelected ? 0.88 : 1,
      }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span 
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: safeColors.accent }}
        >
          {typeLabel}
        </span>
        {!isAllDay && (
          <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
            <Clock className="h-3 w-3" aria-hidden />
            <span>{timeText}</span>
          </div>
        )}
      </div>

      <p className="truncate text-[13px] font-bold leading-tight text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display, Inter, sans-serif)' }}>
        {title}
      </p>

      {(isGroup || isTask) && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold opacity-60">
          {isGroup ? (
            <>
              <Users className="h-3 w-3" aria-hidden />
              <span>{groupCount} participantes</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              <span>Tarefa Clínica</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
