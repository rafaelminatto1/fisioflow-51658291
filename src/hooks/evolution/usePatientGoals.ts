import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { goalsApi } from "@/api/v2";
import { PatientGoal } from "@/types/evolution";
import { normalizeGoalRow, normalizeGoalRows } from "@/lib/clinical/goalNormalization";

/**
 * usePatientGoals - Lista os objetivos do paciente
 */
export const usePatientGoals = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-goals", patientId],
    queryFn: async () => {
      const res = await goalsApi.list(patientId);
      return normalizeGoalRows(res?.data);
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
};

/**
 * useCreateGoal - Cria um novo objetivo
 */
export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      goal: Omit<PatientGoal, "id" | "created_at" | "updated_at" | "created_by" | "status"> & {
        status?: PatientGoal["status"];
      },
    ) => {
      const payload = {
        patient_id: goal.patient_id,
        goal_title: goal.goal_title,
        goal_description: goal.goal_description,
        description: goal.goal_title,
        category: goal.category,
        target_date: goal.target_date,
        target_value: goal.target_value,
        current_value: goal.current_value,
        current_progress: goal.current_progress,
        priority: goal.priority,
        status: goal.status || "em_andamento",
      };
      const res = await goalsApi.create(payload);
      if (!res?.data) throw new Error("Falha ao criar objetivo");
      return normalizeGoalRow(res.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["patient-goals", (data as PatientGoal).patient_id],
      });
      toast({
        title: "Objetivo criado",
        description: "O objetivo foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar objetivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

/**
 * useUpdateGoal - Atualiza dados do objetivo
 */
export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: Partial<PatientGoal> }) => {
      const res = await goalsApi.update(goalId, {
        goal_title: data.goal_title,
        goal_description: data.goal_description,
        description: data.goal_title,
        category: data.category,
        target_date: data.target_date,
        target_value: data.target_value,
        current_value: data.current_value,
        current_progress: data.current_progress,
        priority: data.priority,
        status: data.status,
        completed_at: data.completed_at,
      });
      if (!res?.data) throw new Error("Falha ao atualizar objetivo");
      return normalizeGoalRow(res.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["patient-goals", data.patient_id],
      });
      toast({ title: "Objetivo atualizado com sucesso" });
    },
  });
};

/**
 * useUpdateGoalStatus - Atualiza apenas o status
 */
export const useUpdateGoalStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      goalId,
      status,
    }: {
      goalId: string;
      status: "em_andamento" | "concluido" | "cancelado";
    }) => {
      const updates: Record<string, any> = { status };
      if (status === "concluido") {
        updates.completed_at = new Date().toISOString();
      }
      const res = await goalsApi.update(goalId, updates);
      if (!res?.data) throw new Error("Falha ao atualizar objetivo");
      return normalizeGoalRow(res.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["patient-goals", (data as PatientGoal).patient_id],
      });
      toast({
        title: "Objetivo atualizado",
        description: "O status do objetivo foi atualizado.",
      });
    },
  });
};

/**
 * useCompleteGoal - Atalho para concluir objetivo
 */
export const useCompleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const res = await goalsApi.update(goalId, {
        status: "concluido",
        completed_at: new Date().toISOString(),
      });
      if (!res?.data) throw new Error("Falha ao concluir objetivo");
      return normalizeGoalRow(res.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["patient-goals", data.patient_id],
      });
      toast({ title: "🎉 Objetivo concluído!" });
    },
  });
};

/**
 * useDeleteGoal - Exclui um objetivo
 */
export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalId: string) => {
      await goalsApi.delete(goalId);
      return goalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-goals"] });
      toast({ title: "Objetivo excluído com sucesso" });
    },
  });
};
