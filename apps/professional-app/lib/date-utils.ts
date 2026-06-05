import { format, isValid } from "date-fns";

/**
 * Utilitários de data seguros para timezone (espelham `src/lib/date-utils.ts` do web).
 * Evitam o bug de `toISOString().split("T")[0]`, que usa UTC.
 */

/**
 * Parse de uma string YYYY-MM-DD como data local (não UTC).
 * Usa meio-dia para sobreviver a transições de DST próximas à meia-noite.
 */
export function parseLocalDate(ymd: string): Date {
  if (!ymd || typeof ymd !== "string") return new Date(NaN);
  const parts = ymd.split("-");
  if (parts.length !== 3) return new Date(NaN);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Formata uma Date para YYYY-MM-DD no timezone local.
 */
export function toLocalYMD(date: Date): string {
  if (!date || !isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * Data de hoje em YYYY-MM-DD (TZ local).
 */
export function todayYMD(): string {
  return toLocalYMD(new Date());
}

/**
 * Formata uma Date para envio à API (YYYY-MM-DD, TZ local).
 */
export function formatDateForAPI(date: Date): string {
  return toLocalYMD(date);
}
