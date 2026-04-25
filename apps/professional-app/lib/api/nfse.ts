import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiNFSeRecord {
  id: string;
  patient_id?: string;
  appointment_id?: string;
  numero_nfse?: string;
  numero_rps: string;
  serie_rps: string;
  data_emissao: string;
  valor_servico: number;
  aliquota_iss: number;
  valor_iss?: number;
  status: "rascunho" | "enviado" | "autorizado" | "cancelado" | "erro";
  codigo_verificacao?: string;
  link_nfse?: string;
  tomador_nome?: string;
  created_at: string;
}

export async function getNFSeList(params?: {
  patientId?: string;
  month?: string;
  status?: string;
}): Promise<ApiNFSeRecord[]> {
  const response = await fetchApi<ApiResponse<ApiNFSeRecord[]>>("/api/nfse", {
    params: params as any,
  });
  return response.data || [];
}

export async function generateNFSe(data: {
  patient_id?: string;
  appointment_id?: string;
  valor_servico: number;
  discriminacao?: string;
  tomador_nome?: string;
  tomador_cpf_cnpj?: string;
}): Promise<ApiNFSeRecord> {
  const response = await fetchApi<ApiResponse<ApiNFSeRecord>>("/api/nfse", {
    method: "POST",
    data,
  });
  if (response.error) throw new Error(response.error);
  return response.data;
}

export async function cancelNFSe(id: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/nfse/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
}
