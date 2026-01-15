/**
 * Hook customizado para gerenciar agrupamento de appointments
 * @module hooks/calendar/useAppointmentGroups
 */

import { useMemo, DependencyList } from 'react';
import { isSameDay, startOfDay, addDays } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { parseAppointmentDate, normalizeTime } from '@/lib/calendar/utils';

// =====================================================================
// TYPES
// =====================================================================

interface AppointmentGroup {
  /** Data do grupo */
  date: Date;
  /** Appointments neste dia */
  appointments: Appointment[];
}

interface AppointmentsByTimeSlot {
  [key: string]: Appointment[];
}

interface UseAppointmentGroupsResult {
  /** Appointments filtrados para o intervalo */
  filteredAppointments: Appointment[];
  /** Appointments agrupados por dia */
  appointmentsByDay: AppointmentGroup[];
  /** Appointments agrupados por time slot */
  appointmentsByTimeSlot: AppointmentsByTimeSlot;
  /** Contagem de appointments por dia */
  appointmentsCountByDay: Map<string, number>;
}

// =====================================================================
// HOOK
// =====================================================================

/**
 * Hook para gerenciar agrupamento e filtragem de appointments
 * @param appointments - Lista completa de appointments
 * @param weekStart - Início da semana
 * @param options - Opções adicionais
 * @returns Objeto com appointments agrupados
 */
export function useAppointmentGroups(
  appointments: Appointment[],
  weekStart: Date,
  options?: {
    /** Dependencies adicionais para recalcular */
    deps?: DependencyList;
  }
): UseAppointmentGroupsResult {
  const { deps = [] } = options || {};

  // Calcular dias da semana
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Filtrar appointments para a semana
  const filteredAppointments = useMemo(() => {
    const start = startOfDay(weekDays[0]);
    const end = startOfDay(addDays(weekDays[6], 1));

    return appointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate && aptDate >= start && aptDate < end;
    });
  }, [appointments, weekDays, ...deps]);

  // Agrupar por dia
  const appointmentsByDay = useMemo(() => {
    const groups: AppointmentGroup[] = weekDays.map(day => ({
      date: day,
      appointments: filteredAppointments.filter(apt => {
        const aptDate = parseAppointmentDate(apt.date);
        return aptDate && isSameDay(aptDate, day);
      }),
    }));

    return groups;
  }, [filteredAppointments, weekDays, ...deps]);

  // Agrupar por time slot
  const appointmentsByTimeSlot = useMemo(() => {
    const result: AppointmentsByTimeSlot = {};

    filteredAppointments.forEach(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      if (!aptDate) return;

      const dayIndex = weekDays.findIndex(d => isSameDay(d, aptDate));
      if (dayIndex === -1) return;

      const time = normalizeTime(apt.time);
      const key = `${dayIndex}-${time}`;

      if (!result[key]) result[key] = [];
      result[key].push(apt);
    });

    return result;
  }, [filteredAppointments, weekDays, ...deps]);

  // Contagem por dia
  const appointmentsCountByDay = useMemo(() => {
    const countMap = new Map<string, number>();

    appointmentsByDay.forEach(group => {
      const dateKey = group.date.toISOString();
      countMap.set(dateKey, group.appointments.length);
    });

    return countMap;
  }, [appointmentsByDay, ...deps]);

  return {
    filteredAppointments,
    appointmentsByDay,
    appointmentsByTimeSlot,
    appointmentsCountByDay,
  };
}

// =====================================================================
// HOOKS AUXILIARES
// =====================================================================

/**
 * Hook para obter appointments de um dia específico
 */
export function useDayAppointments(
  appointments: Appointment[],
  date: Date
): Appointment[] {
  return useMemo(() => {
    return appointments.filter(apt => {
      const aptDate = parseAppointmentDate(apt.date);
      return aptDate && isSameDay(aptDate, date);
    });
  }, [appointments, date]);
}

/**
 * Hook para verificar sobreposição de appointments
 */
export function useAppointmentOverlap(
  appointments: Appointment[]
): (newAppointment: { date: Date; time: string; duration: number }) => boolean {
  return useMemo(() => {
    return (newAppointment) => {
      const newStart = newAppointment.time;
      const newEnd = addMinutes(
        new Date(`${newAppointment.date}T${newStart}`),
        newAppointment.duration
      );

      return appointments.some(apt => {
        const aptDate = parseAppointmentDate(apt.date);
        if (!aptDate || !isSameDay(aptDate, newAppointment.date)) {
          return false;
        }

        const aptStart = apt.time;
        const aptEnd = addMinutes(
          new Date(`${apt.date}T${aptStart}`),
          apt.duration || 60
        );

        // Verificar sobreposição
        return (
          (newStart >= aptStart && newStart < aptEnd) ||
          (newEnd > aptStart && newEnd <= aptEnd) ||
          (newStart <= aptStart && newEnd >= aptEnd)
        );
      });
    };
  }, [appointments]);
}

// =====================================================================
// EXPORTS
// =====================================================================

export default useAppointmentGroups;
