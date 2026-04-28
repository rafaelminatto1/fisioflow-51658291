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

  return (
    <div
      className="flex h-full w-full flex-col gap-1 overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 p-3 shadow-lg shadow-slate-200/30 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-200/40 dark:border-slate-800/60 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-slate-900/80 dark:shadow-slate-950/30 dark:hover:shadow-slate-950/40"
      style={{
        color: safeColors.text,
        opacity: isSelected ? 0.88 : 1,
        fontSize: "var(--agenda-card-font-scale, 0.78rem)",
        background: safeColors.background || "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 50%, rgba(248,250,252,0.8) 100%)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full shadow-sm"
          style={{ background: safeColors.accent, boxShadow: `0 0 8px ${safeColors.accent}20` }}
        />
        <div className="min-w-0 text-[0.95rem] font-medium leading-tight text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-body, ui-sans-serif)' }}>
          {title}
        </div>
      </div>

      {!isAllDay && (
        <div className="flex flex-wrap items-center gap-2 text-[0.82rem] font-medium leading-none text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-100 to-slate-200/80 px-2.5 py-1 text-slate-700 shadow-sm dark:from-slate-800 dark:to-slate-700 dark:text-slate-200">
            <Clock className="h-3 w-3" aria-hidden />
            {timeText}
          </span>
          {isGroup && (
            <span
              className="flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-200/80 px-2.5 py-1 text-indigo-700 shadow-sm dark:from-indigo-800 dark:to-indigo-700 dark:text-indigo-200"
              title={`Grupo: ${groupCount} participantes`}
            >
              <Users className="h-3 w-3" aria-hidden />
              {groupCount ?? "-"}
            </span>
          )}
          {isTask && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-200/80 px-2.5 py-1 text-amber-700 shadow-sm dark:from-amber-800 dark:to-amber-700 dark:text-amber-200">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Tarefa
            </span>
          )}
        </div>
      )}
    </div>
  );
}
