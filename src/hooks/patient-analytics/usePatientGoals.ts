import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2";
import { toast } from "sonner";
import { PatientGoalTracking } from "@/types/patientAnalytics";
import { PATIENT_ANALYTICS_KEYS } from "./constants";

export function usePatientGoals(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.goals(patientId),
    queryFn: async (): Promise<PatientGoalTracking[]> => {
      if (!patientId) return [];
      const response = await analyticsApi.patientGoals.list(patientId);
      return response?.data ?? [];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<PatientGoalTracking, "id" | "created_at" | "updated_at">) => {
      const response = await analyticsApi.patientGoals.create(goal);
      return response?.data ?? goal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.goals(variables.patient_id),
      });
      toast.success("Objetivo criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar objetivo: " + error.message);
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      data,
    }: {
      goalId: string;
      data: Partial<PatientGoalTracking>;
    }) => {
      const response = await analyticsApi.patientGoals.update(goalId, data);
      return response?.data ?? { id: goalId, ...data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.goals(data.patient_id),
      });
      toast.success("Objetivo atualizado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar objetivo: " + error.message);
    },
  });
}

export function useCompleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const response = await analyticsApi.patientGoals.complete(goalId);
      return response?.data ?? { id: goalId, status: "achieved" };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: PATIENT_ANALYTICS_KEYS.goals(data.patient_id),
      });
      toast.success("🎉 Parabéns! Objetivo alcançado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao completar objetivo: " + error.message);
    },
  });
}
