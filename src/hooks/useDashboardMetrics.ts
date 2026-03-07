/**
 * Dashboard Metrics Hook - Migrated to Neon/Workers
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { startOfMonth, subMonths, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { fisioLogger as logger } from '@/lib/errors/logger';
import {
  appointmentsApi,
  financialApi,
  patientsApi,
  profileApi,
  type AppointmentRow,
  type ContaFinanceira,
  type Pagamento,
  type TherapistSummary,
} from '@/lib/api/workers-client';

export interface TherapistPerformance {
  id: string;
  nome: string;
  atendimentos: number;
  receita: number;
  taxaOcupacao: number;
}

export interface WeeklyTrend {
  dia: string;
  agendamentos: number;
  concluidos: number;
}

export interface DashboardMetrics {
  totalPacientes: number;
  pacientesAtivos: number;
  pacientesNovos: number;
  agendamentosHoje: number;
  agendamentosRestantes: number;
  agendamentosConcluidos: number;
  taxaNoShow: number;
  taxaOcupacao: number;
  receitaMensal: number;
  receitaMesAnterior: number;
  crescimentoMensal: number;
  fisioterapeutasAtivos: number;
  mediaSessoesPorPaciente: number;
  pacientesEmRisco: number;
  receitaPorFisioterapeuta: TherapistPerformance[];
  tendenciaSemanal: WeeklyTrend[];
  ticketMedio: number;
  agendamentosSemana: number;
  cancelamentosSemana: number;
  periodLabel: string;
}

const isCompletedStatus = (status: unknown): boolean => {
  const s = String(status ?? '').toLowerCase();
  return ['completed', 'concluido', 'realizado', 'atendido'].includes(s);
};

const isCancelledStatus = (status: unknown): boolean => {
  const s = String(status ?? '').toLowerCase();
  return ['cancelled', 'cancelado'].includes(s);
};

const isNoShowStatus = (status: unknown): boolean => {
  const s = String(status ?? '').toLowerCase();
  return ['no_show', 'falta', 'paciente_faltou', 'faltou'].includes(s);
};

const safeDay = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.includes('T') ? raw.slice(0, 10) : raw;
};

const toDate = (value: unknown): Date | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isDateInRange = (value: unknown, from: Date, to: Date): boolean => {
  const date = toDate(value);
  if (!date) return false;
  return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
};

const sumRevenue = (rows: Array<{ valor?: number }>): number =>
  rows.reduce((acc, row) => acc + Number(row.valor ?? 0), 0);

export type DashboardPeriod = 'hoje' | 'semana' | 'mes' | 'personalizado';

export const useDashboardMetrics = (period: DashboardPeriod = 'hoje') => {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  useEffect(() => {
    if (!organizationId) return;

    const intervalId = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [queryClient, organizationId]);

  return useQuery({
    queryKey: ['dashboard-metrics', organizationId, period],
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!organizationId) throw new Error('Organization ID is required');

      const now = new Date();
      const today = formatDateToLocalISO(now);
      const startCurrentMonthDate = startOfMonth(now);
      const startCurrentMonth = formatDateToLocalISO(startCurrentMonthDate);
      const startLastMonthDate = startOfMonth(subMonths(now, 1));
      const endLastMonthDate = subDays(startCurrentMonthDate, 1);
      const thirtyDaysAgo = formatDateToLocalISO(subMonths(now, 1));
      const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(now, { weekStartsOn: 1 });
      const weekStart = formatDateToLocalISO(weekStartDate);
      const weekEnd = formatDateToLocalISO(weekEndDate);

      // Adjust primary date range based on selected period
      const primaryDateFrom =
        period === 'semana' ? weekStart :
        period === 'mes' ? startCurrentMonth :
        today;
      const primaryDateTo =
        period === 'semana' ? weekEnd :
        today;

      const [
        patientsRes,
        appointmentsTodayRes,
        appointments30dRes,
        appointmentsWeekRes,
        appointmentsMonthRes,
        therapistsRes,
        contasRes,
        pagamentosRes,
      ] = await Promise.all([
        patientsApi.list({ limit: 3000, offset: 0 }),
        appointmentsApi.list({ dateFrom: primaryDateFrom, dateTo: primaryDateTo, limit: 3000, offset: 0 }),
        appointmentsApi.list({ dateFrom: thirtyDaysAgo, dateTo: today, limit: 3000, offset: 0 }),
        appointmentsApi.list({ dateFrom: weekStart, dateTo: weekEnd, limit: 3000, offset: 0 }),
        appointmentsApi.list({ dateFrom: startCurrentMonth, dateTo: today, limit: 3000, offset: 0 }),
        profileApi.listTherapists().catch((error) => {
          logger.warn('Falha ao carregar fisioterapeutas para dashboard', error, 'useDashboardMetrics');
          return { data: [] as TherapistSummary[] };
        }),
        financialApi.contas.list({ tipo: 'receita', status: 'pago', limit: 3000, offset: 0 }).catch((error) => {
          logger.warn('Falha ao carregar contas para dashboard', error, 'useDashboardMetrics');
          return { data: [] as ContaFinanceira[] };
        }),
        financialApi.pagamentos.list({ limit: 3000, offset: 0 }).catch((error) => {
          logger.warn('Falha ao carregar pagamentos para dashboard', error, 'useDashboardMetrics');
          return { data: [] as Pagamento[] };
        }),
      ]);

      const patients = patientsRes?.data ?? [];
      const appointmentsToday = (appointmentsTodayRes?.data ?? []) as AppointmentRow[];
      const appointments30d = (appointments30dRes?.data ?? []) as AppointmentRow[];
      const appointmentsWeek = (appointmentsWeekRes?.data ?? []) as AppointmentRow[];
      const appointmentsMonth = (appointmentsMonthRes?.data ?? []) as AppointmentRow[];
      const therapists = therapistsRes?.data ?? [];
      const contas = (contasRes?.data ?? []) as ContaFinanceira[];
      const pagamentos = (pagamentosRes?.data ?? []) as Pagamento[];

      const totalPacientes = patients.length;
      const pacientesNovos = patients.filter((p) => {
        const createdAt = toDate(p.created_at);
        return createdAt ? createdAt >= startCurrentMonthDate : false;
      }).length;

      const activePatients = new Set(
        appointments30d
          .filter((a) => !isCancelledStatus(a.status))
          .map((a) => a.patient_id)
          .filter(Boolean),
      );
      const pacientesAtivos = activePatients.size;

      const agendamentosHoje = appointmentsToday.filter((a) => !isCancelledStatus(a.status)).length;
      const agendamentosConcluidos = appointmentsToday.filter((a) => isCompletedStatus(a.status)).length;
      const agendamentosRestantes = Math.max(0, agendamentosHoje - agendamentosConcluidos);

      const totalAppointments30d = appointments30d.filter((a) => !isCancelledStatus(a.status)).length;
      const noShowCount = appointments30d.filter((a) => isNoShowStatus(a.status)).length;

      const contasMesAtual = contas.filter((r) => isDateInRange(r.pago_em ?? r.data_vencimento, startCurrentMonthDate, now));
      const contasMesAnterior = contas.filter((r) => isDateInRange(r.pago_em ?? r.data_vencimento, startLastMonthDate, endLastMonthDate));

      const pagamentosMesAtual = pagamentos.filter((r) => isDateInRange(r.pago_em, startCurrentMonthDate, now));
      const pagamentosMesAnterior = pagamentos.filter((r) => isDateInRange(r.pago_em, startLastMonthDate, endLastMonthDate));

      const receitaMensalContas = sumRevenue(contasMesAtual);
      const receitaMesAnteriorContas = sumRevenue(contasMesAnterior);
      const receitaMensalPagamentos = sumRevenue(pagamentosMesAtual);
      const receitaMesAnteriorPagamentos = sumRevenue(pagamentosMesAnterior);

      const receitaMensal = receitaMensalContas > 0 ? receitaMensalContas : receitaMensalPagamentos;
      const receitaMesAnterior =
        receitaMesAnteriorContas > 0 ? receitaMesAnteriorContas : receitaMesAnteriorPagamentos;

      const therapistById = new Map(
        therapists.map((t) => [t.id, t.name]),
      );

      const fisioStats = new Map<string, TherapistPerformance>();
      const monthCompletedAppointments = appointmentsMonth.filter((a) => isCompletedStatus(a.status));
      monthCompletedAppointments.forEach((apt) => {
        const therapistId = apt.therapist_id;
        if (!therapistId) return;

        const current = fisioStats.get(therapistId) ?? {
          id: therapistId,
          nome: therapistById.get(therapistId) ?? 'Fisioterapeuta',
          atendimentos: 0,
          receita: 0,
          taxaOcupacao: 0,
        };

        current.atendimentos += 1;
        fisioStats.set(therapistId, current);
      });

      const appointmentsById = new Map(monthCompletedAppointments.map((a) => [a.id, a]));
      pagamentosMesAtual.forEach((p) => {
        if (!p.appointment_id) return;
        const appointment = appointmentsById.get(p.appointment_id);
        const therapistId = appointment?.therapist_id;
        if (!therapistId) return;

        const current = fisioStats.get(therapistId) ?? {
          id: therapistId,
          nome: therapistById.get(therapistId) ?? 'Fisioterapeuta',
          atendimentos: 0,
          receita: 0,
          taxaOcupacao: 0,
        };

        current.receita += Number(p.valor ?? 0);
        fisioStats.set(therapistId, current);
      });

      const receitaPorFisioterapeuta = Array.from(fisioStats.values())
        .map((item) => ({
          ...item,
          taxaOcupacao: Math.round((item.atendimentos / Math.max(1, agendamentosHoje)) * 1000) / 10,
        }))
        .sort((a, b) => (b.receita - a.receita) || (b.atendimentos - a.atendimentos))
        .slice(0, 5);

      const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const tendenciaSemanal: WeeklyTrend[] = weekDays.map((dia, i) => {
        const day = subDays(weekEndDate, 6 - i);
        const dayStr = formatDateToLocalISO(day);
        const dayApts = appointmentsWeek.filter((a) => safeDay(a.date) === dayStr);

        return {
          dia,
          agendamentos: dayApts.length,
          concluidos: dayApts.filter((a) => isCompletedStatus(a.status)).length,
        };
      });

      const agendamentosSemana = appointmentsWeek.length;
      const cancelamentosSemana = appointmentsWeek.filter((a) => isCancelledStatus(a.status)).length;
      const totalSessions30d = appointments30d.filter((a) => isCompletedStatus(a.status)).length;
      const fisiosAtivosCount = therapists.length;
      const capacidadeBase = Math.max(1, fisiosAtivosCount || 1) * 8;

      return {
        totalPacientes,
        pacientesAtivos,
        pacientesNovos,
        agendamentosHoje,
        agendamentosRestantes,
        agendamentosConcluidos,
        taxaNoShow:
          totalAppointments30d > 0 ? Math.round((noShowCount / totalAppointments30d) * 1000) / 10 : 0,
        taxaOcupacao: Math.round((agendamentosHoje / capacidadeBase) * 1000) / 10,
        receitaMensal,
        receitaMesAnterior,
        crescimentoMensal:
          receitaMesAnterior > 0
            ? Math.round(((receitaMensal - receitaMesAnterior) / receitaMesAnterior) * 1000) / 10
            : 0,
        fisioterapeutasAtivos: fisiosAtivosCount,
        mediaSessoesPorPaciente:
          pacientesAtivos > 0 ? Math.round((totalSessions30d / pacientesAtivos) * 10) / 10 : 0,
        pacientesEmRisco: Math.max(0, totalPacientes - pacientesAtivos),
        receitaPorFisioterapeuta,
        tendenciaSemanal,
        ticketMedio: totalSessions30d > 0 ? Math.round((receitaMensal / totalSessions30d) * 100) / 100 : 0,
        agendamentosSemana,
        cancelamentosSemana,
        periodLabel:
          period === 'semana' ? 'Esta Semana' :
          period === 'mes' ? 'Mês Atual' :
          'Hoje',
      };
    },
  });
};
