/**
 * useAnalyticsSummary - Migrated to Neon/Workers
 *
 */

import { useQuery } from "@tanstack/react-query";
import { differenceInDays, subDays } from "date-fns";
import { formatDateToLocalISO } from "@/utils/dateUtils";
import { queryConfigs } from "@/lib/queryConfig";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentsApi, type AppointmentRow } from "@/api/v2";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";

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
  const { filters } = useAnalyticsFilters();
  const { dateRange, professionalId } = filters;

  const {
    data: summary,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analytics-summary", organizationId, dateRange, professionalId],
    enabled: !!organizationId && !!dateRange?.from && !!dateRange?.to,
    queryFn: async () => {
      if (!organizationId || !dateRange?.from || !dateRange?.to) return defaultSummary;

      const currentFrom = dateRange.from;
      const currentTo = dateRange.to;

      // Calcular período anterior com a mesma duração
      const durationDays = differenceInDays(currentTo, currentFrom) + 1;
      const lastFrom = subDays(currentFrom, durationDays);
      const lastTo = subDays(currentTo, durationDays);

      try {
        const [currentApts, lastApts] = await Promise.all([
          fetchAppointmentsForRange(currentFrom, currentTo, professionalId),
          fetchAppointmentsForRange(lastFrom, lastTo, professionalId),
        ]);

        return calculateStats(currentApts, lastApts);
      } catch (err) {
        logger.error("Erro ao carregar analytics summary", err, "useAnalyticsSummary");
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

function calculateStats(
  currentAppointments: AppointmentRow[],
  lastAppointments: AppointmentRow[],
): AnalyticsSummary {
  const totalSlots = 160;
  const currentCount = currentAppointments.length;
  const lastCount = lastAppointments.length;

  const activePatientsSet = new Set(
    currentAppointments.map((apt) => apt.patient_id).filter(Boolean),
  );
  const lastPatientsSet = new Set(lastAppointments.map((apt) => apt.patient_id).filter(Boolean));

  const monthlyRev = currentAppointments
    .filter((apt) => apt.payment_status === "pago")
    .reduce((sum, apt) => sum + Number(apt.payment_amount ?? 0), 0);

  const lastRev = lastAppointments
    .filter((apt) => apt.payment_status === "pago")
    .reduce((sum, apt) => sum + Number(apt.payment_amount ?? 0), 0);

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

const fetchAppointmentsForRange = async (start: Date, end: Date, therapistId?: string) => {
  const res = await appointmentsApi.list({
    dateFrom: formatDateToLocalISO(start),
    dateTo: formatDateToLocalISO(end),
    therapistId: therapistId === "all" ? undefined : therapistId,
    limit: 1000,
  });
  return (res?.data ?? []) as AppointmentRow[];
};
