import type { SoapRecordV2 } from "./types";

/**
 * Mapper for SOAP Records V2
 *
 * Converte dados crus da API (que podem vir em snake_case ou camelCase)
 * para o formato padronizado CamelCase da aplicação.
 */
export const toSoapRecordV2 = (record: Record<string, unknown>): SoapRecordV2 => ({
  id: String(record.id),
  patientId: String(record.patient_id ?? record.patientId ?? ""),
  recordDate: String(
    record.record_date ?? record.recordDate ?? new Date().toISOString().slice(0, 10),
  ),
  subjective: typeof record.subjective === "string" ? record.subjective : "",
  objective: typeof record.objective === "string" ? record.objective : "",
  assessment: typeof record.assessment === "string" ? record.assessment : "",
  plan: typeof record.plan === "string" ? record.plan : "",
  createdAt: String(record.created_at ?? record.createdAt ?? new Date().toISOString()),
  createdBy:
    typeof record.created_by === "string"
      ? record.created_by
      : typeof record.createdBy === "string"
        ? record.createdBy
        : "Desconhecido",
});
