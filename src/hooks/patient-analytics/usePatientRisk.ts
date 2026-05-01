import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2";
import { toast } from "sonner";
import { PatientPrediction, PatientRiskScore, PredictionType } from "@/types/patientAnalytics";
import { PATIENT_ANALYTICS_KEYS } from "./constants";

export function usePatientPredictions(patientId: string, predictionType?: PredictionType) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.predictions(patientId), predictionType],
    queryFn: async (): Promise<PatientPrediction[]> => {
      if (!patientId) return [];
      const response = await analyticsApi.patientPredictions.list(patientId, {
        predictionType,
        limit: 50,
      });
      return response?.data ?? [];
    },
    enabled: !!patientId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function usePatientRiskScore(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.risk(patientId),
    queryFn: async (): Promise<PatientRiskScore | null> => {
      if (!patientId) return null;
      const response = await analyticsApi.patientRisk(patientId);
      return response?.data ?? null;
    },
    enabled: !!patientId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUpdatePatientRiskScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_patientId: string) => {
      // Endpoint to be implemented in Cloudflare Workers
      throw new Error("RPC function not implemented - needs Cloudflare Worker endpoint");
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.risk(patientId),
      });
      toast.success("Score de risco atualizado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar score de risco: " + error.message);
    },
  });
}
