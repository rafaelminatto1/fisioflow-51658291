/**
 * Time helpers for the schedule calendar.
 *
 * Always keep calendar events in the clinic's LOCAL time zone. Never use
 * toISOString() or getUTCHours()/getUTCMinutes() in calendar code.
 */

/**
 * Build a `YYYY-MM-DDTHH:mm:ss` string from a date (`YYYY-MM-DD` or Date)
 * and a time (`HH:mm`), preserving the input as LOCAL wall-clock time.
 * The returned string is *not* UTC — it has no `Z` suffix and no offset.
 * FullCalendar parses it as local time, which is what we want.
 */
export function toLocalISOString(date: string | Date, time: string): string {
  const dateStr = date instanceof Date ? formatLocalDate(date) : date.slice(0, 10);
  const timeStr = time.length === 5 ? `${time}:00` : time;
  return `${dateStr}T${timeStr}`;
}

/** `YYYY-MM-DD` in local time (no UTC conversion). */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `HH:mm` in local time. */
export function formatLocalTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Round a Date down to the nearest `minutes`-minute boundary, in local time.
 * Used to snap drag-drop / click coordinates to 15-minute slots.
 */
export function roundDownToMinutes(date: Date, minutes = 15): Date {
  const ms = minutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

/** Minutes between two dates, floored. */
export function diffMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}
