export type TaskType = 
  | "soap_draft"
  | "patient_message"
  | "clinical_summary"
  | "clinical_reasoning"
  | "admin_report"
  | "rag_answer"
  | "exercise_suggestion"
  | "reengagement_message"
  | "discharge_summary"
  | "no_show_risk_explanation"
  | "clinical_rag_query"
  | "soap_evolution_generation"
  | "patient_longitudinal_summary"
  | "grammar_correction"
  | "json_extraction"
  | "protocol_knowledge_search";

export type DataExposureLevel = "none" | "minimal" | "clinical_context" | "full_internal_only";

export const AI_TASK_LIMITS: Record<TaskType, number> = {
  soap_draft: 4000,
  patient_message: 1000,
  clinical_summary: 8000,
  clinical_reasoning: 8000,
  admin_report: 4000,
  rag_answer: 4000,
  exercise_suggestion: 2000,
  reengagement_message: 1000,
  discharge_summary: 4000,
  no_show_risk_explanation: 2000,
  clinical_rag_query: 4000,
  soap_evolution_generation: 4000,
  patient_longitudinal_summary: 8000,
  grammar_correction: 2000,
  json_extraction: 2000,
  protocol_knowledge_search: 4000,
};

export const AI_TASK_PRIVACY_LEVELS: Record<TaskType, DataExposureLevel> = {
  soap_draft: "clinical_context",
  patient_message: "minimal",
  clinical_summary: "clinical_context",
  clinical_reasoning: "full_internal_only",
  admin_report: "none",
  rag_answer: "none",
  exercise_suggestion: "minimal",
  reengagement_message: "minimal",
  discharge_summary: "clinical_context",
  no_show_risk_explanation: "minimal",
  clinical_rag_query: "clinical_context",
  soap_evolution_generation: "clinical_context",
  patient_longitudinal_summary: "clinical_context",
  grammar_correction: "minimal",
  json_extraction: "minimal",
  protocol_knowledge_search: "none",
};
