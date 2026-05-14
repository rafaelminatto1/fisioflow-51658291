/**
 * Backward-compatible alias names: these used to be the "SOAP" hooks.
 * The system now stores a single free-text `observacao` with structured
 * siblings (pain_scale, procedures, exercises, measurements, home_exercises).
 * The `Soap*` symbols are kept for migration; new code should prefer the
 * `Evolution*` types.
 */
import type {
  ProcedureItem,
  ExerciseItem,
  MeasurementItem,
  HomeExerciseItem,
} from "@/types/evolution";

export type EvolutionStatus = "draft" | "finalized" | "cancelled";
export type SoapStatus = EvolutionStatus;

export const evolutionKeys = {
  all: ["evolution-records"] as const,
  lists: () => [...evolutionKeys.all, "list"] as const,
  list: (patientId: string, filters?: { status?: EvolutionStatus; limit?: number }) =>
    [...evolutionKeys.lists(), patientId, filters] as const,
  details: () => [...evolutionKeys.all, "detail"] as const,
  detail: (id: string) => [...evolutionKeys.details(), id] as const,
  drafts: (patientId: string) => [...evolutionKeys.all, "drafts", patientId] as const,
  templates: (therapistId?: string) => [...evolutionKeys.all, "templates", therapistId] as const,
  attachments: (sessionId?: string, patientId?: string) =>
    [...evolutionKeys.all, "attachments", sessionId, patientId] as const,
} as const;

export const soapKeys = evolutionKeys;

export class EvolutionOperationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "EvolutionOperationError";
  }
}

export const SoapOperationError = EvolutionOperationError;

export interface EvolutionRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  session_number?: number;
  observacao: string;
  pain_scale: number | null;
  procedures: ProcedureItem[];
  exercises: ExerciseItem[];
  measurements: MeasurementItem[];
  home_exercises: HomeExerciseItem[];
  status: EvolutionStatus;
  duration_minutes?: number;
  last_auto_save_at?: string;
  finalized_at?: string;
  finalized_by?: string;
  record_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
  signature_hash?: string;
  is_edited?: boolean;
  last_edited_by?: string;
  edit_reason?: string;
  /** @deprecated SOAP foi removido. Mantido transitoriamente até Fase 7. */
  subjective?: string;
  /** @deprecated SOAP foi removido. */
  objective?: string;
  /** @deprecated SOAP foi removido. */
  assessment?: string;
  /** @deprecated SOAP foi removido. */
  plan?: string;
  /** @deprecated use `pain_scale`. */
  pain_level?: number | null;
  /** @deprecated não mais coletado no novo modelo. */
  pain_location?: string;
  /** @deprecated não mais coletado no novo modelo. */
  pain_character?: string;
}

export type SoapRecord = EvolutionRecord;
export type SoapRecordV2 = EvolutionRecord;

export interface CreateEvolutionData {
  patient_id: string;
  appointment_id?: string;
  therapist_id?: string;
  observacao?: string;
  pain_scale?: number | null;
  procedures?: ProcedureItem[];
  exercises?: ExerciseItem[];
  measurements?: MeasurementItem[];
  home_exercises?: HomeExerciseItem[];
  status?: EvolutionStatus;
  duration_minutes?: number;
  record_date?: string;
  /** @deprecated removido com SOAP. Mantido até Fase 7. */
  subjective?: string;
  /** @deprecated */
  objective?: string;
  /** @deprecated */
  assessment?: string;
  /** @deprecated */
  plan?: string;
  /** @deprecated */
  pain_level?: number | null;
  /** @deprecated */
  pain_location?: string;
  /** @deprecated */
  pain_character?: string;
}

export type CreateSoapRecordData = CreateEvolutionData;

export interface UpdateEvolutionData extends Partial<CreateEvolutionData> {
  status?: EvolutionStatus;
}

export type UpdateSoapRecordData = UpdateEvolutionData;

export type SessionAttachmentCategory = "exam" | "imaging" | "document" | "before_after" | "other";

export type SessionAttachmentFileType = "pdf" | "jpg" | "png" | "docx" | "other";

export interface SessionAttachment {
  id: string;
  soap_record_id?: string;
  patient_id: string;
  file_name: string;
  original_name?: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: SessionAttachmentFileType;
  mime_type?: string;
  category: SessionAttachmentCategory;
  size_bytes?: number;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface SessionTemplate {
  id: string;
  organization_id?: string;
  therapist_id?: string;
  name: string;
  description?: string;
  category?: string | null;
  body_html: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
  /** @deprecated SOAP removido — usar body_html. */
  subjective?: string;
  /** @deprecated */
  objective?: string | Record<string, unknown>;
  /** @deprecated */
  assessment?: string;
  /** @deprecated */
  plan?: string | Record<string, unknown>;
}
