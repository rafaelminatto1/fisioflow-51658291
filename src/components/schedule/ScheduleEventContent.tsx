import { AlertTriangle } from "lucide-react";

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
  hasHighPain?: boolean;
  hasNoShowRisk?: boolean;
  durationLabel?: string;
  typeLabel?: string;
  phone?: string;
  show?: { duration: boolean; type: boolean; phone: boolean };
}

/**
 * Render React de um único evento do calendário. Mantido enxuto e
 * orientado a tokens para a renderização virtualizada do FullCalendar
 * continuar rápida mesmo com centenas de eventos.
 *
 * Hierarquia:
 * 1. Nome do paciente/tarefa — elemento dominante
 * 2. Horário (leve, alinhado à direita)
 * 3. Status (dot na cor do status) + tipo + alerta de dor
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
  hasHighPain,
  hasNoShowRisk,
  durationLabel,
  typeLabel,
  phone,
  show = { duration: true, type: true, phone: false },
}: ScheduleEventContentProps) {
  const safeColors = colors || {
    background: "transparent",
    accent: "currentColor",
    text: "inherit",
  };

  const startTime = timeText ? timeText.split(/[-–]/)[0].trim() : "";
  const baseLabel = isTask ? "Tarefa" : isGroup ? "Grupo" : startTime || "Consulta";
  const metaLabel = isGroup ? `${baseLabel} · ${groupCount}` : baseLabel;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-l-4 border-border/40 px-2 py-1 shadow-sm transition-shadow duration-200 hover:shadow-md"
      style={{
        borderLeftColor: safeColors.accent,
        backgroundColor:
          safeColors.background !== "transparent" ? safeColors.background : "hsl(var(--card))",
        color: safeColors.text,
        opacity: isSelected ? 0.9 : 1,
      }}
    >
      {/* Linha 1: nome dominante */}
      <div className="flex items-start justify-between gap-1.5">
        <p
          className="fc-event-patient-name min-w-0 text-[12px] font-extrabold leading-tight text-slate-900 dark:text-white"
          style={{ fontFamily: "var(--font-display, Nunito, sans-serif)" }}
        >
          {title}
        </p>
      </div>

      {/* Linha 2: dot de status + tipo + alerta de dor */}
      <div className="mt-auto flex items-center gap-1.5 pt-1 text-[10px] font-semibold opacity-70">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: safeColors.accent }}
          aria-hidden
        />
        <span className="min-w-0 truncate">{metaLabel}</span>
        {show.duration && durationLabel && (
          <span className="shrink-0 opacity-80">· {durationLabel}</span>
        )}
        {show.type && typeLabel && (
          <span className="min-w-0 truncate opacity-80">· {typeLabel}</span>
        )}
        {show.phone && phone && (
          <span className="shrink-0 tabular-nums opacity-70">· {phone}</span>
        )}
        {hasNoShowRisk && (
          <span
            className="ml-auto flex shrink-0 items-center gap-0.5 rounded bg-red-100 px-1 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            title="Paciente faltou nas duas últimas sessões registradas"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            Falta
          </span>
        )}
        {hasHighPain && (
          <span
            className="flex shrink-0 items-center gap-0.5 rounded bg-red-100 px-1 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            title="Paciente relatou dor alta recentemente (>7)"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            Dor
          </span>
        )}
      </div>
    </div>
  );
}
