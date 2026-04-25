import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiFinancialRecord {
  id: string;
  organization_id: string;
  patient_id: string;
  appointment_id?: string;
  session_date: string;
  session_value: number;
  discount_value: number;
  discount_type?: "percentage" | "fixed" | "partnership";
  partnership_id?: string;
  partnership?: {
    name: string;
    discount_type: string;
    discount_value: number;
  };
  final_value: number;
  payment_method?: string;
  payment_status: string;
  paid_amount: number;
  paid_date?: string;
  notes?: string;
  is_barter: boolean;
  barter_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
}

export interface ApiFinancialSummary {
  total_sessions: number;
  paid_sessions: number;
  pending_sessions: number;
  total_value: number;
  total_paid: number;
  total_pending: number;
  average_session_value: number;
}

function mapDbRecordToApiRecord(dbRecord: any): ApiFinancialRecord {
  return {
    id: dbRecord.id,
    organization_id: dbRecord.organization_id,
    patient_id: dbRecord.patient_id,
    appointment_id: dbRecord.appointment_id,
    session_date: dbRecord.data_vencimento || dbRecord.created_at?.split("T")[0],
    session_value: Number(dbRecord.valor),
    discount_value: 0,
    discount_type: undefined,
    partnership_id: undefined,
    final_value: Number(dbRecord.valor),
    payment_method: dbRecord.forma_pagamento,
    payment_status: dbRecord.status === "concluido" ? "paid" : "pending",
    paid_amount: dbRecord.status === "concluido" ? Number(dbRecord.valor) : 0,
    paid_date: dbRecord.pago_em,
    notes: dbRecord.observacoes,
    is_barter: false,
    barter_notes: undefined,
    created_by: undefined,
    created_at: dbRecord.created_at,
    updated_at: dbRecord.updated_at,
    patient_name: dbRecord.patient_name,
  };
}

export async function getPatientFinancialRecords(
  patientId: string,
  options?: { status?: string },
): Promise<ApiFinancialRecord[]> {
  const response = await fetchApi<ApiResponse<any[]>>(
    `/api/financial/contas?patientId=${patientId}${options?.status ? `&status=${options.status === "paid" ? "concluido" : "pendente"}` : ""}`,
  );
  return (response.data || []).map(mapDbRecordToApiRecord);
}

export async function getPatientFinancialSummary(patientId: string): Promise<ApiFinancialSummary> {
  const records = await getPatientFinancialRecords(patientId);

  const paidRecords = records.filter((r) => r.payment_status === "paid");
  const pendingRecords = records.filter((r) => r.payment_status === "pending");

  return {
    total_sessions: records.length,
    paid_sessions: paidRecords.length,
    pending_sessions: pendingRecords.length,
    total_value: records.reduce((sum, r) => sum + r.session_value, 0),
    total_paid: paidRecords.reduce((sum, r) => sum + r.final_value, 0),
    total_pending: pendingRecords.reduce((sum, r) => sum + r.final_value, 0),
    average_session_value:
      records.length > 0
        ? records.reduce((sum, r) => sum + r.session_value, 0) / records.length
        : 0,
  };
}

export async function getAllFinancialRecords(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<(ApiFinancialRecord & { patient_name: string })[]> {
  const params: string[] = [];
  if (options?.startDate) params.push(`dateFrom=${options.startDate}`);
  if (options?.endDate) params.push(`dateTo=${options.endDate}`);

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  const response = await fetchApi<ApiResponse<any[]>>(`/api/financial/contas${queryString}`);
  return (response.data || []).map(mapDbRecordToApiRecord) as (ApiFinancialRecord & {
    patient_name: string;
  })[];
}

export async function createFinancialRecord(data: {
  patient_id: string;
  session_date: string;
  session_value: number;
  payment_method?: string;
  notes?: string;
}): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<any>>("/api/financial/contas", {
    method: "POST",
    data: {
      tipo: "receita",
      valor: data.session_value,
      status: "pendente",
      descricao: `Sessão em ${data.session_date}`,
      patient_id: data.patient_id,
      forma_pagamento: data.payment_method,
      observacoes: data.notes,
      data_vencimento: data.session_date.split("T")[0],
    },
  });
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}

export async function updateFinancialRecord(
  recordId: string,
  data: Partial<ApiFinancialRecord>,
): Promise<ApiFinancialRecord> {
  const updateData: any = {};

  if (data.payment_status !== undefined)
    updateData.status = data.payment_status === "paid" ? "concluido" : "pendente";
  if (data.payment_method !== undefined) updateData.forma_pagamento = data.payment_method;
  if (data.final_value !== undefined) updateData.valor = data.final_value;
  if (data.notes !== undefined) updateData.observacoes = data.notes;

  const response = await fetchApi<ApiResponse<any>>(`/api/financial/contas/${recordId}`, {
    method: "PUT",
    data: updateData,
  });
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}

export async function deleteFinancialRecord(recordId: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/financial/contas/${recordId}`, {
    method: "DELETE",
  });
}

export async function markFinancialRecordAsPaid(
  recordId: string,
  paymentMethod: string,
  paidDate?: string,
): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<any>>(`/api/financial/contas/${recordId}`, {
    method: "PUT",
    data: {
      status: "concluido",
      forma_pagamento: paymentMethod,
      pago_em: paidDate || new Date().toISOString().split("T")[0],
    },
  });
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}
