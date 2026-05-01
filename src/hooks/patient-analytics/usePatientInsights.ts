import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2";
import { toast } from "sonner";
import { PatientInsight, ClinicalBenchmark } from "@/types/patientAnalytics";
import { PATIENT_ANALYTICS_KEYS } from "./constants";

export function usePatientInsights(patientId: string, includeAcknowledged = false) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.insights(patientId), includeAcknowledged],
    queryFn: async (): Promise<PatientInsight[]> => {
      if (!patientId) return [];
      const response = await analyticsApi.patientInsights.list(patientId, {
        includeAcknowledged,
      });
      return response?.data ?? [];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAcknowledgeInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      insightId,
      patientId: _patientId,
    }: {
      insightId: string;
      patientId: string;
    }) => {
      const response = await analyticsApi.patientInsights.acknowledge(insightId);
      return response?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.insights(variables.patientId),
      });
    },
    onError: (error: Error) => {
      toast.error("Erro ao confirmar insight: " + error.message);
    },
  });
}

export function useClinicalBenchmarks(benchmarkCategory?: string) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.benchmarks(), benchmarkCategory],
    queryFn: async (): Promise<ClinicalBenchmark[]> => {
      const response = await analyticsApi.clinicalBenchmarks.list(benchmarkCategory);
      return response?.data ?? [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
