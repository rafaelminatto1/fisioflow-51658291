/**
 * Dashboard Metrics Hook - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('patients') → Firestore collection 'patients'
 * - supabase.from('appointments') → Firestore collection 'appointments'
 * - supabase.from('user_roles') → Firestore collection 'user_roles'
 * - supabase.from('contas_financeiras') → Firestore collection 'contas_financeiras'
 * - supabase.from('profiles') → Firestore collection 'profiles'
 * - Replaced all supabase queries with Firestore queries
 * - Removed supabase client dependency
 *
 * Hook otimizado para buscar métricas do dashboard
 * Usa Promise.all para paralelizar queries independentes
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, limit, getCountFromServer, QueryConstraint, onSnapshot } from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';

import { useEffect } from 'react';
import { startOfMonth, subMonths, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { UnknownError } from '@/types/common';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

interface UserRole {
  user_id: string;
  [key: string]: unknown;
}

interface ReceitaRecord {
  valor?: string | number;
  [key: string]: unknown;
}

interface Appointment {
  therapist_id?: string;
  patient_id?: string;
  status?: string;
  appointment_date?: string;
  [key: string]: unknown;
}

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
  const queryClient = useQueryClient();

  // Registrar listeners para atualizações em tempo real
  useEffect(() => {
    if (!db) return;

    const today = formatDateToLocalISO(new Date());
    
    // Listener para agendamentos de hoje
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('appointment_date', '==', today)
    );

    // Listener para novos pacientes (últimos 30 dias)
    const thirtyDaysAgo = formatDateToLocalISO(subMonths(new Date(), 1));
    const patientsQuery = query(
      collection(db, 'patients'),
      where('created_at', '>=', thirtyDaysAgo)
    );

    const unsubscribeAppointments = onSnapshot(appointmentsQuery, () => {
      logger.info('[Realtime] Appointments changed, invalidating dashboard metrics', undefined, 'useDashboardMetrics');
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    });

    const unsubscribePatients = onSnapshot(patientsQuery, () => {
      logger.info('[Realtime] Patients changed, invalidating dashboard metrics', undefined, 'useDashboardMetrics');
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    });

    return () => {
      unsubscribeAppointments();
      unsubscribePatients();
    };
  }, [queryClient]);

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

      // Helper function to get count from snapshot
      const getCount = async (collectionName: string, constraints: QueryConstraint[] = []) => {
        try {
          if (!db) {
            throw new Error('Firestore instance "db" is not available');
          }
          const q = query(collection(db, collectionName), ...constraints);
          const snapshot = await getCountFromServer(q);
          return snapshot.data().count;
        } catch (error: UnknownError) {
          // Se a coleção não existir ou houver permissão negada, retorna 0
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`[useDashboardMetrics] Collection ${collectionName} count failed`, { errorMessage }, 'useDashboardMetrics');
          return 0;
        }
      };

      // Helper function to get docs with constraints
      const getDocsData = async (collectionName: string, constraints: QueryConstraint[] = []) => {
        try {
          if (!db) {
            throw new Error('Firestore instance "db" is not available');
          }
          const q = query(collection(db, collectionName), ...constraints);
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error: UnknownError) {
          // Se a coleção não existir ou houver permissão negada, retorna array vazio
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`[useDashboardMetrics] Collection ${collectionName} not found`, { errorMessage }, 'useDashboardMetrics');
          return [];
        }
      };

      // Ensure db is ready before proceeding with parallel queries
      if (!db) {
        logger.error('[useDashboardMetrics] Critical: Firestore db instance is null', undefined, 'useDashboardMetrics');
        throw new Error('Firestore db is not initialized');
      }

      // Paralelizar todas as queries independentes usando Promise.all
      const [
        // Queries de contagem - Grupo 1
        totalPacientes,
        pacientesNovos,
        agendamentosHoje,
        agendamentosConcluidos,
        totalAppointments30d,
        noShowCount,
        userRolesData,
        receitaAtualData,
        receitaAnteriorData,
        totalSessions30d,
        receitaPorFisioData,
        weeklyData,
        agendamentosSemana,
        cancelamentosSemana,
      ] = await Promise.all([
        // Total de pacientes
        getCount('patients'),

        // Pacientes novos este mês
        getCount('patients', [where('created_at', '>=', startOfCurrentMonth)]),

        // Agendamentos hoje
        getCount('appointments', [where('appointment_date', '==', today)]),

        // Agendamentos concluídos hoje
        getCount('appointments', [
          where('appointment_date', '==', today),
          where('status', '==', 'concluido')
        ]),

        // Total de agendamentos em 30 dias (para taxa de no-show)
        getCount('appointments', [
          where('appointment_date', '>=', thirtyDaysAgo),
          where('appointment_date', '<=', today)
        ]),

        // Contagem de no-show em 30 dias
        getCount('appointments', [
          where('appointment_date', '>=', thirtyDaysAgo),
          where('appointment_date', '<=', today),
          where('status', '==', 'falta')
        ]),

        // Fisioterapeutas ativos
        getDocsData('user_roles', [
          where('role', 'in', ['admin', 'fisioterapeuta'])
        ]),

        // Receita mensal atual
        getDocsData('contas_financeiras', [
          where('tipo', '==', 'receita'),
          where('status', '==', 'pago'),
          where('data_pagamento', '>=', startOfCurrentMonth)
        ]),

        // Receita mês anterior
        getDocsData('contas_financeiras', [
          where('tipo', '==', 'receita'),
          where('status', '==', 'pago'),
          where('data_pagamento', '>=', startOfLastMonth),
          where('data_pagamento', '<', endOfLastMonth)
        ]),

        // Total de sessões em 30 dias
        getCount('appointments', [
          where('appointment_date', '>=', thirtyDaysAgo),
          where('status', '==', 'concluido')
        ]),

        // Receita por fisioterapeuta
        getDocsData('appointments', [
          where('appointment_date', '>=', startOfCurrentMonth),
          where('status', '==', 'concluido')
        ]),

        // Dados semanais para tendência
        getDocsData('appointments', [
          where('appointment_date', '>=', weekStart),
          where('appointment_date', '<=', weekEnd)
        ]),

        // Agendamentos da semana
        getCount('appointments', [
          where('appointment_date', '>=', weekStart),
          where('appointment_date', '<=', weekEnd)
        ]),

        // Cancelamentos da semana
        getCount('appointments', [
          where('appointment_date', '>=', weekStart),
          where('appointment_date', '<=', weekEnd),
          where('status', '==', 'cancelado')
        ]),
      ]);

      // Buscar pacientes ativos (requer query separada por causa do processamento)
      const activePatientsData = await getDocsData('appointments', [
        where('appointment_date', '>=', thirtyDaysAgo)
      ]);

      const uniqueActivePatients = new Set(
        activePatientsData
          .filter(a => a.status !== 'cancelado')
          .map(a => a.patient_id)
      );
      const pacientesAtivos = uniqueActivePatients.size;

      // Contar fisioterapeutas únicos no Firestore
      const uniqueTherapistUserIds = [...new Set((userRolesData || [])
        .map((ur: UserRole) => ur.user_id as string)
        .filter((id): id is string => id !== null)
      )];
      let fisioterapeutasAtivos = 0;

      if (uniqueTherapistUserIds.length > 0) {
        // Query profiles from Firestore
        const profilesQ = query(
          collection(db, 'profiles'),
          where('user_id', 'in', uniqueTherapistUserIds.slice(0, 10)) // Firestore 'in' limit is 10
        );
        const profilesSnap = await getDocs(profilesQ);
        fisioterapeutasAtivos = profilesSnap.size;
      }

      // Calcular métricas financeiras
      const receitaMensal = receitaAtualData?.reduce((sum: number, r: ReceitaRecord) => sum + Number(r.valor || 0), 0) || 0;
      const receitaMesAnterior = receitaAnteriorData?.reduce((sum: number, r: ReceitaRecord) => sum + Number(r.valor || 0), 0) || 0;
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
      const therapistIds = [...new Set((receitaPorFisioData || [])
        .map((apt: Appointment) => apt.therapist_id as string | undefined)
        .filter((id): id is string => id !== null))];
      const therapistProfiles = new Map<string, { full_name?: string }>();

      if (therapistIds.length > 0) {
        const profileQ = query(
          collection(db, 'profiles'),
          where('user_id', 'in', therapistIds.slice(0, 10))
        );
        const profileSnap = await getDocs(profileQ);
        profileSnap.forEach(doc => {
          const profileData = doc.data();
          if (profileData && profileData.user_id) {
            therapistProfiles.set(profileData.user_id, profileData);
          }
        });
      }

      (receitaPorFisioData || []).forEach((apt: Appointment & { payment_amount?: string | number }) => {
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
        const dayAppointments = (weeklyData || []).filter((a: Appointment) => a.appointment_date === dayStr);

        tendenciaSemanal.push({
          dia: weekDays[i] ?? 'Dia',
          agendamentos: dayAppointments.length,
          concluidos: dayAppointments.filter((a: Appointment) => a.status === 'concluido').length,
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
