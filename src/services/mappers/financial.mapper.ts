import type { Transacao } from "@/types/workers";
import type { PatientFinancialRecord } from "@/types";

// ─── Transacao mapper ────────────────────────────────────────────────────────

/**
 * Maps a raw `Transacao` DB record to a normalized form suitable for display.
 * The `Transacao` type is already fairly flat; this mapper ensures numeric
 * coercion and provides safe defaults for optional fields.
 *
 * @param row - The raw `Transacao` record from the financial transactions table.
 * @returns A normalized `Transacao` with coerced numeric values and safe defaults.
 */
export function mapTransacaoRow(row: Transacao): Transacao {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    tipo: row.tipo,
    valor: Number(row.valor) || 0,
    data_transacao: row.data_transacao ?? "",
    descricao: row.descricao ?? null,
    dre_categoria: row.dre_categoria ?? null,
    status: row.status,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

// ─── PatientFinancialRecord mapper ──────────────────────────────────────────

/**
 * Maps a raw API response object to a `PatientFinancialRecord`.
 * Handles snake_case → camelCase field conversion and numeric coercion.
 *
 * @param row - The raw API/DB row for a patient financial record.
 * @returns A fully-typed `PatientFinancialRecord`.
 */
export function mapPatientFinancialRow(row: Record<string, unknown>): PatientFinancialRecord {
  return {
    id: String(row["id"] ?? ""),
    organization_id: String(row["organization_id"] ?? ""),
    patient_id: String(row["patient_id"] ?? ""),
    appointment_id: (row["appointment_id"] as string | undefined) ?? undefined,
    session_date: String(row["session_date"] ?? ""),
    session_value: Number(row["session_value"]) || 0,
    discount_value: Number(row["discount_value"]) || 0,
    discount_type: (row["discount_type"] as PatientFinancialRecord["discount_type"]) ?? undefined,
    partnership_id: (row["partnership_id"] as string | undefined) ?? undefined,
    partnership: (row["partnership"] as PatientFinancialRecord["partnership"]) ?? undefined,
    final_value: Number(row["final_value"]) || 0,
    payment_method: (row["payment_method"] as PatientFinancialRecord["payment_method"]) ?? undefined,
    payment_status: (row["payment_status"] as PatientFinancialRecord["payment_status"]) ?? "pending",
    paid_amount: Number(row["paid_amount"]) || 0,
    paid_date: (row["paid_date"] as string | undefined) ?? undefined,
    notes: (row["notes"] as string | undefined) ?? undefined,
    is_barter: Boolean(row["is_barter"]),
    barter_notes: (row["barter_notes"] as string | undefined) ?? undefined,
    created_by: (row["created_by"] as string | undefined) ?? undefined,
    created_at: String(row["created_at"] ?? new Date().toISOString()),
    updated_at: String(row["updated_at"] ?? new Date().toISOString()),
  };
}
