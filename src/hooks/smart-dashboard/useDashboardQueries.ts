import { useQuery } from "@tanstack/react-query";
import { innovationsApi } from "@/api/v2";
import { appointmentsApi } from "@/api/v2/appointments";
import { type Notification, notificationsApi } from "@/api/v2/communications";
import { financialApi } from "@/api/v2/financial";
import { gamificationApi } from "@/api/v2/gamification";
import { analyticsApi } from "@/api/v2/insights";
import { patientsApi } from "@/api/v2/patients";
import { profileApi } from "@/api/v2/system";
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
  PatientRow,
  TherapistSummary,
  AppointmentRow,
  ContaFinanceira,
  Pagamento,
  GamificationStats,
  AtRiskPatient,
  DashboardResponse,
  PatientPrediction,
  RevenueForecast,
  StaffPerformanceMetric,
  PatientSelfAssessment,
} from "@/types/workers";
import { ViewMode } from "./types";

export function useDashboardQueries(organizationId: string | null, dates: any, viewMode: ViewMode) {
  const { todayStr, thirtyDaysAgo, weekStart, weekEnd, startCurrentMonth, primaryDateFrom, primaryDateTo } = dates;

  const patientsQuery = useQuery({
    queryKey: ["dashboard-patients"],
    queryFn: async () => {
      try {
        const res = await patientsApi.list({ limit: 200, minimal: true });
        return (res?.data ?? []) as PatientRow[];
      } catch (error) {
        logger.error("Error loading patients", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const therapistsQuery = useQuery({
    queryKey: ["dashboard-therapists"],
    queryFn: async () => {
      try {
        const res = await profileApi.listTherapists();
        return (res?.data ?? []) as TherapistSummary[];
      } catch (error) {
        logger.error("Error loading therapists", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const appointmentsTodayQuery = useQuery({
    queryKey: ["dashboard-appointments-primary", primaryDateFrom, primaryDateTo],
    queryFn: async () => {
      try {
        const res = await appointmentsApi.list({
          dateFrom: primaryDateFrom,
          dateTo: primaryDateTo,
          limit: 1000,
        });
        return (res?.data ?? []) as AppointmentRow[];
      } catch (error) {
        logger.error("Error loading appointments", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });

  const appointments30dQuery = useQuery({
    queryKey: ["dashboard-appointments-30d", thirtyDaysAgo, todayStr],
    queryFn: async () => {
      try {
        const res = await appointmentsApi.list({
          dateFrom: thirtyDaysAgo,
          dateTo: todayStr,
          limit: 1000,
        });
        return (res?.data ?? []) as AppointmentRow[];
      } catch (error) {
        logger.error("Error loading 30d appointments", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const appointmentsWeekQuery = useQuery({
    queryKey: ["dashboard-appointments-week", weekStart, weekEnd],
    queryFn: async () => {
      try {
        const res = await appointmentsApi.list({
          dateFrom: weekStart,
          dateTo: weekEnd,
          limit: 1000,
        });
        return (res?.data ?? []) as AppointmentRow[];
      } catch (error) {
        logger.error("Error loading week appointments", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const appointmentsMonthQuery = useQuery({
    queryKey: ["dashboard-appointments-month", startCurrentMonth, todayStr],
    queryFn: async () => {
      try {
        const res = await appointmentsApi.list({
          dateFrom: startCurrentMonth,
          dateTo: todayStr,
          limit: 1000,
        });
        return (res?.data ?? []) as AppointmentRow[];
      } catch (error) {
        logger.error("Error loading month appointments", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10,
  });

  const contasQuery = useQuery({
    queryKey: ["dashboard-contas"],
    queryFn: async () => {
      try {
        const res = await financialApi.contas.list({
          tipo: "receita",
          status: "pago",
          limit: 1000,
        });
        return (res?.data ?? []) as ContaFinanceira[];
      } catch (error) {
        logger.error("Error loading contas", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const gamificationStatsQuery = useQuery({
    queryKey: ["dashboard-gamification-stats"],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getAdminStats();
        return res?.data as GamificationStats;
      } catch (error) {
        logger.error("Error loading gamification stats", { error }, "useSmartDashboard");
        return null;
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const atRiskPatientsQuery = useQuery({
    queryKey: ["dashboard-at-risk-patients"],
    queryFn: async () => {
      try {
        const res = await gamificationApi.getAtRiskPatients();
        return (res?.data ?? []) as AtRiskPatient[];
      } catch (error) {
        logger.error("Error loading at-risk patients", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const analyticsDashboardQuery = useQuery({
    queryKey: ["dashboard-analytics-insights"],
    queryFn: async () => {
      try {
        const res = await analyticsApi.dashboard({ period: viewMode });
        return res as DashboardResponse;
      } catch (error) {
        logger.error("Error loading analytics insights", { error }, "useSmartDashboard");
        return null;
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const predictionsQuery = useQuery({
    queryKey: ["dashboard-predictions"],
    queryFn: async () => {
      try {
        const res = await innovationsApi.appointmentPredictions.list({ limit: 50 });
        return res?.data ?? [];
      } catch (error) {
        logger.error("Error loading predictions", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const forecastsQuery = useQuery({
    queryKey: ["dashboard-forecasts"],
    queryFn: async () => {
      try {
        const res = await innovationsApi.revenueForecasts.list({ limit: 90 });
        return res?.data ?? [];
      } catch (error) {
        logger.error("Error loading forecasts", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const staffPerformanceQuery = useQuery({
    queryKey: ["dashboard-staff-performance"],
    queryFn: async () => {
      try {
        const res = await innovationsApi.staffPerformance.list();
        return res?.data ?? [];
      } catch (error) {
        logger.error("Error loading staff performance", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const selfAssessmentsQuery = useQuery({
    queryKey: ["dashboard-self-assessments"],
    queryFn: async () => {
      try {
        const res = await innovationsApi.patientSelfAssessments.list({ limit: 100 });
        return res?.data ?? [];
      } catch (error) {
        logger.error("Error loading self assessments", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });

  const notificationsQuery = useQuery({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => {
      try {
        const res = await notificationsApi.list();
        return (res?.data ?? []) as Notification[];
      } catch (error) {
        logger.error("Error loading notifications", { error }, "useSmartDashboard");
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1,
  });

  return {
    patientsQuery,
    therapistsQuery,
    appointmentsTodayQuery,
    appointments30dQuery,
    appointmentsWeekQuery,
    appointmentsMonthQuery,
    contasQuery,
    gamificationStatsQuery,
    atRiskPatientsQuery,
    analyticsDashboardQuery,
    predictionsQuery,
    forecastsQuery,
    staffPerformanceQuery,
    selfAssessmentsQuery,
    notificationsQuery,
  };
}
