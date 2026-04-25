import { fetchApi, cleanRequestData } from "./client";
import type { ApiResponse, ApiPatient } from "@/types/api";

export async function getPatients(
  organizationId?: string,
  options?: { status?: string; search?: string; limit?: number },
): Promise<ApiPatient[]> {
  const response = await fetchApi<ApiResponse<ApiPatient[]>>("/api/patients", {
    params: {
      organizationId,
      status: options?.status,
      search: options?.search,
      limit: options?.limit || 100,
      minimal: true,
    },
  });
  return response.data || [];
}

export async function getPatientById(id: string): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>(
    `/api/patients/${encodeURIComponent(id)}`,
  );
  if (!response.data) throw new Error("Paciente não encontrado");
  return response.data;
}

export async function createPatient(data: Partial<ApiPatient>): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>("/api/patients", {
    method: "POST",
    data,
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function updatePatient(id: string, data: Partial<ApiPatient>): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>(
    `/api/patients/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      data,
    },
  );
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function deletePatient(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/patients/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
