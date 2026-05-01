import { useQueryClient } from "@tanstack/react-query";
import {
  differenceInDays,
  isValid,
  parseISO,
  startOfDay,
  subMonths,
  subDays,
} from "date-fns";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
  todayYMD,
  toLocalYMD,
  startOfLocalWeek,
  endOfLocalWeek,
  startOfLocalMonth,
  parseLocalDate,
} from "@/lib/date-utils";
import { PatientRow, AppointmentRow } from "@/types/workers";
import { ViewMode, SmartDashboardData } from "./types";
import { useDashboardQueries } from "./useDashboardQueries";
import { useDashboardMetrics } from "./useDashboardMetrics";
import { DEFAULT_MEDICAL_RETURN_DAYS, isBirthdayToday } from "./utils";

export function useSmartDashboardData(viewMode: ViewMode = "today") {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const now = useMemo(() => new Date(), []);
  const todayStr = todayYMD();
  const startCurrentMonth = startOfLocalMonth(todayStr);
  const startCurrentMonthDate = parseLocalDate(startCurrentMonth);
  const startLastMonthDate = parseLocalDate(startOfLocalMonth(toLocalYMD(subMonths(now, 1))));
  const endLastMonthDate = parseLocalDate(toLocalYMD(subDays(startCurrentMonthDate, 1)));
  const thirtyDaysAgo = toLocalYMD(subMonths(now, 1));
  const weekStart = startOfLocalWeek(todayStr);
  const weekEnd = endOfLocalWeek(todayStr);

  const primaryDateFrom =
    viewMode === "week" ? weekStart : viewMode === "month" ? startCurrentMonth : todayStr;
  const primaryDateTo = viewMode === "week" ? weekEnd : todayStr;

  const dates = {
    now,
    todayStr,
    thirtyDaysAgo,
    weekStart,
    weekEnd,
    startCurrentMonth,
    startCurrentMonthDate,
    startLastMonthDate,
    endLastMonthDate,
    primaryDateFrom,
    primaryDateTo,
  };

  const queries = useDashboardQueries(organizationId, dates, viewMode);

  const patients = queries.patientsQuery.data ?? [];
  const therapists = queries.therapistsQuery.data ?? [];
  const appointmentsToday = queries.appointmentsTodayQuery.data ?? [];
  const appointments30d = queries.appointments30dQuery.data ?? [];
  const appointmentsWeek = queries.appointmentsWeekQuery.data ?? [];
  const appointmentsMonth = queries.appointmentsMonthQuery.data ?? [];
  const contas = queries.contasQuery.data ?? [];
  const gamificationStats = queries.gamificationStatsQuery.data ?? null;
  const atRiskPatientsRaw = queries.atRiskPatientsQuery.data ?? [];
  const analyticsDashboard = queries.analyticsDashboardQuery.data ?? null;
  const predictions = queries.predictionsQuery.data ?? [];
  const forecasts = queries.forecastsQuery.data ?? [];
  const staffPerformance = queries.staffPerformanceQuery.data ?? [];
  const selfAssessments = queries.selfAssessmentsQuery.data ?? [];
  const notifications = queries.notificationsQuery.data ?? [];

  const metrics = useDashboardMetrics({
    appointmentsToday,
    appointments30d,
    appointmentsWeek,
    patients,
    therapists,
    contas,
    gamificationStats,
    atRiskPatients: atRiskPatientsRaw,
    analyticsDashboard,
    selfAssessments,
    forecasts,
    dates,
  });

  const birthdaysToday = useMemo(
    () => patients.filter((p) => isBirthdayToday(p.birth_date)),
    [patients],
  );

  const staffBirthdaysToday = useMemo(
    () => therapists.filter((t) => isBirthdayToday(t.birth_date)),
    [therapists],
  );

  const medicalReturnsUpcoming = useMemo(() => {
    const todayStart = startOfDay(now);
    return patients
      .filter((p) => {
        const rawDate = p.medical_return_date;
        if (!rawDate) return false;
        const date = parseISO(rawDate);
        if (!isValid(date)) return false;
        const days = differenceInDays(startOfDay(date), todayStart);
        return days >= 0 && days <= DEFAULT_MEDICAL_RETURN_DAYS;
      })
      .sort((a, b) => new Date(a.medical_return_date!).getTime() - new Date(b.medical_return_date!).getTime());
  }, [patients, now]);

  const isLoading = Object.values(queries).some((q) => q.isLoading);

  return {
    data: {
      metrics,
      predictions,
      medicalReturnsUpcoming,
      forecasts,
      staffPerformance,
      selfAssessments,
      notifications,
      birthdaysToday,
      staffBirthdaysToday,
      viewMode,
      patients,
      appointmentsToday,
      appointmentsWeek,
      appointmentsMonth,
      atRiskPatients: atRiskPatientsRaw.map((p) => ({
        ...p,
        name: p.patient_name || p.name,
        days_since_last: p.days_since_last ?? p.days_inactive ?? p.daysInactive ?? 0,
        risk_score: p.risk_score ?? p.level ?? 0,
      })),
      analyticsDashboard,
    } as SmartDashboardData,
    mutations: {
      generateSummary: async ({
        patients,
        appointments,
      }: {
        patients: PatientRow[];
        appointments: AppointmentRow[];
      }) => {
        try {
          if (patients.length > 0) {
            return (
              "Resumo inteligente gerado com base nos dados atuais: " +
              `${patients.length} pacientes ativos e ${appointments.length} agendamentos hoje.`
            );
          }
          return "Resumo não disponível no momento.";
        } catch (error) {
          logger.error("Error in generateSummary mutation", { error }, "useSmartDashboard");
          return "Erro ao gerar resumo.";
        }
      },
    },
    isLoading,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  };
}
