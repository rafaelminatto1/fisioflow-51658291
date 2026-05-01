import { PatientProgressSummary } from "@/api/v2";

export const PATIENT_ANALYTICS_KEYS = {
  all: ["patient-analytics"] as const,
  progress: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, "progress"] as const,
  lifecycle: (patientId: string) =>
    [...PATIENT_ANALYTICS_KEYS.all, patientId, "lifecycle"] as const,
  lifecycleEvents: (patientId: string) =>
    [...PATIENT_ANALYTICS_KEYS.all, patientId, "lifecycle-events"] as const,
  outcomes: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, "outcomes"] as const,
  sessions: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, "sessions"] as const,
  predictions: (patientId: string) =>
    [...PATIENT_ANALYTICS_KEYS.all, patientId, "predictions"] as const,
  risk: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, "risk"] as const,
  goals: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, "goals"] as const,
  insights: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, "insights"] as const,
  benchmarks: () => [...PATIENT_ANALYTICS_KEYS.all, "benchmarks"] as const,
  dashboard: (patientId: string) =>
    [...PATIENT_ANALYTICS_KEYS.all, patientId, "dashboard"] as const,
};

export const DEFAULT_PROGRESS_SUMMARY: PatientProgressSummary = {
  total_sessions: 0,
  avg_pain_reduction: null,
  total_pain_reduction: 0,
  avg_functional_improvement: null,
  current_pain_level: null,
  initial_pain_level: null,
  goals_achieved: 0,
  goals_in_progress: 0,
  overall_progress_percentage: null,
};
