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


/** Status "pago" aceitos — o Worker grava o que recebe e há registros em pt e en. */
const PAID_STATUSES = new Set(["paid", "concluido", "concluído", "completed"]);

export function isPaidStatus(status?: string | null): boolean {
  return PAID_STATUSES.has(String(status || "").toLowerCase());
}

/**
 * `GET /api/financial/accounts` devolve as colunas de `financial_accounts` em
 * inglês (amount, due_date, payment_method, paid_at). Até 08/2026 este mapper lia
 * `valor`/`data_vencimento`/`forma_pagamento`, nomes de uma API anterior — o que
 * não importava porque a rota chamada (`/api/financial/contas`) nem existia.
 * Os nomes antigos ficam como fallback para não quebrar dado legado.
 */
function mapDbRecordToApiRecord(dbRecord: any): ApiFinancialRecord {
  const amount = Number(dbRecord.amount ?? dbRecord.valor ?? 0);
  const paid = isPaidStatus(dbRecord.status);

  return {
    id: dbRecord.id,
    organization_id: dbRecord.organization_id,
    patient_id: dbRecord.patient_id,
    appointment_id: dbRecord.appointment_id,
    session_date:
      dbRecord.due_date ?? dbRecord.data_vencimento ?? dbRecord.created_at?.split("T")[0],
    session_value: amount,
    discount_value: 0,
    discount_type: undefined,
    partnership_id: undefined,
    final_value: amount,
    payment_method: dbRecord.payment_method ?? dbRecord.forma_pagamento,
    payment_status: paid ? "paid" : "pending",
    paid_amount: paid ? amount : 0,
    paid_date: dbRecord.paid_at ?? dbRecord.pago_em,
    notes: dbRecord.notes ?? dbRecord.observacoes,
    is_barter: false,
    barter_notes: undefined,
    created_by: undefined,
    created_at: dbRecord.created_at,
    updated_at: dbRecord.updated_at,
    patient_name: dbRecord.patient_name,
  };
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

/**
 * Contas a receber do paciente.
 *
 * Path: `/api/financial/accounts`. Até 08/2026 o app chamava
 * `/api/financial/contas`, que nunca existiu no Worker — toda a aba financeira do
 * paciente vinha vazia (ou com erro) desde sempre.
 */
export async function getPatientFinancialRecords(
  patientId: string,
  options?: { status?: string },
): Promise<ApiFinancialRecord[]> {
  const response = await fetchApi<ApiResponse<any[]>>("/api/financial/accounts", {
    params: {
      patientId,
      status: options?.status ? (options.status === "paid" ? "paid" : "pending") : undefined,
    },
  });
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
  const response = await fetchApi<ApiResponse<any[]>>(`/api/financial/accounts${queryString}`);
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
  const response = await fetchApi<ApiResponse<any>>("/api/financial/accounts", {
    method: "POST",
    data: {
      type: "receita",
      amount: data.session_value,
      status: "pending",
      description: `Sessão em ${data.session_date}`,
      patient_id: data.patient_id,
      payment_method: data.payment_method,
      notes: data.notes,
      due_date: data.session_date.split("T")[0],
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
    updateData.status = data.payment_status === "paid" ? "paid" : "pending";
  if (data.payment_method !== undefined) updateData.payment_method = data.payment_method;
  if (data.final_value !== undefined) updateData.amount = data.final_value;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const response = await fetchApi<ApiResponse<any>>(
    `/api/financial/accounts/${encodeURIComponent(recordId)}`,
    {
      method: "PUT",
      data: updateData,
    },
  );
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}

export async function deleteFinancialRecord(recordId: string): Promise<void> {
  await fetchApi<{ success: boolean }>(
    `/api/financial/accounts/${encodeURIComponent(recordId)}`,
    { method: "DELETE" },
  );
}

export async function markFinancialRecordAsPaid(
  recordId: string,
  paymentMethod: string,
  paidDate?: string,
): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<any>>(
    `/api/financial/accounts/${encodeURIComponent(recordId)}`,
    {
      method: "PUT",
      data: {
        status: "paid",
        payment_method: paymentMethod,
        paid_at: paidDate || new Date().toISOString().split("T")[0],
      },
    },
  );
  if (response.error) throw new Error(response.error);
  return mapDbRecordToApiRecord(response.data);
}
