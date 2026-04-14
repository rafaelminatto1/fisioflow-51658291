import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiHEPComplianceData {
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

export async function getHEPCompliance(
	planId: string,
): Promise<ApiHEPComplianceData> {
	const response = await fetchApi<ApiResponse<ApiHEPComplianceData>>(
		`/api/exercise-plans/${encodeURIComponent(planId)}/compliance`,
	);
	if (!response.data) throw new Error("Dados de compliance não encontrados");
	return response.data;
}

export async function getPatientExercisePlans(
	patientId: string,
): Promise<Array<{ id: string; name: string; created_at: string }>> {
	const response = await fetchApi<
		ApiResponse<Array<{ id: string; name: string; created_at: string }>>
	>("/api/exercise-plans", { params: { patientId } });
	return response.data || [];
}
