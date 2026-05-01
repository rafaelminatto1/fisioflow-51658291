import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi, type PatientProgressSummary } from "@/api/v2";
import { toast } from "sonner";
import { PatientSessionMetrics } from "@/types/patientAnalytics";
import { PATIENT_ANALYTICS_KEYS, DEFAULT_PROGRESS_SUMMARY } from "./constants";

export function usePatientProgressSummary(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.progress(patientId),
    queryFn: async (): Promise<PatientProgressSummary> => {
      try {
        const response = await analyticsApi.patientProgress(patientId);
        return response?.data ?? DEFAULT_PROGRESS_SUMMARY;
      } catch {
        return DEFAULT_PROGRESS_SUMMARY;
      }
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePatientSessionMetrics(patientId: string, limitValue?: number) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.sessions(patientId), limitValue],
    queryFn: async (): Promise<PatientSessionMetrics[]> => {
      if (!patientId) return [];
      const response = await analyticsApi.patientSessionMetrics.list(patientId, {
        limit: limitValue,
      });
      return response?.data ?? [];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSessionMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metrics: Omit<PatientSessionMetrics, "id" | "created_at">) => {
      const response = await analyticsApi.patientSessionMetrics.create({
        patient_id: metrics.patient_id,
        session_id: metrics.session_id,
        session_date: metrics.session_date,
        session_number: metrics.session_number,
        pain_level_before: metrics.pain_level_before,
        functional_score_before: metrics.functional_score_before,
        mood_before: metrics.mood_before,
        duration_minutes: metrics.duration_minutes,
        treatment_type: metrics.treatment_type,
        techniques_used: metrics.techniques_used,
        areas_treated: metrics.areas_treated,
        pain_level_after: metrics.pain_level_after,
        functional_score_after: metrics.functional_score_after,
        mood_after: metrics.mood_after,
        patient_satisfaction: metrics.patient_satisfaction,
        pain_reduction: metrics.pain_reduction,
        functional_improvement: metrics.functional_improvement,
        notes: metrics.notes,
        therapist_id: metrics.therapist_id,
      });
      return response?.data ?? metrics;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.sessions(variables.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.progress(variables.patient_id),
      });
      toast.success("Métricas da sessão registradas");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar métricas: " + error.message);
    },
  });
}
