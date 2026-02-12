/**
 * Shared Appointment Utilities
 *
 * @description
 * Common utility functions used across all appointment card variants
 *
 * @module components/schedule/shared/utils
 */

/**
 * Get initials from a name
 *
 * @param name - Full name
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Uppercase initials
 *
 * @example
 * ```ts
 * getInitials('João Silva') // 'JS'
 * getInitials('Maria') // 'M'
 * getInitials('Pedro de Souza Santos') // 'PS'
 * ```
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return '??';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}

/**
 * Normalize time string to HH:MM format
 *
 * @param time - Time string (can be null, undefined, or various formats)
 * @returns Normalized time in HH:MM format
 *
 * @example
 * ```ts
 * normalizeTime('14:30:00') // '14:30'
 * normalizeTime('9:5') // '09:05'
 * normalizeTime(null) // '00:00'
 * normalizeTime('') // '00:00'
 * ```
 */
export function normalizeTime(time: string | null | undefined): string {
  if (!time || !time.trim()) return '00:00';
  return time.substring(0, 5);
}

/**
 * Calculate end time based on start time and duration
 *
 * @param startTime - Start time in HH:MM format
 * @param durationMinutes - Duration in minutes
 * @returns End time in HH:MM format
 *
 * @example
 * ```ts
 * calculateEndTime('14:00', 60) // '15:00'
 * calculateEndTime('09:30', 45) // '10:15'
 * calculateEndTime('23:30', 45) // '00:15'
 * ```
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;

  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Format duration in human-readable format
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 *
 * @example
 * ```ts
 * formatDuration(60) // '1h'
 * formatDuration(90) // '1h 30min'
 * formatDuration(30) // '30min'
 * ```
 */
export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
}

/**
 * Check if an appointment is in the past
 *
 * @param date - Appointment date (YYYY-MM-DD format)
 * @param time - Appointment time (HH:MM format)
 * @returns True if appointment is in the past
 */
export function isPastAppointment(date: string, time: string): boolean {
  const appointmentDateTime = new Date(`${date}T${time}`);
  return appointmentDateTime < new Date();
}

/**
 * Check if an appointment is today
 *
 * @param date - Appointment date (YYYY-MM-DD format)
 * @returns True if appointment is today
 */
export function isToday(date: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return date === today;
}

/**
 * Get appointment type label
 *
 * @param type - Appointment type
 * @returns Formatted type label
 */
export function formatAppointmentType(type: string): string {
  const typeLabels: Record<string, string> = {
    avaliacao: 'Avaliação',
    consulta: 'Consulta',
    sessao: 'Sessão',
    retorno: 'Retorno',
    'primeira-consulta': 'Primeira Consulta',
  };
  return typeLabels[type.toLowerCase()] || type || 'Particular';
}
/**
 * Get relative time from now
 * 
 * @param date - Date in YYYY-MM-DD format
 * @param time - Time in HH:MM format
 * @returns Relative time string (e.g., 'daqui a 15 min', 'há 10 min')
 */
export function getRelativeTime(date: string, time: string): string {
  if (!date || !time) return '';

  const appointmentTime = new Date(`${date}T${time}:00`);
  const now = new Date();
  const diffInMs = appointmentTime.getTime() - now.getTime();
  const diffInMinutes = Math.round(diffInMs / (1000 * 60));

  if (Math.abs(diffInMinutes) < 1) return 'agora';

  if (diffInMinutes > 0) {
    if (diffInMinutes >= 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `daqui a ${hours}h`;
    }
    return `daqui a ${diffInMinutes} min`;
  } else {
    const absMinutes = Math.abs(diffInMinutes);
    if (absMinutes >= 60) {
      const hours = Math.floor(absMinutes / 60);
      return `há ${hours}h`;
    }
    return `há ${absMinutes} min atrás`;
  }
}

/**
 * Check if an appointment is currently ongoing
 */
export function isAppointmentOngoing(date: string, time: string, duration: number): boolean {
  if (!date || !time || !duration) return false;

  const startTime = new Date(`${date}T${time}:00`);
  const endTime = new Date(startTime.getTime() + duration * 60000);
  const now = new Date();

  return now >= startTime && now <= endTime;
}

/**
 * Get appointment progress percentage
 */
export function getAppointmentProgress(date: string, time: string, duration: number): number {
  if (!date || !time || !duration) return 0;

  const startTime = new Date(`${date}T${time}:00`);
  const now = new Date();
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 60000;

  const progress = Math.min(Math.max((elapsedMinutes / duration) * 100, 0), 100);
  return Math.round(progress);
}
