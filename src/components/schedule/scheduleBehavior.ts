import type { AgendaDisplayOptions } from "@/types/agenda";

/**
 * Deriva as props de comportamento do FullCalendar a partir do bloco global `display`.
 * `hideSunday` → coluna de domingo oculta; `businessHours=false` desliga o sombreamento.
 */
export function deriveCalendarBehavior<T>(
  display: AgendaDisplayOptions,
  fcBusinessHours: T,
): { nowIndicator: boolean; businessHours: T | false; hiddenDays: number[] } {
  return {
    nowIndicator: display.nowIndicator,
    businessHours: display.businessHours ? fcBusinessHours : false,
    hiddenDays: display.hideSunday ? [0] : [],
  };
}
