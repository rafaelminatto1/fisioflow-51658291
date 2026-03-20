/**
 * Clinical Analytics Hook
 *
 * Fetches clinical insights from Workers analytics endpoints.
 */

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/workers-client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardMetrics {
	totalPatients: number;
	activePatients: number;
	totalAppointments: number;
	completedAppointments: number;
	totalRevenue: number;
	avgSessionDuration: number;
	topPainRegions: Array<{ name: string; value: number }>;
	engagementScore: number;
}

const DEFAULT_DASHBOARD: DashboardMetrics = {
	totalPatients: 0,
	activePatients: 0,
	totalAppointments: 0,
	completedAppointments: 0,
	totalRevenue: 0,
	avgSessionDuration: 0,
	topPainRegions: [],
	engagementScore: 0,
};

export function useClinicalAnalytics() {
	const { user } = useAuth();
	const organizationId = user?.organizationId || "default";

	const dashboardQuery = useQuery({
		queryKey: ["clinical-analytics", "dashboard", organizationId],
		queryFn: async (): Promise<DashboardMetrics> => {
			const response = await analyticsApi.dashboard();
			const data = response?.data ?? {};
			return {
				totalPatients: Number(data.totalPatients ?? data.activePatients ?? 0),
				activePatients: Number(data.activePatients ?? 0),
				totalAppointments: Number(data.totalAppointments ?? 0),
				completedAppointments: Number(data.completedAppointments ?? 0),
				totalRevenue: Number(data.monthlyRevenue ?? 0),
				avgSessionDuration: Number(data.avgSessionDuration ?? 0),
				topPainRegions: Array.isArray(data.topPainRegions)
					? (data.topPainRegions as Array<{ name: string; value: number }>)
					: [],
				engagementScore: Number(data.engagementScore ?? 0),
			};
		},
		enabled: !!organizationId,
	});

	const topExercisesQuery = useQuery({
		queryKey: ["clinical-analytics", "top-exercises", organizationId],
		queryFn: async () => {
			const response = await analyticsApi.topExercises(5);
			return response?.data ?? [];
		},
		enabled: !!organizationId,
	});

	const painMapQuery = useQuery({
		queryKey: ["clinical-analytics", "pain-map", organizationId],
		queryFn: async () => {
			const response = await analyticsApi.painMap(5);
			return response?.data ?? [];
		},
		enabled: !!organizationId,
	});

	return {
		dashboard: dashboardQuery.data ?? DEFAULT_DASHBOARD,
		topExercises: topExercisesQuery.data ?? [],
		painMap: painMapQuery.data ?? [],
		isLoading:
			dashboardQuery.isLoading ||
			topExercisesQuery.isLoading ||
			painMapQuery.isLoading,
		error:
			dashboardQuery.error || topExercisesQuery.error || painMapQuery.error,
		refetch: () => {
			dashboardQuery.refetch();
			topExercisesQuery.refetch();
			painMapQuery.refetch();
		},
	};
}

export function usePatientEvolution(patientId: string) {
	return useQuery({
		queryKey: ["clinical-analytics", "patient-evolution", patientId],
		queryFn: async () => {
			const response = await analyticsApi.patientEvolution(patientId);
			return response?.data ?? [];
		},
		enabled: !!patientId,
	});
}
