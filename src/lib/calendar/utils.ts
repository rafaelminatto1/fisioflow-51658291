/**
 * Funções utilitárias centralizadas para calendário
 * @module calendar/utils
 */

import {
  format,
  parseISO,
  startOfDay,
  isSameDay,
  differenceInMinutes,
  addMinutes,
  isValid
} from 'date-fns';
import { BUSINESS_HOURS, DEFAULT_LIST_HEIGHT, SLOT_HEIGHT } from './constants';

// =====================================================================
// NORMALIZAÇÃO E PARSING
// =====================================================================

/**
 * Normaliza uma string de tempo para formato HH:MM
 * @param time - String de tempo (pode ter segundos ou timezone)
 * @returns Tempo normalizado no formato HH:MM
 */
export function normalizeTime(time: string | null | undefined): string {
  if (!time || !time.trim()) return '00:00';
  return time.substring(0, 5);
}

/**
 * Parseia uma data de forma segura, lidando com strings ISO e objetos Date
 * @param date - Data como string ISO ou objeto Date
 * @returns Objeto Date ou null se inválido
 */
export function parseAppointmentDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;

  try {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Normaliza uma data para garantir consistência de timezone
 * Usa startOfDay para evitar problemas com offset de horário
 * @param date - Data para normalizar
 * @returns Data normalizada (meio-dia para evitar edge cases)
 */
export function normalizeDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Se a data veio como string ISO (ex: "2026-01-08"), interpretar como local
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  return startOfDay(d);
}

/**
 * Cria uma data local a partir de componentes, evitando problemas de timezone
 * @param year - Ano
 * @param month - Mês (0-11)
 * @param day - Dia
 * @returns Data local criada
 */
export function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0);
}

// =====================================================================
// CÁLCULOS DE TEMPO
// =====================================================================

/**
 * Calcula o horário de fim baseado no início e duração
 * @param date - Data do appointment
 * @param time - Horário de início (HH:MM)
 * @param duration - Duração em minutos
 * @returns Horário de fim no formato HH:MM
 */
export function calculateEndTime(date: string | Date, time: string, duration: number): string {
  const aptDate = parseAppointmentDate(date);
  if (!aptDate) return time;

  const [hours, minutes] = time.split(':').map(Number);
  const startDate = new Date(aptDate);
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = addMinutes(startDate, duration);
  const endHours = String(endDate.getHours()).padStart(2, '0');
  const endMinutes = String(endDate.getMinutes()).padStart(2, '0');

  return `${endHours}:${endMinutes}`;
}

/**
 * Arredonda um horário para o próximo slot disponível
 * @param date - Data para arredondar
 * @param slotDuration - Duração do slot em minutos (padrão: 30)
 * @returns Horário arredondado no formato HH:MM
 */
export function roundToNextSlot(date: Date, slotDuration: number = BUSINESS_HOURS.DEFAULT_SLOT_DURATION): string {
  const minutes = date.getMinutes();
  const roundedMinutes = minutes < slotDuration ? slotDuration : 0;
  let hour = minutes < slotDuration ? date.getHours() : date.getHours() + 1;

  if (hour >= BUSINESS_HOURS.END) {
    hour = BUSINESS_HOURS.START;
  } else if (hour < BUSINESS_HOURS.START) {
    hour = BUSINESS_HOURS.START;
  }

  return `${String(hour).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
}

/**
 * Calcula a diferença em minutos entre dois horários
 * @param startTime - Horário de início (HH:MM)
 * @param endTime - Horário de fim (HH:MM)
 * @returns Diferença em minutos
 */
export function getTimeDifferenceInMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  return endTotalMinutes - startTotalMinutes;
}

/**
 * Verifica se um horário está dentro do horário comercial
 * @param time - Horário para verificar (HH:MM)
 * @returns True se estiver dentro do horário comercial
 */
export function isWithinBusinessHours(time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  const startMinutes = BUSINESS_HOURS.START * 60;
  const endMinutes = BUSINESS_HOURS.END * 60;

  return totalMinutes >= startMinutes && totalMinutes < endMinutes;
}

// =====================================================================
// CÁLCULOS DE POSICIONAMENTO
// =====================================================================

/**
 * Calcula a posição vertical de um horário no grid
 * @param time - Horário no formato HH:MM
 * @returns Posição em pixels a partir do topo
 */
export function calculateTimePosition(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutesFromStart = (hours - BUSINESS_HOURS.START) * 60 + minutes;
  return (totalMinutesFromStart / BUSINESS_HOURS.DEFAULT_SLOT_DURATION) * SLOT_HEIGHT;
}

/**
 * Calcula a altura de um appointment baseado na duração
 * @param duration - Duração em minutos
 * @returns Altura em pixels
 */
export function calculateAppointmentHeight(duration: number): number {
  return (duration / BUSINESS_HOURS.DEFAULT_SLOT_DURATION) * SLOT_HEIGHT;
}

/**
 * Encontra o índice de um horário na lista de slots
 * @param time - Horário para encontrar
 * @param timeSlots - Lista de horários disponíveis
 * @returns Índice ou -1 se não encontrado
 */
export function findTimeSlotIndex(time: string, timeSlots: string[]): number {
  return timeSlots.findIndex(t => t === time);
}

// =====================================================================
// VALIDAÇÕES
// =====================================================================

/**
 * Verifica se um horário é válido
 * @param time - String de tempo para validar
 * @returns True se o formato for válido
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * Verifica se duas datas/horas representam o mesmo momento
 * @param date1 - Primeira data
 * @param time1 - Primeiro horário
 * @param date2 - Segunda data
 * @param time2 - Segundo horário
 * @returns True se representarem o mesmo momento
 */
export function isSameDateTime(
  date1: Date | string,
  time1: string,
  date2: Date | string,
  time2: string
): boolean {
  const d1 = parseAppointmentDate(date1);
  const d2 = parseAppointmentDate(date2);

  if (!d1 || !d2) return false;

  return isSameDay(d1, d2) && time1 === time2;
}

// =====================================================================
// FORMATAÇÃO
// =====================================================================

/**
 * Formata uma data para exibição em português
 * @param date - Data para formatar
 * @param formatString - String de formatação do date-fns
 * @returns Data formatada
 */
export function formatDatePT(date: Date | string, formatString: string = "dd/MM/yyyy"): string {
  const d = parseAppointmentDate(date);
  if (!d) return '';
  return format(d, formatString);
}

/**
 * Formata um horário para exibição
 * @param time - Horário no formato HH:MM
 * @returns Horário formatado (ex: "14:30")
 */
export function formatTime(time: string): string {
  return normalizeTime(time);
}

/**
 * Formata um intervalo de tempo para exibição
 * @param date - Data
 * @param startTime - Horário de início
 * @param duration - Duração em minutos
 * @returns Intervalo formatado (ex: "14:00 - 15:00")
 */
export function formatTimeRange(date: Date | string, startTime: string, duration: number): string {
  const endTime = calculateEndTime(date, startTime, duration);
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

// =====================================================================
// UTILITÁRIOS DE GRID
// =====================================================================

/**
 * Calcula as dimensões do grid de calendário
 * @param timeSlots - Lista de horários
 * @returns Objeto com altura e número de linhas
 */
export function calculateGridDimensions(timeSlots: string[]) {
  return {
    height: timeSlots.length * SLOT_HEIGHT,
    rows: timeSlots.length,
    slotHeight: SLOT_HEIGHT,
  };
}

/**
 * Calcula a altura visível do calendário
 * @param containerHeight - Altura do container
 * @param headerHeight - Altura do header
 * @returns Altura visível em pixels
 */
export function calculateVisibleHeight(
  containerHeight: number = DEFAULT_LIST_HEIGHT,
  headerHeight: number = 60
): number {
  return Math.max(containerHeight - headerHeight, MIN_LIST_HEIGHT);
}

/**
 * Calcula quantos slots são visíveis dada uma altura
 * @param height - Altura disponível
 * @returns Número de slots visíveis
 */
export function calculateVisibleSlots(height: number): number {
  return Math.ceil(height / SLOT_HEIGHT) + 2; // +2 para buffer
}

// =====================================================================
// EXPORTS
// =====================================================================

export const calendarUtils = {
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
};
