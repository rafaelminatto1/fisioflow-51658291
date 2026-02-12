/**
 * Dashboard Metrics Hook - Migrated to Firebase
 */



// ============================================================================
// TYPES
// ============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query as firestoreQuery, where, getCountFromServer, QueryConstraint, onSnapshot, db } from '@/integrations/firebase/app';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { startOfMonth, subMonths, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';

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


export const useDashboardMetrics = () => {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  // Registrar listeners para atualizações em tempo real
  useEffect(() => {
    if (!db || !organizationId) return;

    const today = formatDateToLocalISO(new Date());

    // Listener para agendamentos de hoje com organizationId
    const appointmentsQuery = firestoreQuery(
      collection(db, 'appointments'),
      where('organization_id', '==', organizationId),
      where('appointment_date', '==', today)
    );

    // Listener para novos pacientes com organizationId
    const thirtyDaysAgo = formatDateToLocalISO(subMonths(new Date(), 1));
    const patientsQuery = firestoreQuery(
      collection(db, 'patients'),
      where('organization_id', '==', organizationId),
      where('created_at', '>=', thirtyDaysAgo)
    );

    const unsubscribeAppointments = onSnapshot(appointmentsQuery, () => {
      logger.info('[Realtime] Appointments changed, invalidating dashboard metrics', undefined, 'useDashboardMetrics');
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
    });

    const unsubscribePatients = onSnapshot(patientsQuery, () => {
      logger.info('[Realtime] Patients changed, invalidating dashboard metrics', undefined, 'useDashboardMetrics');
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', organizationId] });
    });

    return () => {
      unsubscribeAppointments();
      unsubscribePatients();
    };
  }, [queryClient, organizationId]);

  return useQuery({
    queryKey: ['dashboard-metrics', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!organizationId) throw new Error('Organization ID is required');

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
          const q = firestoreQuery(
            collection(db, collectionName),
            where('organization_id', '==', organizationId),
            ...constraints
          );
          const snapshot = await getCountFromServer(q);
          return snapshot.data().count;
        } catch (error) {
          logger.warn(`[useDashboardMetrics] Collection ${collectionName} count failed`, error, 'useDashboardMetrics');
          return 0;
        }
      };

      // Helper function to get docs with constraints
      const getDocsData = async (collectionName: string, constraints: QueryConstraint[] = []) => {
        try {
          const q = firestoreQuery(
            collection(db, collectionName),
            where('organization_id', '==', organizationId),
            ...constraints
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
        } catch (error) {
          logger.warn(`[useDashboardMetrics] Collection ${collectionName} not found`, error, 'useDashboardMetrics');
          return [];
        }
      };

      // Paralelizar queries
      const [
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
        activePatientsData,
      ] = await Promise.all([
        getCount('patients'),
        getCount('patients', [where('created_at', '>=', startOfCurrentMonth)]),
        getCount('appointments', [where('appointment_date', '==', today)]),
        getCount('appointments', [where('appointment_date', '==', today), where('status', '==', 'concluido')]),
        getCount('appointments', [where('appointment_date', '>=', thirtyDaysAgo), where('appointment_date', '<=', today)]),
        getCount('appointments', [where('appointment_date', '>=', thirtyDaysAgo), where('appointment_date', '<=', today), where('status', '==', 'falta')]),
        getDocsData('user_roles', [where('role', 'in', ['admin', 'fisioterapeuta'])]),
        getDocsData('contas_financeiras', [where('tipo', '==', 'receita'), where('status', '==', 'pago'), where('data_pagamento', '>=', startOfCurrentMonth)]),
        getDocsData('contas_financeiras', [where('tipo', '==', 'receita'), where('status', '==', 'pago'), where('data_pagamento', '>=', startOfLastMonth), where('data_pagamento', '<', endOfLastMonth)]),
        getCount('appointments', [where('appointment_date', '>=', thirtyDaysAgo), where('status', '==', 'concluido')]),
        getDocsData('appointments', [where('appointment_date', '>=', startOfCurrentMonth), where('status', '==', 'concluido')]),
        getDocsData('appointments', [where('appointment_date', '>=', weekStart), where('appointment_date', '<=', weekEnd)]),
        getCount('appointments', [where('appointment_date', '>=', weekStart), where('appointment_date', '<=', weekEnd)]),
        getCount('appointments', [where('appointment_date', '>=', weekStart), where('appointment_date', '<=', weekEnd), where('status', '==', 'cancelado')]),
        getDocsData('appointments', [where('appointment_date', '>=', thirtyDaysAgo)]),
      ]);

      const uniqueActivePatients = new Set(activePatientsData.filter(a => a.status !== 'cancelado').map(a => a.patient_id));
      const pacientesAtivos = uniqueActivePatients.size;

      const receitaMensal = receitaAtualData?.reduce((sum: number, r: any) => sum + Number(r.valor || 0), 0) || 0;
      const receitaMesAnterior = receitaAnteriorData?.reduce((sum: number, r: any) => sum + Number(r.valor || 0), 0) || 0;

      const fisioStats = new Map<string, TherapistPerformance>();
      receitaPorFisioData.forEach((apt: any) => {
        const tId = apt.therapist_id;
        if (!tId) return;
        const existing = fisioStats.get(tId) || { id: tId, nome: apt.therapist_name || 'Fisioterapeuta', atendimentos: 0, receita: 0, taxaOcupacao: 0 };
        existing.atendimentos += 1;
        existing.receita += Number(apt.payment_amount || 0);
        fisioStats.set(tId, existing);
      });

      const weekDays: string[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const tendenciaSemanal: WeeklyTrend[] = weekDays.map((dia, i) => {
        const day = subDays(new Date(weekEnd), 6 - i);
        const dayStr = formatDateToLocalISO(day);
        const dayApts = weeklyData.filter((a: any) => a.appointment_date === dayStr);
        return { dia, agendamentos: dayApts.length, concluidos: dayApts.filter((a: any) => a.status === 'concluido').length };
      });

      return {
        totalPacientes,
        pacientesAtivos,
        pacientesNovos,
        agendamentosHoje,
        agendamentosRestantes: agendamentosHoje - agendamentosConcluidos,
        agendamentosConcluidos,
        taxaNoShow: totalAppointments30d > 0 ? Math.round((noShowCount / totalAppointments30d) * 1000) / 10 : 0,
        taxaOcupacao: Math.round((agendamentosHoje / (8 * (userRolesData.length || 1))) * 1000) / 10,
        receitaMensal,
        receitaMesAnterior,
        crescimentoMensal: receitaMesAnterior > 0 ? Math.round(((receitaMensal - receitaMesAnterior) / receitaMesAnterior) * 1000) / 10 : 0,
        fisioterapeutasAtivos: userRolesData.length,
        mediaSessoesPorPaciente: pacientesAtivos > 0 ? Math.round((totalSessions30d / pacientesAtivos) * 10) / 10 : 0,
        pacientesEmRisco: Math.max(0, totalPacientes - pacientesAtivos),
        receitaPorFisioterapeuta: Array.from(fisioStats.values()).sort((a, b) => b.receita - a.receita).slice(0, 5),
        tendenciaSemanal,
        ticketMedio: totalSessions30d > 0 ? Math.round((receitaMensal / totalSessions30d) * 100) / 100 : 0,
        agendamentosSemana,
        cancelamentosSemana,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};