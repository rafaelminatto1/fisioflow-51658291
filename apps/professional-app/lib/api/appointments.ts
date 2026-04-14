import { fetchApi, cleanRequestData } from "./client";
import type { ApiResponse, ApiAppointment } from "@/types/api";

function normalizeAppointment(apiAppointment: ApiAppointment): ApiAppointment {
	return {
		...apiAppointment,
		patientId: apiAppointment.patientId ?? apiAppointment.patient_id,
		therapistId: apiAppointment.therapistId ?? apiAppointment.therapist_id,
		organizationId:
			apiAppointment.organizationId ?? apiAppointment.organization_id,
		startTime: apiAppointment.startTime ?? apiAppointment.start_time,
		endTime: apiAppointment.endTime ?? apiAppointment.end_time,
		isGroup: apiAppointment.isGroup ?? apiAppointment.is_group,
		additionalNames:
			apiAppointment.additionalNames ?? apiAppointment.additional_names,
		isUnlimited: apiAppointment.isUnlimited ?? apiAppointment.is_unlimited,
	};
}

function normalizeAppointmentPayload(
	data: Partial<ApiAppointment>,
): Record<string, unknown> {
	return cleanRequestData({
		...data,
		patient_id: data.patient_id ?? data.patientId,
		therapist_id: data.therapist_id ?? data.therapistId,
		organization_id: data.organization_id ?? data.organizationId,
		start_time: data.start_time ?? data.startTime,
		end_time: data.end_time ?? data.endTime,
		is_group: data.is_group ?? (data as any).isGroup,
		additional_names: data.additional_names ?? (data as any).additionalNames,
		is_unlimited: data.is_unlimited ?? (data as any).isUnlimited,
	});
}

export async function getAppointments(
	organizationId?: string,
	options?: {
		dateFrom?: string;
		dateTo?: string;
		therapistId?: string;
		status?: string;
		patientId?: string;
		limit?: number;
	},
): Promise<ApiAppointment[]> {
	const response = await fetchApi<ApiResponse<ApiAppointment[]>>(
		"/api/appointments",
		{
			params: {
				organizationId,
				dateFrom: options?.dateFrom,
				dateTo: options?.dateTo,
				therapistId: options?.therapistId,
				status: options?.status,
				patientId: options?.patientId,
				limit: options?.limit || 100,
			},
		},
	);
	return (response.data || []).map(normalizeAppointment);
}

export async function getAppointmentById(id: string): Promise<ApiAppointment> {
	const response = await fetchApi<ApiResponse<ApiAppointment>>(
		`/api/appointments/${encodeURIComponent(id)}`,
	);
	if (!response.data) throw new Error("Agendamento não encontrado");
	return normalizeAppointment(response.data);
}

export async function createAppointment(
	data: Partial<ApiAppointment>,
): Promise<ApiAppointment> {
	const response = await fetchApi<ApiResponse<ApiAppointment>>(
		"/api/appointments",
		{
			method: "POST",
			data: normalizeAppointmentPayload(data),
		},
	);
	if (response.error) throw new Error(response.error);
	return normalizeAppointment(response.data);
}

export async function updateAppointment(
	id: string,
	data: Partial<ApiAppointment>,
): Promise<ApiAppointment> {
	const response = await fetchApi<ApiResponse<ApiAppointment>>(
		`/api/appointments/${encodeURIComponent(id)}`,
		{
			method: "PATCH",
			data: normalizeAppointmentPayload(data),
		},
	);
	if (response.error) throw new Error(response.error);
	return normalizeAppointment(response.data);
}

export async function cancelAppointment(
	id: string,
	reason?: string,
): Promise<{ success: boolean }> {
	return fetchApi<{ success: boolean }>(
		`/api/appointments/${encodeURIComponent(id)}/cancel`,
		{
			method: "POST",
			data: { reason },
		},
	);
}
