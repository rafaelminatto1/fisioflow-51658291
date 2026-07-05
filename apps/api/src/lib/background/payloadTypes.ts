export type TaskType = 
  | "generate_embedding"
  | "update_longitudinal_summary"
  | "calculate_risk"
  | "generate_report";

export interface BackgroundJobPayload {
  jobId: string; // Identificador único (UUID) usado para idempotência
  organizationId: string;
  patientId?: string;
  sessionId?: string;
  taskType: TaskType;
  createdBy: string; // ID do usuário ou "system" para CRONs
  createdAt: string; // ISO 8601 string
  metadata?: Record<string, any>;
}
