import { useMemo } from "react";
import { subDaysFromYMD } from "@/lib/date-utils";
import { DashboardMetrics } from "./types";
import {
  isCompletedStatus,
  isCancelledStatus,
  isNoShowStatus,
  toDate,
  sumRevenue,
} from "./utils";
import {
  AppointmentRow,
  ContaFinanceira,
  PatientRow,
  TherapistSummary,
  GamificationStats,
  AtRiskPatient,
  DashboardResponse,
  RevenueForecast,
  PatientSelfAssessment,
} from "@/types/workers";

export function useDashboardMetrics(params: {
  appointmentsToday: AppointmentRow[];
  appointments30d: AppointmentRow[];
  appointmentsWeek: AppointmentRow[];
  patients: PatientRow[];
  therapists: TherapistSummary[];
  contas: ContaFinanceira[];
  gamificationStats: GamificationStats | null;
  atRiskPatients: AtRiskPatient[];
  analyticsDashboard: DashboardResponse | null;
  selfAssessments: PatientSelfAssessment[];
  forecasts: RevenueForecast[];
  dates: any;
}) {
  const {
    appointmentsToday,
    appointments30d,
    appointmentsWeek,
    patients,
    therapists,
    contas,
    gamificationStats,
    atRiskPatients,
    analyticsDashboard,
    selfAssessments,
    forecasts,
    dates,
  } = params;

  const {
    now,
    startCurrentMonthDate,
    startLastMonthDate,
    endLastMonthDate,
    weekEnd,
  } = dates;

  return useMemo<DashboardMetrics>(() => {
    const pacientesAtivosCount = new Set(
      appointments30d.filter((a) => !isCancelledStatus(a.status)).map((a) => a.patient_id),
    ).size;

    const agendamentosHoje = appointmentsToday.filter((a) => !isCancelledStatus(a.status)).length;

    const agendamentosConcluidos = appointmentsToday.filter((a) =>
      isCompletedStatus(a.status),
    ).length;

    const totalAppointments30d = appointments30d.filter((a) => !isCancelledStatus(a.status)).length;

    const noShowCount = appointments30d.filter((a) => isNoShowStatus(a.status)).length;

    const isDateInRange = (val: any, from: Date, to: Date) => {
      const d = toDate(val);
      return d ? d >= from && d <= to : false;
    };

    const receitaMensal = sumRevenue(
      contas.filter((r) =>
        isDateInRange(r.pago_em ?? r.data_vencimento, startCurrentMonthDate, now),
      ),
    );

    const receitaMesAnterior = sumRevenue(
      contas.filter((r) =>
        isDateInRange(r.pago_em ?? r.data_vencimento, startLastMonthDate, endLastMonthDate),
      ),
    );

    const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const tendenciaSemanal = weekDays.map((dia, i) => {
      const dayStr = subDaysFromYMD(weekEnd, 6 - i);
      const dayApts = appointmentsWeek.filter((a) => a.date && String(a.date).startsWith(dayStr));
      return {
        dia,
        agendamentos: dayApts.length,
        concluidos: dayApts.filter((a) => isCompletedStatus(a.status)).length,
      };
    });

    const taxaNoShow =
      totalAppointments30d > 0 ? Math.round((noShowCount / totalAppointments30d) * 100) : 0;

    const adData = analyticsDashboard?.data;

    return {
      pacientesAtivos: adData?.activePatients ?? pacientesAtivosCount,
      activePatients: adData?.activePatients ?? pacientesAtivosCount,
      totalPacientes: patients.length,
      pacientesNovos: patients.filter((p) => {
        const created = toDate(p.created_at);
        return created ? created >= startCurrentMonthDate : false;
      }).length,
      agendamentosHoje: adData?.appointmentsToday ?? agendamentosHoje,
      appointmentsToday: adData?.appointmentsToday ?? agendamentosHoje,
      agendamentosConcluidos,
      agendamentosRestantes: Math.max(0, agendamentosHoje - agendamentosConcluidos),
      taxaNoShow: adData?.noShowRate ?? taxaNoShow,
      noShowRate: adData?.noShowRate ?? taxaNoShow,
      receitaMensal: adData?.monthlyRevenue ?? receitaMensal,
      monthlyRevenue: adData?.monthlyRevenue ?? receitaMensal,
      receitaMesAnterior,
      crescimentoMensal:
        receitaMesAnterior > 0
          ? Math.round(((receitaMensal - receitaMesAnterior) / receitaMesAnterior) * 100)
          : 0,
      tendenciaSemanal,
      fisioterapeutasAtivos: therapists.length,
      agendamentosSemana: appointmentsWeek.length,
      pendingEvolutions: adData?.pendingEvolutions ?? 0,
      whatsappConfirmationsPending: adData?.whatsappConfirmationsPending ?? 0,
      financialToday: adData?.financialToday ?? { received: 0, projected: 0 },
      revenueChart: adData?.revenueChart ?? [],
      engagementScore: adData?.engagementScore ?? gamificationStats?.engagementRate ?? 0,
      patientsAtRisk: atRiskPatients.length || adData?.patientsAtRisk || (() => {
        const uniquePatientsLast30d = new Set(appointments30d.map((a) => a.patient_id));
        const futureApts = appointmentsWeek.filter((a) => a.date && new Date(a.date as string) > now);
        const futurePatientIds = new Set(futureApts.map((a) => a.patient_id));
        
        let riskCount = 0;
        uniquePatientsLast30d.forEach(id => {
          if (!futurePatientIds.has(id)) riskCount++;
        });
        return riskCount;
      })(),
      occupancyRate: Math.round((agendamentosHoje / Math.max(1, therapists.length * 8)) * 100),
      retentionRate: (() => {
        const uniquePatientsLast30d = new Set(appointments30d.map((a) => a.patient_id));
        if (uniquePatientsLast30d.size === 0) return 0;
        const futureApts = appointmentsWeek.filter(
          (a) => a.date && new Date(a.date as string) > now,
        );
        const returnedPatients = new Set(
          futureApts
            .filter((a) => uniquePatientsLast30d.has(a.patient_id))
            .map((a) => a.patient_id),
        );
        return Math.round((returnedPatients.size / uniquePatientsLast30d.size) * 100);
      })(),
      avgTicket: pacientesAtivosCount > 0 ? Math.round(receitaMensal / pacientesAtivosCount) : 0,
      clinicalImprovement: (() => {
        if (selfAssessments.length < 2) return 0;
        const scores = selfAssessments
          .map((s) => Number(s.pain_level || 0))
          .filter((s) => !isNaN(s));
        if (scores.length < 2) return 0;
        const first = scores[scores.length - 1];
        const last = scores[0];
        return first > 0 ? Math.round(((last - first) / first) * 100) : 0;
      })(),
      evolutionChart: selfAssessments
        .slice(0, 10)
        .reverse()
        .map((s, idx) => ({
          day: idx + 1,
          actualPain: Number(s.pain_level || 0),
          actualMobility: Number(s.mobility_score || 0),
          predictedPain: Math.max(0, 10 - (idx + 1) * 0.8),
        })),
      targetRevenue: forecasts[0]?.predicted_revenue ?? receitaMensal * 1.1,
    };
  }, [
    appointmentsToday,
    appointments30d,
    appointmentsWeek,
    patients,
    therapists,
    contas,
    gamificationStats,
    atRiskPatients,
    analyticsDashboard,
    selfAssessments,
    forecasts,
    startCurrentMonthDate,
    startLastMonthDate,
    endLastMonthDate,
    now,
    weekEnd,
  ]);
}
