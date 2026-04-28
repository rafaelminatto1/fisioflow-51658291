/**
 * LiveViewPreview — Pré-visualização ao vivo de aparência por view
 *
 * Renderiza cards de exemplo com layout FullCalendar-like aplicando as CSS vars
 * derivadas dos valores de AgendaViewAppearance. Atualiza em tempo real sem debounce.
 *
 * CSS vars aplicadas:
 *   --agenda-card-font-scale: ${80 + (fontScale/10)*70}%
 *   --agenda-slot-height:     ${round(24 * (0.5 + (heightScale/10)*1.5))}px
 *   --agenda-card-opacity:    ${opacity/100}
 */

import { useMemo } from "react";
import type { AgendaViewAppearance, AgendaView } from "@/hooks/useAgendaAppearance";
import { cn } from "@/lib/utils";

interface LiveViewPreviewProps {
  appearance: AgendaViewAppearance;
  view: AgendaView;
}

interface ExampleEvent {
  time: string;
  title: string;
  subtitle: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
}

const EXAMPLE_EVENTS: ExampleEvent[] = [
  {
    time: "08:00",
    title: "Maria Santos",
    subtitle: "Drenagem Linfática",
    accentColor: "#3b82f6",
    bgColor: "#eff6ff",
    textColor: "#1e3a8a",
  },
  {
    time: "09:15",
    title: "João Silva",
    subtitle: "Avaliação Inicial",
    accentColor: "#10b981",
    bgColor: "#ecfdf5",
    textColor: "#064e3b",
  },
  {
    time: "10:30",
    title: "Ana Oliveira",
    subtitle: "Fisioterapia Ortopédica",
    accentColor: "#f59e0b",
    bgColor: "#fffbeb",
    textColor: "#78350f",
  },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeCssVars(appearance: AgendaViewAppearance): {
  fontPercentage: number;
  slotHeightPx: number;
  opacityValue: number;
} {
  const fontPercentage = 80 + (clamp(appearance.fontScale, 0, 10) / 10) * 70;
  const slotHeightPx = Math.round(24 * (0.5 + (clamp(appearance.heightScale, 0, 10) / 10) * 1.5));
  const opacityValue = clamp(appearance.opacity, 0, 100) / 100;
  return { fontPercentage, slotHeightPx, opacityValue };
}

export function LiveViewPreview({ appearance, view }: LiveViewPreviewProps) {
  const { fontPercentage, slotHeightPx, opacityValue } = useMemo(
    () => computeCssVars(appearance),
    [appearance],
  );

  // For month view, show a compact pill-style preview
  const isMonthView = view === "month";
  // For week view, show 2 events side by side
  const isWeekView = view === "week";

  const eventsToShow = isMonthView ? EXAMPLE_EVENTS.slice(0, 2) : EXAMPLE_EVENTS;

  return (
    <div
      className="relative rounded-xl border border-border/60 bg-muted/20 overflow-hidden"
      style={
        {
          "--agenda-card-font-scale": `${fontPercentage}%`,
          "--agenda-slot-height": `${slotHeightPx}px`,
          "--agenda-card-opacity": `${opacityValue}`,
        } as React.CSSProperties
      }
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent calc(var(--agenda-slot-height) - 1px), hsl(var(--border)) calc(var(--agenda-slot-height) - 1px), hsl(var(--border)) var(--agenda-slot-height))",
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/30">
        <div className="flex gap-1">
          {["Seg", "Ter", "Qua"].map((d) => (
            <div
              key={d}
              className="text-[9px] font-medium text-muted-foreground px-2 py-0.5 rounded"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="ml-auto text-[9px] text-muted-foreground font-mono">
          {view === "day" ? "Dia" : view === "week" ? "Semana" : "Mês"}
        </div>
      </div>

      {/* Events */}
      <div className={cn("p-2 space-y-1.5", isWeekView && "grid grid-cols-2 gap-1.5 space-y-0")}>
        {eventsToShow.map((event, i) => (
          <EventCard
            key={i}
            event={event}
            slotHeightPx={slotHeightPx}
            fontPercentage={fontPercentage}
            opacityValue={opacityValue}
            compact={isMonthView}
          />
        ))}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: ExampleEvent;
  slotHeightPx: number;
  fontPercentage: number;
  opacityValue: number;
  compact: boolean;
}

function EventCard({ event, slotHeightPx, fontPercentage, opacityValue, compact }: EventCardProps) {
  const minHeight = Math.max(slotHeightPx, 20);
  const baseFontSize = fontPercentage / 100;

  if (compact) {
    // Month view: pill style
    return (
      <div
        className="flex items-center gap-1.5 rounded-md px-2 py-0.5 overflow-hidden"
        style={{
          backgroundColor: event.bgColor,
          borderLeft: `3px solid ${event.accentColor}`,
          opacity: opacityValue,
          minHeight: `${Math.max(minHeight * 0.6, 16)}px`,
        }}
      >
        <span
          className="font-medium truncate"
          style={{
            fontSize: `${Math.max(9 * baseFontSize, 8)}px`,
            color: event.textColor,
          }}
        >
          {event.title}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      {/* Time label */}
      <div className="w-8 shrink-0 text-right pt-0.5">
        <span
          className="font-mono text-muted-foreground"
          style={{ fontSize: `${Math.max(8 * baseFontSize, 7)}px` }}
        >
          {event.time}
        </span>
      </div>

      {/* Event card */}
      <div
        className="flex-1 rounded-lg overflow-hidden flex flex-col justify-center px-2.5 transition-all duration-150"
        style={{
          backgroundColor: event.bgColor,
          borderLeft: `3px solid ${event.accentColor}`,
          opacity: opacityValue,
          minHeight: `${minHeight}px`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <span
          className="font-semibold leading-tight truncate"
          style={{
            fontSize: `${Math.max(10 * baseFontSize, 8)}px`,
            color: event.textColor,
          }}
        >
          {event.title}
        </span>
        {slotHeightPx >= 24 && (
          <span
            className="truncate opacity-70 leading-tight"
            style={{
              fontSize: `${Math.max(8 * baseFontSize, 7)}px`,
              color: event.textColor,
            }}
          >
            {event.subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
