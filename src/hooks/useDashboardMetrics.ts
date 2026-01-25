import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { getFirebaseDb } from '@/integrations/firebase/app';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

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
}

/**
 * Hook otimizado para buscar métricas do dashboard
 * Usa Promise.all para paralelizar queries independentes
 */
export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const today = formatDateToLocalISO(new Date());
      const startOfCurrentMonth = formatDateToLocalISO(startOfMonth(new Date()));
      const startOfLastMonth = formatDateToLocalISO(startOfMonth(subMonths(new Date(), 1)));
      const endOfLastMonth = formatDateToLocalISO(startOfMonth(new Date()));
      const thirtyDaysAgo = formatDateToLocalISO(subMonths(new Date(), 1));
      const weekStart = formatDateToLocalISO(startOfWeek(new Date(), { weekStartsOn: 1 }));
      const weekEnd = formatDateToLocalISO(endOfWeek(new Date(), { weekStartsOn: 1 }));

      // Paralelizar todas as queries independentes usando Promise.all
      const [
        // Queries de contagem - Grupo 1
        totalPacientesResult,
        pacientesNovosResult,
        agendamentosHojeResult,
        agendamentosConcluidosResult,
        totalAppointments30dResult,
        noShowCountResult,
        userRolesResult,
        receitaAtualResult,
        receitaAnteriorResult,
        totalSessions30dResult,
        receitaPorFisioResult,
        weeklyDataResult,
        agendamentosSemanaResult,
        cancelamentosSemanaResult,
      ] = await Promise.all([
        // Total de pacientes
        supabase
          .from('patients')
          .select('*', { count: 'exact', head: true }),

        // Pacientes novos este mês
        supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfCurrentMonth),

        // Agendamentos hoje
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', today),

        // Agendamentos concluídos hoje
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', today)
          .eq('status', 'concluido'),

        // Total de agendamentos em 30 dias (para taxa de no-show)
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', thirtyDaysAgo)
          .lte('appointment_date', today),

        // Contagem de no-show em 30 dias
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', thirtyDaysAgo)
          .lte('appointment_date', today)
          .eq('status', 'falta'),

        // Fisioterapeutas ativos
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['admin', 'fisioterapeuta']),

        // Receita mensal atual
        supabase
          .from('contas_financeiras')
          .select('valor')
          .eq('tipo', 'receita')
          .eq('status', 'pago')
          .gte('data_pagamento', startOfCurrentMonth),

        // Receita mês anterior
        supabase
          .from('contas_financeiras')
          .select('valor')
          .eq('tipo', 'receita')
          .eq('status', 'pago')
          .gte('data_pagamento', startOfLastMonth)
          .lt('data_pagamento', endOfLastMonth),

        // Total de sessões em 30 dias
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', thirtyDaysAgo)
          .eq('status', 'concluido'),

        // Receita por fisioterapeuta (removed join with profiles as it's on Firestore)
        supabase
          .from('appointments')
          .select(`
            therapist_id,
            payment_amount,
            status
          `)
          .gte('appointment_date', startOfCurrentMonth)
          .eq('status', 'concluido'),

        // Dados semanais para tendência
        supabase
          .from('appointments')
          .select('appointment_date, status')
          .gte('appointment_date', weekStart)
          .lte('appointment_date', weekEnd),

        // Agendamentos da semana
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', weekStart)
          .lte('appointment_date', weekEnd),

        // Cancelamentos da semana
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', weekStart)
          .lte('appointment_date', weekEnd)
          .eq('status', 'cancelado'),
      ]);

      // Extrair resultados das queries
      const totalPacientes = totalPacientesResult.count || 0;
      const pacientesNovos = pacientesNovosResult.count || 0;
      const agendamentosHoje = agendamentosHojeResult.count || 0;
      const agendamentosConcluidos = agendamentosConcluidosResult.count || 0;
      const totalAppointments30d = totalAppointments30dResult.count || 0;
      const noShowCount = noShowCountResult.count || 0;
      const totalSessions30d = totalSessions30dResult.count || 0;
      const agendamentosSemana = agendamentosSemanaResult.count || 0;
      const cancelamentosSemana = cancelamentosSemanaResult.count || 0;

      // Buscar pacientes ativos (requer query separada por causa do processamento)
      const { data: activePatientsData } = await supabase
        .from('appointments')
        .select('patient_id')
        .gte('appointment_date', thirtyDaysAgo)
        .neq('status', 'cancelado');

      const uniqueActivePatients = new Set(activePatientsData?.map(a => a.patient_id) || []);
      const pacientesAtivos = uniqueActivePatients.size;

      // Contar fisioterapeutas únicos no Firestore
      const uniqueTherapistUserIds = [...new Set((userRolesResult.data || []).map(ur => ur.user_id))];
      let fisioterapeutasAtivos = 0;

      const db = getFirebaseDb();
      if (uniqueTherapistUserIds.length > 0) {
        // Query profiles from Firestore
        const profilesQ = query(
          collection(db, 'profiles'),
          where('user_id', 'in', uniqueTherapistUserIds)
        );
        const profilesSnap = await getDocs(profilesQ);
        fisioterapeutasAtivos = profilesSnap.size;
      }

      // Calcular métricas financeiras
      const receitaMensal = receitaAtualResult.data?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;
      const receitaMesAnterior = receitaAnteriorResult.data?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;
      const crescimentoMensal = receitaMesAnterior > 0
        ? ((receitaMensal - receitaMesAnterior) / receitaMesAnterior) * 100
        : 0;

      // Taxa de no-show
      const taxaNoShow = totalAppointments30d > 0
        ? (noShowCount / totalAppointments30d) * 100
        : 0;

      // Média de sessões por paciente
      const mediaSessoesPorPaciente = pacientesAtivos > 0
        ? totalSessions30d / pacientesAtivos
        : 0;

      // Pacientes em risco
      const pacientesEmRisco = Math.max(0, totalPacientes - pacientesAtivos);

      // Taxa de ocupação
      const horasDisponiveisDia = 8;
      const taxaOcupacao = agendamentosHoje > 0 && fisioterapeutasAtivos > 0
        ? Math.min((agendamentosHoje / (horasDisponiveisDia * fisioterapeutasAtivos)) * 100, 100)
        : 0;

      const fisioStats = new Map<string, TherapistPerformance>();
      const therapistIds = [...new Set(receitaPorFisioResult.data?.map(apt => apt.therapist_id).filter(Boolean))];
      const therapistProfiles = new Map<string, { full_name?: string }>();

      if (therapistIds.length > 0) {
        const profileQ = query(collection(db, 'profiles'), where('user_id', 'in', therapistIds));
        const profileSnap = await getDocs(profileQ);
        profileSnap.forEach(doc => {
          therapistProfiles.set(doc.data().user_id, doc.data());
        });
      }

      receitaPorFisioResult.data?.forEach((apt) => {
        const tId = apt.therapist_id;
        if (!tId) return;

        const profile = therapistProfiles.get(tId);
        const existing = fisioStats.get(tId) || {
          id: tId,
          nome: profile?.full_name || 'Sem nome',
          atendimentos: 0,
          receita: 0,
          taxaOcupacao: 0,
        };

        existing.atendimentos += 1;
        existing.receita += Number(apt.payment_amount || 0);
        fisioStats.set(tId, existing);
      });

      const receitaPorFisioterapeuta = Array.from(fisioStats.values())
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 5);

      // Processar tendência semanal
      const weekDays: string[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const tendenciaSemanal: WeeklyTrend[] = [];

      for (let i = 0; i < 7; i++) {
        const day = subDays(new Date(weekEnd), 6 - i);
        const dayStr = formatDateToLocalISO(day);
        const dayAppointments = weeklyDataResult.data?.filter(a => a.appointment_date === dayStr) || [];

        tendenciaSemanal.push({
          dia: weekDays[i] ?? 'Dia',
          agendamentos: dayAppointments.length,
          concluidos: dayAppointments.filter(a => a.status === 'concluido').length,
        });
      }

      // Ticket médio
      const ticketMedio = totalSessions30d > 0
        ? receitaMensal / totalSessions30d
        : 0;

      return {
        totalPacientes,
        pacientesAtivos,
        pacientesNovos,
        agendamentosHoje,
        agendamentosRestantes: agendamentosHoje - agendamentosConcluidos,
        agendamentosConcluidos,
        taxaNoShow: Math.round(taxaNoShow * 10) / 10,
        taxaOcupacao: Math.round(taxaOcupacao * 10) / 10,
        receitaMensal,
        receitaMesAnterior,
        crescimentoMensal: Math.round(crescimentoMensal * 10) / 10,
        fisioterapeutasAtivos,
        mediaSessoesPorPaciente: Math.round(mediaSessoesPorPaciente * 10) / 10,
        pacientesEmRisco,
        receitaPorFisioterapeuta,
        tendenciaSemanal,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        agendamentosSemana,
        cancelamentosSemana,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos (antes era 24h)
  });
};
