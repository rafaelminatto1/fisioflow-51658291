import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, subMonths } from 'date-fns';

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

      // Fisioterapeutas ativos (buscar de user_roles)
      const { count: fisioterapeutasAtivos } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'fisioterapeuta']);

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
        fisioterapeutasAtivos: fisioterapeutasAtivos || 0,
        mediaSessoesPorPaciente: Math.round(mediaSessoesPorPaciente * 10) / 10,
        pacientesEmRisco,
      };
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
};
