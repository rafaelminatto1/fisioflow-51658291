/**
 * useIntelligentReports - Migrated to Neon/Workers
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { analyticsApi } from "@/lib/api/workers-client";

export function useIntelligentReports(patientId?: string) {
	const generateReport = useMutation({
		mutationFn: async ({
			patientId,
			reportType,
			dateRange,
		}: {
			patientId: string;
			reportType: string;
			dateRange: { start: string; end: string };
		}) => {
			const response = await analyticsApi.intelligentReports.generate({
				patientId,
				reportType,
				dateRange,
			});
			return response?.data;
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao gerar relatório",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const { data: recentReports, isLoading } = useQuery({
		queryKey: ["recent-reports", patientId],
		queryFn: async () => {
			if (!patientId) return [];
			const response = await analyticsApi.intelligentReports.list(patientId);
			return response?.data ?? [];
		},
		enabled: !!patientId,
	});

	return {
		generateReport,
		recentReports,
		isLoading,
	};
}
