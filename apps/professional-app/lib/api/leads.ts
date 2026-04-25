import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiLead {
  id: string;
  organization_id?: string;
  nome: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  telefone?: string | null;
  interesse?: string | null;
  estagio: "aguardando" | "contatado" | "interessado" | "agendado" | "convertido" | "perdido";
  status?: string | null;
  origem?: string | null;
  source?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ApiLeadHistory {
  id: string;
  lead_id: string;
  action: string;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  [key: string]: unknown;
}

function normalizeLead(rawLead: any): ApiLead {
  return {
    ...rawLead,
    id: String(rawLead.id),
    created_at: rawLead.created_at ?? new Date().toISOString(),
    updated_at: rawLead.updated_at ?? new Date().toISOString(),
  };
}

export async function getLeads(params?: any): Promise<ApiLead[]> {
  const response = await fetchApi<ApiResponse<ApiLead[]>>("/api/crm/leads", {
    params,
  });
  return (response.data || []).map(normalizeLead);
}

export async function getLeadById(id: string): Promise<ApiLead> {
  const response = await fetchApi<ApiResponse<ApiLead>>(`/api/crm/leads/${encodeURIComponent(id)}`);
  if (response.error) throw new Error(response.error);
  return normalizeLead(response.data);
}

export async function createLead(data: Partial<ApiLead>): Promise<ApiLead> {
  const response = await fetchApi<ApiResponse<ApiLead>>("/api/crm/leads", {
    method: "POST",
    data,
  });
  if (response.error) throw new Error(response.error);
  return normalizeLead(response.data);
}

export async function updateLead(id: string, data: Partial<ApiLead>): Promise<ApiLead> {
  const response = await fetchApi<ApiResponse<ApiLead>>(
    `/api/crm/leads/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      data,
    },
  );
  if (response.error) throw new Error(response.error);
  return normalizeLead(response.data);
}

export async function deleteLead(id: string): Promise<{ ok: boolean }> {
  const response = await fetchApi<{ ok: boolean }>(`/api/crm/leads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return { ok: response.ok };
}

export async function getLeadHistory(leadId: string): Promise<ApiLeadHistory[]> {
  const response = await fetchApi<ApiResponse<ApiLeadHistory[]>>(
    `/api/crm/leads/${encodeURIComponent(leadId)}/historico`,
  );
  return response.data || [];
}

export async function createLeadHistory(
  leadId: string,
  data: Partial<ApiLeadHistory>,
): Promise<ApiLeadHistory> {
  const response = await fetchApi<ApiResponse<ApiLeadHistory>>(
    `/api/crm/leads/${encodeURIComponent(leadId)}/historico`,
    {
      method: "POST",
      data,
    },
  );
  if (response.error) throw new Error(response.error);
  return response.data;
}
