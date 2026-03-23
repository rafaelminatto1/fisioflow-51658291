import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

export interface TimelineEntry {
	id: string;
	entry_type: string;
	category: "communication" | "clinical";
	subject?: string;
	body?: string;
	status?: string;
	created_at: string;
	start_time?: string;
	end_time?: string;
}

export function usePatientTimeline(patientId: string | undefined) {
	return useQuery({
		queryKey: ["patient-timeline", patientId],
		queryFn: async () => {
			if (!patientId) return [];
			const res = await request<{ data: TimelineEntry[] }>(
				`/api/patients/${patientId}/timeline`,
			);
			return res.data || [];
		},
		enabled: !!patientId,
	});
}
