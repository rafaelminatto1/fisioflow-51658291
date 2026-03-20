import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api/workers-client";

export interface HEPComplianceData {
	planId: string;
	patientId: string;
	planName: string;
	totalDays: number;
	completedDays: number;
	rate: number;
	byExercise: Record<
		string,
		{ completed: number; total: number; rate: number }
	>;
	last14Days: Array<{ date: string; completed: boolean }>;
}

export function useHEPCompliance(planId: string | undefined) {
	return useQuery<HEPComplianceData>({
		queryKey: ["hep-compliance", planId],
		queryFn: async () => {
			const res = await request<{ data: HEPComplianceData }>(
				`/api/exercise-plans/${planId}/compliance`,
			);
			return res.data;
		},
		enabled: Boolean(planId),
		staleTime: 5 * 60 * 1000, // 5 min
	});
}
