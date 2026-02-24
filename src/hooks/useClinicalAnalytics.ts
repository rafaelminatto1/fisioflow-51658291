/**
 * Clinical Analytics Hook
 *
 * Fetches clinical insights from BigQuery endpoints.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/firebase/functions';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMetrics {
  totalPatients: number;
  activePatients: number;
  totalAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  avgSessionDuration: number;
  topPainRegions: any[];
  engagementScore: number;
}

export function useClinicalAnalytics() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || 'default';

  const dashboardQuery = useQuery({
    queryKey: ['clinical-analytics', 'dashboard', organizationId],
    queryFn: () => api.analytics.getDashboard(organizationId),
    enabled: !!organizationId,
  });

  const topExercisesQuery = useQuery({
    queryKey: ['clinical-analytics', 'top-exercises', organizationId],
    queryFn: () => api.analytics.getTopExercises(organizationId),
    enabled: !!organizationId,
  });

  const painMapQuery = useQuery({
    queryKey: ['clinical-analytics', 'pain-map', organizationId],
    queryFn: () => api.analytics.getPainMap(organizationId),
    enabled: !!organizationId,
  });

  return {
    dashboard: dashboardQuery.data as DashboardMetrics | undefined,
    topExercises: topExercisesQuery.data as any[],
    painMap: painMapQuery.data as any,
    isLoading: dashboardQuery.isLoading || topExercisesQuery.isLoading || painMapQuery.isLoading,
    error: dashboardQuery.error || topExercisesQuery.error || painMapQuery.error,
    refetch: () => {
      dashboardQuery.refetch();
      topExercisesQuery.refetch();
      painMapQuery.refetch();
    }
  };
}

export function usePatientEvolution(patientId: string) {
  return useQuery({
    queryKey: ['clinical-analytics', 'patient-evolution', patientId],
    queryFn: () => api.analytics.getPatientEvolution(patientId),
    enabled: !!patientId,
  });
}
