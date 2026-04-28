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
      className="flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-sm"
      style={{
        background: safeColors.background,
        color: safeColors.text,
        opacity: isSelected ? 0.8 : 1,
        padding: "3px 5px",
        fontSize: "var(--agenda-card-font-scale, 0.75rem)",
        borderLeft: `2.5px solid ${safeColors.accent}`,
        borderRadius: "4px",
      }}
    >
      {/* Title: Patient name or task — dominates the card */}
      <div
        className="font-semibold leading-tight break-words line-clamp-2 text-[0.95em]"
        style={{ color: safeColors.text }}
      >
        {isTask ? title : title}
      </div>

      {/* Metadata: Time, group indicator */}
      {!isAllDay && (
        <div
          className="flex items-center gap-1 text-[0.8em] leading-none"
          style={{ color: safeColors.text, opacity: 0.85 }}
        >
          <Clock className="h-2.5 w-2.5 shrink-0 opacity-75" aria-hidden />
          <span className="truncate font-medium tabular-nums">{timeText}</span>
          {isGroup && (
            <span className="ml-auto flex items-center gap-0.5 text-[0.8em]" title={`Grupo: ${groupCount} participantes`}>
              <Users className="h-2.5 w-2.5 shrink-0" aria-hidden />
              <span className="font-medium">{groupCount ?? ""}</span>
            </span>
          )}
          {isTask && (
            <span className="ml-auto">
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
