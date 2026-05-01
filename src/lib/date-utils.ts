/**
 * date-utils.ts — Safe date parsing for BRT (UTC-3) environment.
 *
 * Problem: new Date("2026-05-10") parses as UTC midnight, then displays as
 * 2026-05-09T21:00:00 in BRT, causing appointments to appear on the wrong day.
 * Solution: always construct dates at local noon to avoid DST/TZ boundary issues.
 */

import { format, isValid, parseISO, startOfDay, endOfDay, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Get the start of the week (Monday) for a given YYYY-MM-DD string.
 */
export function startOfLocalWeek(ymd: string): string {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return "";
  return toLocalYMD(startOfWeek(d, { weekStartsOn: 1 }));
}

/**
 * Get the end of the week (Sunday) for a given YYYY-MM-DD string.
 */
export function endOfLocalWeek(ymd: string): string {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return "";
  return toLocalYMD(endOfWeek(d, { weekStartsOn: 1 }));
}

/**
 * Get the start of the month for a given YYYY-MM-DD string.
 */
export function startOfLocalMonth(ymd: string): string {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return "";
  const result = new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0);
  return toLocalYMD(result);
}

/**
 * Get the end of the month for a given YYYY-MM-DD string.
 */
export function endOfLocalMonth(ymd: string): string {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return "";
  const result = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12, 0, 0);
  return toLocalYMD(result);
}

/**
 * Parse a YYYY-MM-DD string as a local date (not UTC).
 * Equivalent to what the server intends: "this calendar date in the user's TZ".
 */
export function parseLocalDate(ymd: string): Date {
  if (!ymd || typeof ymd !== "string") return new Date(NaN);
  const parts = ymd.split("-");
  if (parts.length !== 3) return new Date(NaN);
  const [y, m, d] = parts.map(Number);
  // Use noon to survive DST transitions near midnight
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Parse a YYYY-MM-DD and HH:mm into a local Date.
 */
export function parseLocalDT(ymd: string, hm: string): Date {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return new Date(NaN);
  const [h, m] = hm.split(":").map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0);
}

/**
 * Format a Date to YYYY-MM-DD in local timezone.
 * Safe replacement for date.toISOString().split("T")[0] which uses UTC.
 */
export function toLocalYMD(date: Date): string {
  if (!date || !isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * Get today's date string in YYYY-MM-DD (local TZ).
 * Safe replacement for new Date().toISOString().split("T")[0].
 */
export function todayYMD(): string {
  return toLocalYMD(new Date());
}

/**
 * Check if a YYYY-MM-DD string represents today.
 */
export function isToday(ymd: string): boolean {
  return ymd === todayYMD();
}

/**
 * Format a date for display in pt-BR.
 * @example formatDisplayDate("2026-05-10") → "10 de maio de 2026"
 */
export function formatDisplayDate(ymd: string, fmt = "dd 'de' MMMM 'de' yyyy"): string {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return ymd;
  return format(d, fmt, { locale: ptBR });
}

/**
 * Format a date for short display.
 * @example formatShortDate("2026-05-10") → "10/05/2026"
 */
export function formatShortDate(ymd: string): string {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return ymd;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format a date for weekday + day display.
 * @example formatWeekdayDate("2026-05-10") → "Dom, 10/05"
 */
export function formatWeekdayDate(ymd: string): string {
  const d = parseLocalDate(ymd);
  if (!isValid(d)) return ymd;
  return format(d, "EEE, dd/MM", { locale: ptBR });
}

/**
 * Format a Date using a date-fns format string with pt-BR locale.
 * Alias used as formatBRT to signal intent (local display, not UTC).
 */
export function formatBRT(date: Date, fmt: string): string {
  if (!date || !isValid(date)) return "";
  return format(date, fmt, { locale: ptBR });
}

/**
 * Add N days to a YYYY-MM-DD string, returning a new YYYY-MM-DD.
 */
export function addDaysToYMD(ymd: string, n: number): string {
  return toLocalYMD(addDays(parseLocalDate(ymd), n));
}

/**
 * Subtract N days from a YYYY-MM-DD string, returning a new YYYY-MM-DD.
 */
export function subDaysFromYMD(ymd: string, n: number): string {
  return toLocalYMD(subDays(parseLocalDate(ymd), n));
}

/**
 * Get the start of a day as a Date object (local TZ).
 * Useful for range queries.
 */
export function startOfLocalDay(ymd: string): Date {
  return startOfDay(parseLocalDate(ymd));
}

/**
 * Get the end of a day as a Date object (local TZ).
 */
export function endOfLocalDay(ymd: string): Date {
  return endOfDay(parseLocalDate(ymd));
}

/**
 * Parse an ISO timestamp string and return YYYY-MM-DD in local TZ.
 * Safe for appointment.created_at, appointment.updated_at etc.
 */
export function isoToLocalYMD(iso: string): string {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? toLocalYMD(d) : "";
}

/**
 * Compare two YYYY-MM-DD strings.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareYMD(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Check if a date string is within a range (inclusive).
 */
export function isInRange(ymd: string, from: string, to: string): boolean {
  return ymd >= from && ymd <= to;
}

/**
 * Get month string (YYYY-MM) from a YYYY-MM-DD string.
 */
export function toYearMonth(ymd: string): string {
  return ymd.slice(0, 7);
}

/**
 * Build a range of YYYY-MM-DD strings between start and end (inclusive).
 */
export function dateRange(from: string, to: string): string[] {
  const result: string[] = [];
  let current = from;
  while (current <= to) {
    result.push(current);
    current = addDaysToYMD(current, 1);
  }
  return result;
}
