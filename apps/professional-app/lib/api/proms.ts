import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiStandardizedTestResult {
	id: string;
	organization_id?: string;
	patient_id: string;
	scale_name: string;
	score: number;
	interpretation?: string | null;
	responses?: Record<string, unknown> | null;
	applied_at: string;
	applied_by?: string | null;
	session_id?: string | null;
	notes?: string | null;
	created_at?: string;
	updated_at?: string;
}

export async function getPatientStandardizedTests(
	patientId: string,
	options?: { scale?: string; limit?: number },
): Promise<ApiStandardizedTestResult[]> {
	const response = await fetchApi<ApiResponse<ApiStandardizedTestResult[]>>(
		"/api/standardized-tests",
		{ params: { patientId, scale: options?.scale, limit: options?.limit } },
	);
	return response.data || [];
}

export async function createStandardizedTestResult(
	data: Omit<ApiStandardizedTestResult, "id" | "created_at" | "updated_at">,
): Promise<ApiStandardizedTestResult> {
	const response = await fetchApi<ApiResponse<ApiStandardizedTestResult>>(
		"/api/standardized-tests",
		{ method: "POST", data },
	);
	if (response.error) throw new Error(response.error);
	return response.data;
}
