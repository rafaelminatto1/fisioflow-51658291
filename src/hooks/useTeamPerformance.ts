/**
 * useTeamPerformance - Migrated to Neon/Workers
 */

import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { innovationsApi, organizationMembersApi, type StaffPerformanceRow } from "@/api/v2";

export type PerformancePeriod = "month" | "3months" | "6months" | "year" | "custom";
export type PerformanceMetric = "revenue" | "sessions" | "retention" | "satisfaction";

interface PerformanceFilters {
  period: PerformancePeriod;
  metric?: PerformanceMetric;
  startDate?: Date;
  endDate?: Date;
}

export interface TherapistPerformance {
  id: string;
  name: string;
  avatarUrl?: string;
  revenue: number;
  sessions: number;
  retentionRate: number;
  nps: number;
  score: number;
  rank: number;
}

interface MonthlyRevenue {
  month: string;
  [therapistName: string]: number | string;
}

interface RadarData {
  metric: string;
  [therapistName: string]: number | string;
}

interface RetentionByCategory {
  category: string;
  rate: number;
  total: number;
}

export interface TeamPerformanceMetrics {
  totalRevenue: number;
  averageTicket: number;
  retentionRate: number;
  averageNps: number;
  therapists: TherapistPerformance[];
  monthlyRevenue: MonthlyRevenue[];
  radarData: RadarData[];
  retentionByCategory: RetentionByCategory[];
  previousPeriodComparison: {
    revenueChange: number;
    sessionsChange: number;
    retentionChange: number;
  };
}

const getDateRange = (period: PerformancePeriod, startDate?: Date, endDate?: Date) => {
  const today = new Date();

  switch (period) {
    case "month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case "3months":
      return {
        start: startOfMonth(subMonths(today, 2)),
        end: endOfMonth(today),
      };
    case "6months":
      return {
        start: startOfMonth(subMonths(today, 5)),
        end: endOfMonth(today),
      };
    case "year":
      return { start: startOfYear(today), end: endOfYear(today) };
    case "custom":
      return {
        start: startDate ? startOfDay(startDate) : startOfMonth(today),
        end: endDate ? endOfDay(endDate) : endOfMonth(today),
      };
    default:
      return { start: startOfMonth(today), end: endOfMonth(today) };
  }
};

const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd");

const aggregateMetrics = (rows: StaffPerformanceRow[]) => ({
  revenue: rows.reduce((sum, row) => sum + Number(row.revenue_generated ?? 0), 0),
  sessions: rows.reduce((sum, row) => sum + Number(row.completed_appointments ?? 0), 0),
  retention: rows.reduce((sum, row) => {
    const newPatients = Number(row.new_patients ?? 0);
    const returningPatients = Number(row.returning_patients ?? 0);
    const total = newPatients + returningPatients;
    return sum + (total > 0 ? (returningPatients / total) * 100 : 0);
  }, 0),
});

export const useTeamPerformance = (filters: PerformanceFilters = { period: "month" }) => {
  return useQuery({
    queryKey: [
      "team-performance",
      filters.period,
      filters.startDate?.toISOString(),
      filters.endDate?.toISOString(),
    ],
    queryFn: async (): Promise<TeamPerformanceMetrics> => {
      const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);
      const periodLength = Math.max(1, differenceInCalendarDays(end, start) + 1);
      const previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - (periodLength - 1));

      const [membersRes, metricsRes, previousMetricsRes, sixMonthMetricsRes] = await Promise.all([
        organizationMembersApi.list({ limit: 200 }),
        innovationsApi.staffPerformance.list({
          startDate: toIsoDate(start),
          endDate: toIsoDate(end),
        }),
        innovationsApi.staffPerformance.list({
          startDate: toIsoDate(previousStart),
          endDate: toIsoDate(previousEnd),
        }),
        innovationsApi.staffPerformance.list({
          startDate: toIsoDate(startOfMonth(subMonths(new Date(), 5))),
          endDate: toIsoDate(endOfMonth(new Date())),
        }),
      ]);

      const members = (membersRes.data ?? []).filter(
        (member) => member.active && ["admin", "fisioterapeuta"].includes(member.role),
      );
      const currentRows = (metricsRes.data ?? []) as StaffPerformanceRow[];
      const previousRows = (previousMetricsRes.data ?? []) as StaffPerformanceRow[];
      const historyRows = (sixMonthMetricsRes.data ?? []) as StaffPerformanceRow[];

      const therapistMetrics: TherapistPerformance[] = members.map((member) => {
        const rows = currentRows.filter((row) => row.therapist_id === member.user_id);
        const revenue = rows.reduce((sum, row) => sum + Number(row.revenue_generated ?? 0), 0);
        const sessions = rows.reduce(
          (sum, row) => sum + Number(row.completed_appointments ?? 0),
          0,
        );
        const npsSource = rows.filter((row) => row.patient_satisfaction_avg != null);
        const nps =
          npsSource.length > 0
            ? Math.round(
                npsSource.reduce((sum, row) => sum + Number(row.patient_satisfaction_avg ?? 0), 0) /
                  npsSource.length,
              )
            : 0;
        const newPatients = rows.reduce((sum, row) => sum + Number(row.new_patients ?? 0), 0);
        const returningPatients = rows.reduce(
          (sum, row) => sum + Number(row.returning_patients ?? 0),
          0,
        );
        const retentionRate =
          newPatients + returningPatients > 0
            ? Math.round((returningPatients / (newPatients + returningPatients)) * 100)
            : 0;
        const normalizedRevenue = revenue / 10000;
        const normalizedSessions = sessions * 2;
        const score = Math.round(
          normalizedRevenue * 0.4 + normalizedSessions * 0.3 + retentionRate * 0.2 + nps * 0.1,
        );

        return {
          id: member.user_id,
          name: member.profiles?.full_name || member.profiles?.email || "Sem nome",
          revenue,
          sessions,
          retentionRate,
          nps,
          score,
          rank: 0,
        };
      });

      therapistMetrics.sort((a, b) => b.score - a.score);
      therapistMetrics.forEach((therapist, index) => {
        therapist.rank = index + 1;
      });

      const totalRevenue = therapistMetrics.reduce((sum, therapist) => sum + therapist.revenue, 0);
      const totalSessions = therapistMetrics.reduce(
        (sum, therapist) => sum + therapist.sessions,
        0,
      );
      const averageTicket = totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0;
      const averageNps =
        therapistMetrics.length > 0
          ? Math.round(
              therapistMetrics.reduce((sum, therapist) => sum + therapist.nps, 0) /
                therapistMetrics.length,
            )
          : 0;

      const totalNewPatients = currentRows.reduce(
        (sum, row) => sum + Number(row.new_patients ?? 0),
        0,
      );
      const totalReturningPatients = currentRows.reduce(
        (sum, row) => sum + Number(row.returning_patients ?? 0),
        0,
      );
      const overallRetentionRate =
        totalNewPatients + totalReturningPatients > 0
          ? Math.round((totalReturningPatients / (totalNewPatients + totalReturningPatients)) * 100)
          : 0;

      const monthlyRevenue: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthRows = historyRows.filter((row) => String(row.metric_date).startsWith(monthKey));
        const monthData: MonthlyRevenue = {
          month: format(monthDate, "MMM", { locale: ptBR }),
        };

        therapistMetrics.slice(0, 5).forEach((therapist) => {
          monthData[therapist.name] = monthRows
            .filter((row) => row.therapist_id === therapist.id)
            .reduce((sum, row) => sum + Number(row.revenue_generated ?? 0), 0);
        });

        monthlyRevenue.push(monthData);
      }

      const maxRevenue = Math.max(...therapistMetrics.map((therapist) => therapist.revenue), 1);
      const maxSessions = Math.max(...therapistMetrics.map((therapist) => therapist.sessions), 1);

      const radarData: RadarData[] = [
        { metric: "Receita" },
        { metric: "Sessões" },
        { metric: "Retenção" },
        { metric: "NPS" },
      ];

      therapistMetrics.slice(0, 4).forEach((therapist) => {
        radarData[0][therapist.name] = Math.round((therapist.revenue / maxRevenue) * 100);
        radarData[1][therapist.name] = Math.round((therapist.sessions / maxSessions) * 100);
        radarData[2][therapist.name] = therapist.retentionRate;
        radarData[3][therapist.name] = therapist.nps;
      });

      const retentionByCategory: RetentionByCategory[] = [
        {
          category: "Equipe",
          rate: overallRetentionRate,
          total: totalNewPatients + totalReturningPatients,
        },
      ];

      const currentAggregate = aggregateMetrics(currentRows);
      const previousAggregate = aggregateMetrics(previousRows);
      const pct = (current: number, previous: number) =>
        previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

      return {
        totalRevenue,
        averageTicket,
        retentionRate: overallRetentionRate,
        averageNps,
        therapists: therapistMetrics,
        monthlyRevenue,
        radarData,
        retentionByCategory,
        previousPeriodComparison: {
          revenueChange: pct(currentAggregate.revenue, previousAggregate.revenue),
          sessionsChange: pct(currentAggregate.sessions, previousAggregate.sessions),
          retentionChange: pct(currentAggregate.retention, previousAggregate.retention),
        },
      };
    },
    refetchInterval: 120000,
  });
};
