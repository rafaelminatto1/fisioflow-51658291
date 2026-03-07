/**
 * useAnalyticsSummary - Migrated to Neon/Workers
 *
 */

import { useQuery } from '@tanstack/react-query';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { queryConfigs } from '@/lib/queryConfig';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsApi, type AppointmentRow } from '@/lib/api/workers-client';

interface AnalyticsSummary {
  totalAppointments: number;
  appointmentGrowth: number;
  activePatients: number;
  patientGrowth: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  occupancyRate: number;
}

export function useAnalyticsSummary() {
  const { organizationId } = useAuth();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['analytics-summary', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return defaultSummary;

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      try {
        const [currentApts, lastApts] = await Promise.all([
          fetchAppointmentsForRange(currentMonthStart, currentMonthEnd),
          fetchAppointmentsForRange(lastMonthStart, lastMonthEnd),
        ]);

        return calculateStats(currentApts, lastApts);
      } catch (err) {
        logger.error('Erro ao carregar analytics summary', err, 'useAnalyticsSummary');
        return defaultSummary;
      }
    },
    ...queryConfigs.dynamic,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    summary: summary || defaultSummary,
    isLoading,
    error,
  };
}

const defaultSummary: AnalyticsSummary = {
  totalAppointments: 0,
  appointmentGrowth: 0,
  activePatients: 0,
  patientGrowth: 0,
  monthlyRevenue: 0,
  revenueGrowth: 0,
  occupancyRate: 0,
};

function calculateStats(currentAppointments: AppointmentRow[], lastAppointments: AppointmentRow[]): AnalyticsSummary {
  const totalSlots = 160;
  const currentCount = currentAppointments.length;
  const lastCount = lastAppointments.length;

  const activePatientsSet = new Set(
    currentAppointments.map((apt) => apt.patient_id).filter(Boolean)
  );
  const lastPatientsSet = new Set(
    lastAppointments.map((apt) => apt.patient_id).filter(Boolean)
  );

  const monthlyRev = currentAppointments
    .filter((apt) => apt.payment_status === 'pago')
    .reduce((sum, apt) => sum + (Number(apt.payment_amount ?? 0)), 0);

  const lastRev = lastAppointments
    .filter((apt) => apt.payment_status === 'pago')
    .reduce((sum, apt) => sum + (Number(apt.payment_amount ?? 0)), 0);

  return {
    totalAppointments: currentCount,
    appointmentGrowth: lastCount ? Math.round(((currentCount - lastCount) / lastCount) * 100) : 0,
    activePatients: activePatientsSet.size,
    patientGrowth: lastPatientsSet.size
      ? Math.round(((activePatientsSet.size - lastPatientsSet.size) / lastPatientsSet.size) * 100)
      : 0,
    monthlyRevenue: monthlyRev,
    revenueGrowth: lastRev ? Math.round(((monthlyRev - lastRev) / lastRev) * 100) : 0,
    occupancyRate: Math.min(Math.round((currentCount / totalSlots) * 100), 100),
  };
}

const fetchAppointmentsForRange = async (start: Date, end: Date) => {
  const res = await appointmentsApi.list({
    dateFrom: formatDateToLocalISO(start),
    dateTo: formatDateToLocalISO(end),
    limit: 3000,
  });
  return (res?.data ?? []) as AppointmentRow[];
};
