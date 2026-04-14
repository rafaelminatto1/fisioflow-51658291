import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export async function checkPatientNameDuplicate(
	name: string,
	organizationId?: string,
): Promise<{ duplicateExists: boolean }> {
	if (!name || name.trim().length < 3) {
		return { duplicateExists: false };
	}

	const response = await fetchApi<ApiResponse<{ duplicateExists: boolean }>>(
		"/api/patients/check-duplicate",
		{
			method: "POST",
			data: { name: name.trim(), organizationId },
		},
	);

	return { duplicateExists: response.data?.duplicateExists || false };
}
