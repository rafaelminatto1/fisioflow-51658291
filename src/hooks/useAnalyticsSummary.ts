/**
 * useAnalyticsSummary - Migrated to Firebase
 *
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query as firestoreQuery, where, db } from '@/integrations/firebase/app';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { formatDateToLocalISO } from '@/utils/dateUtils';
import { queryConfigs } from '@/lib/queryConfig';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsSummary {
  totalAppointments: number;
  appointmentGrowth: number;
  activePatients: number;
  patientGrowth: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  occupancyRate: number;
}

export function useAnalyticsSummary() {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["analytics-summary", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return null;

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      try {
        // OTIMIZAÇÃO: Se já tivermos todos os agendamentos no cache (de useAppointments),
        // podemos calcular os stats localmente em vez de fazer 6 queries ao Firestore.
        const cachedAppointments = queryClient.getQueryData<any>(['appointments_v2', 'list', organizationId]);
        
        if (cachedAppointments?.data && cachedAppointments.data.length > 0) {
          logger.info("Calculando analytics summary a partir do cache de agendamentos", {}, "useAnalyticsSummary");
          const allApts = cachedAppointments.data;
          
          const currentApts = allApts.filter((a: any) => {
            const date = a.date instanceof Date ? a.date : new Date(a.date);
            return date >= currentMonthStart && date <= currentMonthEnd;
          });

          const lastApts = allApts.filter((a: any) => {
            const date = a.date instanceof Date ? a.date : new Date(a.date);
            return date >= lastMonthStart && date <= lastMonthEnd;
          });

          const activePatientsSet = new Set(allApts
            .filter((a: any) => {
              const date = a.date instanceof Date ? a.date : new Date(a.date);
              return date >= subMonths(now, 1) && date <= now;
            })
            .map((a: any) => a.patientId)
            .filter(Boolean)
          );

          const lastMonthPatientsSet = new Set(allApts
            .filter((a: any) => {
              const date = a.date instanceof Date ? a.date : new Date(a.date);
              return date >= subMonths(now, 2) && date <= lastMonthEnd;
            })
            .map((a: any) => a.patientId)
            .filter(Boolean)
          );

          const monthlyRev = currentApts
            .filter((a: any) => a.payment_status === 'pago')
            .reduce((sum: number, a: any) => sum + (a.payment_amount || 0), 0);

          const lastMonthRev = lastApts
            .filter((a: any) => a.payment_status === 'pago')
            .reduce((sum: number, a: any) => sum + (a.payment_amount || 0), 0);

          return calculateStats(
            currentApts.length,
            lastApts.length,
            activePatientsSet.size,
            lastMonthPatientsSet.size,
            monthlyRev,
            lastMonthRev
          );
        }

        // Fallback para queries se o cache não estiver disponível
        logger.info("Carregando analytics summary do Firestore", { organizationId }, "useAnalyticsSummary");
        
        const baseQuery = (start: Date, end: Date, extra: any[] = []) => firestoreQuery(
          collection(db, 'appointments'),
          where('organization_id', '==', organizationId),
          where('appointment_date', '>=', formatDateToLocalISO(start)),
          where('appointment_date', '<=', formatDateToLocalISO(end)),
          ...extra
        );

        const [
          currentAppointmentsSnap,
          lastAppointmentsSnap,
          activePatientsSnap,
          lastMonthPatientsSnap,
          currentPaymentsSnap,
          lastPaymentsSnap,
        ] = await Promise.all([
          getDocs(baseQuery(currentMonthStart, currentMonthEnd)),
          getDocs(baseQuery(lastMonthStart, lastMonthEnd)),
          getDocs(baseQuery(subMonths(now, 1), now)),
          getDocs(baseQuery(subMonths(now, 2), lastMonthEnd)),
          getDocs(baseQuery(currentMonthStart, currentMonthEnd, [where('payment_status', '==', 'pago')])),
          getDocs(baseQuery(lastMonthStart, lastMonthEnd, [where('payment_status', '==', 'pago')])),
        ]);

        return calculateStats(
          currentAppointmentsSnap.docs.length,
          lastAppointmentsSnap.docs.length,
          new Set(currentAppointmentsSnap.docs.map(d => d.data().patient_id).filter(Boolean)).size,
          new Set(lastMonthPatientsSnap.docs.map(d => d.data().patient_id).filter(Boolean)).size,
          currentPaymentsSnap.docs.reduce((sum, d) => sum + (d.data().payment_amount || 0), 0),
          lastPaymentsSnap.docs.reduce((sum, d) => sum + (d.data().payment_amount || 0), 0)
        );
      } catch (error) {
        logger.error("Erro ao carregar analytics summary", error, "useAnalyticsSummary");
        return defaultSummary;
      }
    },
    ...queryConfigs.dynamic,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    summary: summary || defaultSummary,
    isLoading,
    error,
  };
}

const defaultSummary: AnalyticsSummary = {
  totalAppointments: 0,
  appointmentGrowth: 0,
  activePatients: 0,
  patientGrowth: 0,
  monthlyRevenue: 0,
  revenueGrowth: 0,
  occupancyRate: 0,
};

function calculateStats(
  currentApts: number,
  lastApts: number,
  activePatients: number,
  lastMonthPatients: number,
  monthlyRev: number,
  lastMonthRev: number
): AnalyticsSummary {
  const totalSlots = 160;
  return {
    totalAppointments: currentApts,
    appointmentGrowth: lastApts ? Math.round(((currentApts - lastApts) / lastApts) * 100) : 0,
    activePatients,
    patientGrowth: lastMonthPatients ? Math.round(((activePatients - lastMonthPatients) / lastMonthPatients) * 100) : 0,
    monthlyRevenue: monthlyRev,
    revenueGrowth: lastMonthRev ? Math.round(((monthlyRev - lastMonthRev) / lastMonthRev) * 100) : 0,
    occupancyRate: Math.min(Math.round((currentApts / totalSlots) * 100), 100),
  };
}
