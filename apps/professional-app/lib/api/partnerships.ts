import { fetchApi } from "./client";
import type { ApiResponse, ApiPartnership } from "@/types/api";

export async function getPartnerships(options?: {
	activeOnly?: boolean;
}): Promise<ApiPartnership[]> {
	const response = await fetchApi<ApiResponse<ApiPartnership[]>>(
		"/api/contratados",
		{
			params: options?.activeOnly ? { active: true } : undefined,
		},
	);
	return response.data || [];
}

export async function getPartnershipById(
	id: string,
): Promise<ApiPartnership | null> {
	const response = await fetchApi<ApiResponse<ApiPartnership>>(
		`/api/contratados/${encodeURIComponent(id)}`,
	);
	return response.data ?? null;
}

export async function createPartnership(
	data: Partial<ApiPartnership>,
): Promise<ApiPartnership> {
	const response = await fetchApi<ApiResponse<ApiPartnership>>(
		"/api/contratados",
		{
			method: "POST",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	if (!response.data) throw new Error("Resposta inválida ao criar parceria");
	return response.data;
}

export async function updatePartnership(
	id: string,
	data: Partial<ApiPartnership>,
): Promise<ApiPartnership> {
	const response = await fetchApi<ApiResponse<ApiPartnership>>(
		`/api/contratados/${encodeURIComponent(id)}`,
		{
			method: "PUT",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	if (!response.data)
		throw new Error("Resposta inválida ao atualizar parceria");
	return response.data;
}

export async function deletePartnership(id: string): Promise<{ ok: boolean }> {
	await fetchApi(`/api/contratados/${encodeURIComponent(id)}`, {
		method: "DELETE",
	});
	return { ok: true };
}
