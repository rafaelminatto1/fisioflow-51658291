/**
 * Módulo de calendário - Exportações centralizadas
 * @module lib/calendar
 *
 * Este módulo fornece uma API completa para gerenciamento de calendários,
 * agendamentos e visualização de dados temporais.
 *
 * @example
 * ```ts
 * import { normalizeTime, calculateEndTime, BUSINESS_HOURS } from '@/lib/calendar';
 *
 * const time = normalizeTime('14:30:00');
 * const endTime = calculateEndTime('2026-01-15', time, 60);
 * ```
 */

// =====================================================================
// IMPORTS (para uso interno)
// =====================================================================


// =====================================================================
// EXPORTS DE MÓDULOS
// =====================================================================

import { BUSINESS_HOURS, SLOT_HEIGHT, DEFAULT_LIST_HEIGHT, VIEW_TYPES, STATUS_COLORS } from './constants';
import { normalizeTime, calculateEndTime, formatTime } from './utils';

export * from './constants';
export * from './types';
export * from './utils';

// =====================================================================
// REEXPORTS ORGANIZADOS - CONSTANTS
// =====================================================================

export {
  BUSINESS_HOURS,
  SLOT_HEIGHT,
  MIN_LIST_HEIGHT,
  DEFAULT_LIST_HEIGHT,
  VIEW_TYPES,
  WEEKDAY_NAMES,
  WEEKDAY_NAMES_SHORT,
  MONTH_NAMES,
  DRAG_SNAP_THRESHOLD,
  DRAG_PREVIEW_OFFSET_Y,
  STATUS_COLORS,
  KEYBOARD_SHORTCUTS,
} from './constants';

export type { ViewType, StatusColorKey, WeekDayIndex } from './constants';

// =====================================================================
// REEXPORTS ORGANIZADOS - UTILS
// =====================================================================

export {
  normalizeTime,
  parseAppointmentDate,
  normalizeDate,
  createLocalDate,
  calculateEndTime,
  roundToNextSlot,
  getTimeDifferenceInMinutes,
  isWithinBusinessHours,
  calculateTimePosition,
  calculateAppointmentHeight,
  findTimeSlotIndex,
  isValidTimeFormat,
  isSameDateTime,
  formatDatePT,
  formatTime,
  formatTimeRange,
  calculateGridDimensions,
  calculateVisibleHeight,
  calculateVisibleSlots,
  calendarUtils,
} from './utils';

// =====================================================================
// HELPER FUNCTIONS ADICIONAIS
// =====================================================================

/**
 * Cria um range de datas
 */
export function createDateRange(start: Date, days: number): { start: Date; end: Date } {
  return {
    start,
    end: new Date(start.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

/**
 * Verifica se duas datas são o mesmo dia
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Verifica se uma data está dentro de um range
 */
export function isDateInRange(date: Date, range: { start: Date; end: Date }): boolean {
  return date >= range.start && date <= range.end;
}

/**
 * Calcula a diferença em dias entre duas datas
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Alias para createDateRange
 */
export const getDateRange = createDateRange;

/**
 * Gera slots de tempo para um dia
 */
export function generateTimeSlots(startHour: number, endHour: number, slotDuration: number): string[] {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += slotDuration) {
      slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }
  return slots;
}

/**
 * Converte minutos para formato HH:MM
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converte HH:MM para minutos
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Valida um horário no formato HH:MM
 */
export function isValidTime(time: string): boolean {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/**
 * Calcula a sobreposição de dois intervalos de tempo
 */
export function calculateTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): number {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  const overlapStart = Math.max(s1, s2);
  const overlapEnd = Math.min(e1, e2);

  return Math.max(0, overlapEnd - overlapStart);
}

/** Duração padrão de um agendamento em minutos (usada quando não informada). */
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60;

/** Item com horário e duração para cálculo de sobreposição (ex.: Appointment). */
export interface AppointmentLike {
  id: string;
  /** Horário de início no formato HH:MM (aceita HH:MM:SS). */
  time?: string | null;
  /** Duração em minutos. */
  duration?: number;
}

/**
 * Converte horário de um item para minutos desde meia-noite.
 * @internal
 */
function appointmentTimeToMinutes(apt: AppointmentLike): number {
  const raw = apt.time && apt.time.trim() ? apt.time.substring(0, 5) : '00:00';
  return timeToMinutes(raw);
}

/**
 * Verifica se dois appointments se sobrepõem no tempo (considerando duração).
 * Ex.: 08:30 (60 min) e 09:00 (60 min) se sobrepõem entre 09:00 e 09:30.
 */
export function appointmentsOverlap(
  a: AppointmentLike,
  b: AppointmentLike
): boolean {
  const duration = (x: number | undefined) => x ?? DEFAULT_APPOINTMENT_DURATION_MINUTES;
  const aStart = appointmentTimeToMinutes(a);
  const aEnd = aStart + duration(a.duration);
  const bStart = appointmentTimeToMinutes(b);
  const bEnd = bStart + duration(b.duration);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Retorna índice e quantidade de appointments que se sobrepõem no tempo com o dado,
 * ordenados por horário de início. Usado para dimensionar cards lateralmente (lado a lado).
 *
 * @param sameDayAppointments - Lista de agendamentos do mesmo dia (ex.: filtrados por data).
 * @param appointment - Agendamento para o qual obter a posição no grupo de sobreposição.
 * @returns `{ index, count }`: index é a posição (0-based) entre os que se sobrepõem; count é o total.
 *          count é sempre >= 1 para evitar divisão por zero nos consumidores.
 *
 * @example
 * // Dia com 08:30 (60 min) e 09:00 (60 min) → ambos se sobrepõem
 * getOverlapStackPosition(dayAppointments, apt0830) // { index: 0, count: 2 }
 * getOverlapStackPosition(dayAppointments, apt0900) // { index: 1, count: 2 }
 */
export function getOverlapStackPosition(
  sameDayAppointments: AppointmentLike[],
  appointment: AppointmentLike
): { index: number; count: number } {
  const overlapping = sameDayAppointments.filter((other) =>
    appointmentsOverlap(appointment, other)
  );
  overlapping.sort((x, y) => appointmentTimeToMinutes(x) - appointmentTimeToMinutes(y));
  const index = overlapping.findIndex((a) => a.id === appointment.id);
  const count = Math.max(1, overlapping.length);
  return {
    index: index >= 0 ? index : 0,
    count,
  };
}

// =====================================================================
// ALIASES PARA COMPATIBILIDADE
// =====================================================================

export { formatTime as formatAppointmentTime, isWithinBusinessHours as isTimeSlotAvailable } from './utils';

// =====================================================================
// FACTORY FUNCTIONS
// =====================================================================

/**
 * Cria filtros padrão para calendário
 */
export function createDefaultFilters() {
  return {
    status: [],
    types: [],
    therapists: [],
  };
}

/**
 * Cria configurações padrão para visualização
 */
export function createDefaultViewSettings() {
  return {
    viewType: 'week' as const,
    currentDate: new Date(),
    zoomLevel: 1,
    showWeekends: true,
    showBlockedSlots: false,
    startHour: BUSINESS_HOURS.START,
    endHour: BUSINESS_HOURS.END,
  };
}

/**
 * Cria estado de drag inicial
 */
export function createInitialDragState() {
  return {
    appointment: null,
    isDragging: false,
  };
}

/**
 * Cria estado de seleção inicial
 */
export function createInitialSelectionState() {
  return {
    selectedIds: new Set<string>(),
    isSelectionMode: false,
  };
}

// =====================================================================
// API NAMESPACE
// =====================================================================

export const CalendarAPI = {
  version: '1.0.0',
  constants: {
    BUSINESS_HOURS,
    SLOT_HEIGHT,
    DEFAULT_LIST_HEIGHT,
    VIEW_TYPES,
    STATUS_COLORS,
  },
  utils: {
    normalizeTime,
    calculateEndTime,
    formatTime,
    generateTimeSlots,
  },
} as const;

export type CalendarAPI = typeof CalendarAPI;

// =====================================================================
// EXPORT PADRÃO
// =====================================================================

export default {
  BUSINESS_HOURS,
  SLOT_HEIGHT,
  VIEW_TYPES,
  STATUS_COLORS,
  normalizeTime,
  calculateEndTime,
  formatTime,
  generateTimeSlots,
  createDateRange,
  isSameDay,
  isDateInRange,
  daysBetween,
  isValidTime,
  minutesToTime,
  timeToMinutes,
  calculateTimeOverlap,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  appointmentsOverlap,
  getOverlapStackPosition,
  createDefaultFilters,
  createDefaultViewSettings,
  createInitialDragState,
  createInitialSelectionState,
};
