import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TIME_LABEL_WIDTH = 20;

export function getTimeParts(
  time?: string,
  fallbackDate?: Date | string,
): { hour: number; minutes: number } {
  if (time) {
    const [rawHour, rawMinutes] = time.split(":");
    return {
      hour: Number.parseInt(rawHour ?? "0", 10) || 0,
      minutes: Number.parseInt(rawMinutes ?? "0", 10) || 0,
    };
  }

  const parsedDate = fallbackDate ? new Date(fallbackDate) : new Date();
  return {
    hour: parsedDate.getHours(),
    minutes: parsedDate.getMinutes(),
  };
}

export function formatAppointmentTime(time?: string, fallbackDate?: Date | string): string {
  const { hour, minutes } = getTimeParts(time, fallbackDate);
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatWeekdayLabel(date: Date): string {
  const formatted = format(date, "EEE", { locale: ptBR }).replace(/\.$/, "");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
