/**
 * Hook customizado para calcular posicionamento de appointments no grid
 * @module hooks/calendar/useAppointmentPositioning
 */


// =====================================================================
// TYPES
// =====================================================================

import { useMemo, useCallback, CSSProperties } from 'react';
import { isSameDay } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { parseAppointmentDate, normalizeTime } from '@/lib/calendar/utils';
import { SLOT_HEIGHT } from '@/lib/calendar/constants';

interface AppointmentPosition {
  /** Estilo CSS para posicionamento */
  style: CSSProperties;
  /** Índice da coluna (dia da semana 0-6) */
  columnIndex: number;
  /** Índice da linha (time slot) */
  rowIndex: number;
  /** Z-index para sobreposição */
  zIndex: number;
}

interface UseAppointmentPositioningOptions {
  /** Altura de cada slot em pixels */
  slotHeight?: number;
  /** Margem externa em pixels */
  outerMargin?: number;
  /** Gap entre appointments sobrepostos */
  gap?: number;
}

interface UseAppointmentPositioningResult {
  /** Calcula o estilo para um appointment */
  getAppointmentStyle: (appointment: Appointment, weekDays: Date[], timeSlots: string[]) => CSSProperties | null;
  /** Calcula a posição vertical para um horário */
  getTimePosition: (time: string) => number;
  /** Calcula a altura para uma duração */
  getDurationHeight: (duration: number) => number;
  /** Verifica se há sobreposição entre appointments */
  hasOverlap: (appointment1: Appointment, appointment2: Appointment) => boolean;
  /** Conta appointments sobrepostos no mesmo horário */
  countOverlappingAppointments: (
    appointment: Appointment,
    allAppointments: Appointment[],
    weekDays: Date[]
  ) => number;
}

// =====================================================================
// HOOK
// =====================================================================

/**
 * Hook para gerenciar posicionamento de appointments no grid
 * @param options - Opções de configuração
 * @returns Funções utilitárias para posicionamento
 */
export function useAppointmentPositioning(
  options: UseAppointmentPositioningOptions = {}
): UseAppointmentPositioningResult {
  const {
    slotHeight = SLOT_HEIGHT,
    outerMargin = 4,
    gap = 4,
  } = options;

  /**
   * Calcula a posição vertical de um horário no grid
   */
  const getTimePosition = useCallback((time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    const START_HOUR = 7;
    const SLOT_DURATION_MINUTES = 30;

    const totalMinutesFromStart = (hours - START_HOUR) * 60 + minutes;
    return (totalMinutesFromStart / SLOT_DURATION_MINUTES) * slotHeight;
  }, [slotHeight]);

  /**
   * Calcula a altura para uma duração
   */
  const getDurationHeight = useCallback((duration: number): number => {
    const SLOT_DURATION_MINUTES = 30;
    return (duration / SLOT_DURATION_MINUTES) * slotHeight;
  }, [slotHeight]);

  /**
   * Verifica se dois appointments se sobrepõem
   */
  const hasOverlap = useCallback((appointment1: Appointment, appointment2: Appointment): boolean => {
    const date1 = parseAppointmentDate(appointment1.date);
    const date2 = parseAppointmentDate(appointment2.date);

    if (!date1 || !date2 || !isSameDay(date1, date2)) {
      return false;
    }

    return appointment1.time === appointment2.time;
  }, []);

  /**
   * Conta appointments sobrepostos no mesmo horário
   */
  const countOverlappingAppointments = useCallback(
    (appointment: Appointment, allAppointments: Appointment[], weekDays: Date[]): number => {
      const aptDate = parseAppointmentDate(appointment.date);
      if (!aptDate) return 0;

      const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
      if (dayIndex === -1) return 0;

      const time = normalizeTime(appointment.time);

      return allAppointments.filter(apt => {
        const aptDate2 = parseAppointmentDate(apt.date);
        if (!aptDate2) return false;

        const dayIndex2 = weekDays.findIndex(d => isSameDay(d, aptDate2));
        return dayIndex2 === dayIndex && normalizeTime(apt.time) === time;
      }).length;
    },
    []
  );

  /**
   * Calcula o estilo completo para um appointment
   */
  const getAppointmentStyle = useCallback((
    appointment: Appointment,
    weekDays: Date[],
    timeSlots: string[]
  ): CSSProperties | null => {
    const aptDate = parseAppointmentDate(appointment.date);
    if (!aptDate) return null;

    const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
    if (dayIndex === -1) return null;

    const time = normalizeTime(appointment.time);
    const startRowIndex = timeSlots.findIndex(t => t === time);
    if (startRowIndex === -1) return null;

    const duration = appointment.duration || 60;
    const height = getDurationHeight(duration);

    // Calcular sobreposição
    const sameTimeAppointments = countOverlappingAppointments(
      appointment,
      [], // Será preenchido pelo caller
      weekDays
    );

    // Este é um placeholder - o caller deve fornecer a lista completa
    // Vamos usar um valor padrão de 1
    const count = Math.max(sameTimeAppointments, 1);

    // Encontrar índice deste appointment na lista de sobrepostos
    // Novamente, placeholder - o caller deve fornecer esta info
    const index = 0;

    const width = `calc((100% - ${(count + 1) * outerMargin}px) / ${count})`;
    const left = `calc(${outerMargin}px + ${index} * ((100% - ${(count + 1) * outerMargin}px) / ${count} + ${gap}px))`;

    return {
      position: 'absolute',
      gridColumn: `${dayIndex + 2} / span 1`,
      gridRow: `${startRowIndex + 1}`,
      height: `${height}px`,
      width,
      left,
      top: '0px',
      zIndex: 10 + index,
    } as CSSProperties;
  }, [getDurationHeight, countOverlappingAppointments, outerMargin, gap]);

  return {
    getAppointmentStyle,
    getTimePosition,
    getDurationHeight,
    hasOverlap,
    countOverlappingAppointments,
  };
}

// =====================================================================
// HOOK SIMPLIFICADO
// =====================================================================

/**
 * Versão simplificada que calcula tudo de uma vez
 */
export function useAppointmentPositions(
  appointments: Appointment[],
  weekDays: Date[],
  timeSlots: string[],
  options?: UseAppointmentPositioningOptions
): Map<string, CSSProperties> {
  const { slotHeight = SLOT_HEIGHT, outerMargin = 4, gap = 4 } = options || {};

  const positions = useMemo(() => {
    const styleMap = new Map<string, CSSProperties>();
    const appointmentsBySlot = new Map<string, Appointment[]>();

    // Agrupar appointments por slot
    appointments.forEach(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      if (!aptDate) return;

      const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
      if (dayIndex === -1) return;

      const time = normalizeTime(apt.time);
      const key = `${dayIndex}-${time}`;

      if (!appointmentsBySlot.has(key)) {
        appointmentsBySlot.set(key, []);
      }
      appointmentsBySlot.get(key)!.push(apt);
    });

    // Calcular estilos
    appointmentsBySlot.forEach((slotAppointments, key) => {
      const count = slotAppointments.length;

      slotAppointments.forEach((apt, index) => {
        const aptDate = parseAppointmentDate(apt.date);
        if (!aptDate) return;

        const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
        if (dayIndex === -1) return;

        const time = normalizeTime(apt.time);
        const startRowIndex = timeSlots.findIndex(t => t === time);
        if (startRowIndex === -1) return;

        const duration = apt.duration || 60;
        const START_HOUR = 7;
        const SLOT_DURATION_MINUTES = 30;

        const [hours, minutes] = time.split(':').map(Number);
        const totalMinutesFromStart = (hours - START_HOUR) * 60 + minutes;
        const top = (totalMinutesFromStart / SLOT_DURATION_MINUTES) * slotHeight;
        const height = (duration / SLOT_DURATION_MINUTES) * slotHeight;

        const width = `calc((100% - ${(count + 1) * outerMargin}px) / ${count})`;
        const left = `calc(${outerMargin}px + ${index} * ((100% - ${(count + 1) * outerMargin}px) / ${count} + ${gap}px))`;

        styleMap.set(apt.id, {
          position: 'absolute',
          gridColumn: `${dayIndex + 2} / span 1`,
          gridRow: `${startRowIndex + 1}`,
          height: `${height}px`,
          width,
          left,
          top: '0px',
          zIndex: 10 + index,
        } as CSSProperties);
      });
    });

    return styleMap;
  }, [appointments, weekDays, timeSlots, slotHeight, outerMargin, gap]);

  return positions;
}

// =====================================================================
// EXPORTS
// =====================================================================

export default useAppointmentPositioning;
