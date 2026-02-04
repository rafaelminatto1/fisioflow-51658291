/**
 * Hook: pacientes com retorno médico próximo (para alerta no dashboard e relatório médico)
 */

import { useMemo } from 'react';
import { useActivePatients } from '@/hooks/usePatients';
import { startOfDay, differenceInDays, parseISO, isValid } from 'date-fns';

export interface PatientMedicalReturn {
  id: string;
  name: string;
  full_name?: string;
  medical_return_date: string;
  referring_doctor_name?: string;
  referring_doctor_phone?: string;
  medical_report_done?: boolean;
  medical_report_sent?: boolean;
}

const DEFAULT_DAYS_AHEAD = 14;

/**
 * Retorna pacientes que têm data de retorno médico nos próximos N dias.
 * Útil para mostrar no dashboard e lembrar de preparar o relatório médico.
 */
export function useMedicalReturnsUpcoming(daysAhead: number = DEFAULT_DAYS_AHEAD) {
  const { data: patients = [], isLoading, error } = useActivePatients();

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    const items: PatientMedicalReturn[] = [];

    for (const p of patients) {
      const raw = (p as Record<string, unknown>).medical_return_date ?? (p as Record<string, unknown>).medicalReturnDate;
      if (!raw || typeof raw !== 'string') continue;

      const date = typeof raw === 'string' && raw.includes('T') ? parseISO(raw) : new Date(raw);
      if (!isValid(date)) continue;

      const dateOnly = startOfDay(date);
      const days = differenceInDays(dateOnly, today);
      if (days < 0 || days > daysAhead) continue;

      const name = (p as Record<string, unknown>).full_name ?? (p as Record<string, unknown>).name ?? '';
      items.push({
        id: (p as Record<string, unknown>).id as string,
        name: typeof name === 'string' ? name : '',
        full_name: (p as Record<string, unknown>).full_name as string | undefined,
        medical_return_date: raw,
        referring_doctor_name: (p as Record<string, unknown>).referring_doctor_name as string | undefined,
        referring_doctor_phone: (p as Record<string, unknown>).referring_doctor_phone as string | undefined,
        medical_report_done: (p as Record<string, unknown>).medical_report_done as boolean | undefined,
        medical_report_sent: (p as Record<string, unknown>).medical_report_sent as boolean | undefined,
      });
    }

    items.sort((a, b) => new Date(a.medical_return_date).getTime() - new Date(b.medical_return_date).getTime());
    return items;
  }, [patients, daysAhead]);

  return {
    data: upcoming,
    isLoading,
    error,
  };
}
