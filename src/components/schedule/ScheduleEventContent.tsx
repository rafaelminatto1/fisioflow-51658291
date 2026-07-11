import React from "react";
import { AlertTriangle, CheckCircle, Clock, XCircle, UserCheck } from "lucide-react";

export interface ScheduleEventColors {
  background: string;
  accent: string;
  text: string;
}

export interface ScheduleEventContentProps {
  title: string;
  timeText: string;
  isAllDay?: boolean;
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
  status?: string;
  theme?: string;
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
  isAllDay: _isAllDay,
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
  status,
  theme = "status",
}: ScheduleEventContentProps) {
  const safeColors = colors || {
    background: "transparent",
    accent: "currentColor",
    text: "inherit",
  };

  let bgThemeColor = safeColors.background !== "transparent" ? safeColors.background : "hsl(var(--card))";
  let textThemeColor = safeColors.text;
  let accentThemeColor = safeColors.accent;

  if (theme === "pastel") {
    // Modify slightly or rely on external color maps, or just apply opacity
    bgThemeColor = safeColors.background !== "transparent" ? `color-mix(in srgb, ${safeColors.background} 40%, transparent)` : bgThemeColor;
    textThemeColor = "var(--tw-prose-body)"; // standard text
  } else if (theme === "vibrant") {
    bgThemeColor = safeColors.accent;
    textThemeColor = "#ffffff"; // usually vibrant needs white text
  } else if (theme === "monochrome") {
    bgThemeColor = "hsl(var(--secondary))";
    textThemeColor = "hsl(var(--secondary-foreground))";
    accentThemeColor = "hsl(var(--primary))";
  }

  const startTime = timeText ? timeText.split(/[-–]/)[0].trim() : "";
  const baseLabel = isTask ? "Tarefa" : isGroup ? "Grupo" : startTime || "Consulta";
  const metaLabel = isGroup ? `${baseLabel} · ${groupCount}` : baseLabel;

  const STATUS_LABELS: Record<string, string> = {
    CONFIRMED: "Confirmado",
    ATTENDED: "Compareceu",
    CANCELLED: "Cancelado",
    NO_SHOW: "Falta",
    PENDING: "Pendente",
  };
  const statusLabel = status ? STATUS_LABELS[status] || "Agendado" : "";

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden border-white shadow-sm transition-shadow duration-200 hover:shadow-md"
      style={{
        borderLeftColor: accentThemeColor,
        backgroundColor: bgThemeColor,
        color: textThemeColor,
        // CSS vars injetadas pelo useAgendaAppearance — refletem os sliders
        // de Fonte, Espaçamento e Opacidade na aba de Aparência.
        opacity: isSelected ? 0.9 : "var(--agenda-card-opacity, 1)" as unknown as number,
        fontSize: "calc(12px * var(--agenda-font-scale, 1))" as unknown as number,
        padding: "var(--agenda-card-padding, 0.25rem 0.5rem)",
        borderRadius: "var(--agenda-card-radius, 0.25rem)",
        borderWidth: "var(--agenda-border-width, 0)",
        borderLeftWidth: "var(--agenda-border-left-width, 4px)",
      } as React.CSSProperties}
    >
      {/* Linha 1: nome dominante */}
      <div className="flex items-start justify-between gap-1.5">
        <p
          className="fc-event-patient-name min-w-0 font-extrabold leading-tight text-slate-900 dark:text-white"
          style={{ fontFamily: "var(--font-display, Nunito, sans-serif)" }}
        >
          {title}
        </p>
      </div>

      {/* Linha 2: ícone de status + tipo + alerta de dor */}
      <div className="mt-auto flex items-center gap-1.5 pt-1 text-[10px] font-semibold opacity-70">
        <span
          className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full"
          style={{ color: accentThemeColor }}
          title={statusLabel}
        >
          {status === "CONFIRMED" ? (
            <CheckCircle className="h-3 w-3" />
          ) : status === "ATTENDED" ? (
            <UserCheck className="h-3 w-3" />
          ) : status === "CANCELLED" || status === "NO_SHOW" ? (
            <XCircle className="h-3 w-3" />
          ) : status === "PENDING" ? (
            <Clock className="h-3 w-3" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentThemeColor }} />
          )}
          {statusLabel && <span className="sr-only">{statusLabel}</span>}
        </span>
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
