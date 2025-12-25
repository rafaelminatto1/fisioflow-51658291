import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, subMonths, subDays, startOfWeek, endOfWeek } from 'date-fns';

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

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const startOfCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const startOfLastMonth = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
      const endOfLastMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const thirtyDaysAgo = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Total de pacientes
      const { count: totalPacientes } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Pacientes ativos (com consulta nos últimos 30 dias)
      const { data: activePatientsData } = await supabase
        .from('appointments')
        .select('patient_id')
        .gte('appointment_date', thirtyDaysAgo)
        .not('status', 'eq', 'cancelado');
      
      const uniqueActivePatients = new Set(activePatientsData?.map(a => a.patient_id) || []);
      const pacientesAtivos = uniqueActivePatients.size;

      // Pacientes novos este mês
      const { count: pacientesNovos } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfCurrentMonth);

      // Agendamentos hoje
      const { count: agendamentosHoje } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today);

      // Agendamentos concluídos hoje
      const { count: agendamentosConcluidos } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today)
        .eq('status', 'concluido');

      // Taxa de no-show (últimos 30 dias)
      const { count: totalAppointments30d } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', thirtyDaysAgo)
        .lte('appointment_date', today);

      const { count: noShowCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', thirtyDaysAgo)
        .lte('appointment_date', today)
        .eq('status', 'falta');

      const taxaNoShow = totalAppointments30d && totalAppointments30d > 0 
        ? ((noShowCount || 0) / totalAppointments30d) * 100 
        : 0;

      // Fisioterapeutas ativos (buscar de user_roles e depois profiles)
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'fisioterapeuta']);

      const uniqueTherapistUserIds = [...new Set((userRolesData || []).map(ur => ur.user_id))];
      
      let fisioterapeutasAtivos = 0;
      if (uniqueTherapistUserIds.length > 0) {
        const { count: profilesCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('user_id', uniqueTherapistUserIds);
        fisioterapeutasAtivos = profilesCount || 0;
      }

      // Receita mensal atual (usando contas_financeiras)
      const { data: receitaAtualData } = await supabase
        .from('contas_financeiras')
        .select('valor')
        .eq('tipo', 'receita')
        .eq('status', 'pago')
        .gte('data_pagamento', startOfCurrentMonth);

      const receitaMensal = receitaAtualData?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;

      // Receita mês anterior
      const { data: receitaAnteriorData } = await supabase
        .from('contas_financeiras')
        .select('valor')
        .eq('tipo', 'receita')
        .eq('status', 'pago')
        .gte('data_pagamento', startOfLastMonth)
        .lt('data_pagamento', endOfLastMonth);

      const receitaMesAnterior = receitaAnteriorData?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;

      // Crescimento mensal
      const crescimentoMensal = receitaMesAnterior > 0 
        ? ((receitaMensal - receitaMesAnterior) / receitaMesAnterior) * 100 
        : 0;

      // Média de sessões por paciente (últimos 30 dias)
      const { count: totalSessions30d } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', thirtyDaysAgo)
        .eq('status', 'concluido');

      const mediaSessoesPorPaciente = pacientesAtivos > 0 
        ? (totalSessions30d || 0) / pacientesAtivos 
        : 0;

      // Pacientes em risco (sem consulta há mais de 30 dias)
      const pacientesEmRisco = Math.max(0, (totalPacientes || 0) - pacientesAtivos);

      // Taxa de ocupação (baseado em horários disponíveis vs ocupados)
      const horasDisponiveisDia = 8;
      const taxaOcupacao = horasDisponiveisDia > 0 && agendamentosHoje
        ? Math.min(((agendamentosHoje || 0) / (horasDisponiveisDia * (fisioterapeutasAtivos || 1))) * 100, 100)
        : 0;

      // Receita por fisioterapeuta
      const { data: receitaPorFisio } = await supabase
        .from('appointments')
        .select(`
          therapist_id,
          payment_amount,
          status,
          profiles!appointments_therapist_id_fkey(id, full_name)
        `)
        .gte('appointment_date', startOfCurrentMonth)
        .eq('status', 'concluido');

      const fisioStats = new Map<string, TherapistPerformance>();
      receitaPorFisio?.forEach((apt) => {
        const profile = apt.profiles as any;
        if (!profile?.id) return;
        
        const existing = fisioStats.get(profile.id) || {
          id: profile.id,
          nome: profile.full_name || 'Sem nome',
          atendimentos: 0,
          receita: 0,
          taxaOcupacao: 0,
        };
        
        existing.atendimentos += 1;
        existing.receita += Number(apt.payment_amount || 0);
        fisioStats.set(profile.id, existing);
      });

      const receitaPorFisioterapeuta = Array.from(fisioStats.values())
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 5);

      // Tendência semanal
      const { data: weeklyData } = await supabase
        .from('appointments')
        .select('appointment_date, status')
        .gte('appointment_date', weekStart)
        .lte('appointment_date', weekEnd);

      const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const tendenciaSemanal: WeeklyTrend[] = [];
      
      for (let i = 0; i < 7; i++) {
        const day = subDays(new Date(weekEnd), 6 - i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayAppointments = weeklyData?.filter(a => a.appointment_date === dayStr) || [];
        
        tendenciaSemanal.push({
          dia: weekDays[i],
          agendamentos: dayAppointments.length,
          concluidos: dayAppointments.filter(a => a.status === 'concluido').length,
        });
      }

      // Agendamentos e cancelamentos da semana
      const { count: agendamentosSemana } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', weekStart)
        .lte('appointment_date', weekEnd);

      const { count: cancelamentosSemana } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', weekStart)
        .lte('appointment_date', weekEnd)
        .eq('status', 'cancelado');

      // Ticket médio
      const ticketMedio = totalSessions30d && totalSessions30d > 0
        ? receitaMensal / totalSessions30d
        : 0;

      return {
        totalPacientes: totalPacientes || 0,
        pacientesAtivos,
        pacientesNovos: pacientesNovos || 0,
        agendamentosHoje: agendamentosHoje || 0,
        agendamentosRestantes: (agendamentosHoje || 0) - (agendamentosConcluidos || 0),
        agendamentosConcluidos: agendamentosConcluidos || 0,
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
        agendamentosSemana: agendamentosSemana || 0,
        cancelamentosSemana: cancelamentosSemana || 0,
      };
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
};
