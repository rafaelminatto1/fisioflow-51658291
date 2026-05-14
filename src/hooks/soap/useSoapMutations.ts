import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sessionsApi } from "@/api/v2";
import {
  evolutionKeys,
  EvolutionOperationError,
  type CreateEvolutionData,
  type EvolutionRecord,
} from "./types";
import { invalidateSoapCache as invalidateEvolutionCache } from "./useSoapCache";
import { toEvolutionRecord } from "./mappers";
import { ErrorHandler } from "@/lib/errors/ErrorHandler";
import type {
  ProcedureItem,
  ExerciseItem,
  MeasurementItem,
  HomeExerciseItem,
} from "@/types/evolution";

export interface EvolutionMutationInput {
  patientId: string;
  observacao?: string;
  painScale?: number | null;
  procedures?: ProcedureItem[];
  exercises?: ExerciseItem[];
  measurements?: MeasurementItem[];
  homeExercises?: HomeExerciseItem[];
  recordDate?: string;
}

const toApiPayload = (input: Partial<EvolutionMutationInput>) => {
  const payload: Record<string, unknown> = {};
  if (input.observacao !== undefined) payload.observacao = input.observacao;
  if (input.painScale !== undefined) payload.pain_scale = input.painScale;
  if (input.procedures !== undefined) payload.procedures = input.procedures;
  if (input.exercises !== undefined) payload.exercises = input.exercises;
  if (input.measurements !== undefined) payload.measurements = input.measurements;
  if (input.homeExercises !== undefined) payload.home_exercises = input.homeExercises;
  if (input.recordDate !== undefined) payload.record_date = input.recordDate;
  return payload;
};

export const useCreateEvolution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: EvolutionMutationInput) => {
      const response = await sessionsApi.create({
        patient_id: data.patientId,
        ...toApiPayload(data),
        status: "draft",
      });
      return toEvolutionRecord(response.data as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      invalidateEvolutionCache(queryClient, data.patient_id, data.id);
      toast({ title: "Evolução salva", description: "Registro salvo com sucesso." });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, "useCreateEvolution");
    },
  });
};

export const useUpdateEvolution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: EvolutionMutationInput & { recordId: string }) => {
      const response = await sessionsApi.update(data.recordId, toApiPayload(data));
      return toEvolutionRecord(response.data as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      invalidateEvolutionCache(queryClient, data.patient_id, data.id);
      toast({ title: "Evolução atualizada", description: "Registro atualizado com sucesso." });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, "useUpdateEvolution");
    },
  });
};

export const useAutoSaveEvolution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEvolutionData & { recordId?: string }) => {
      const { recordId, ...rest } = data;
      const res = await sessionsApi.autosave({
        ...rest,
        patient_id: rest.patient_id,
        recordId,
        status: rest.status ?? "draft",
        record_date: rest.record_date ?? new Date().toISOString().split("T")[0],
      });
      return res.data as EvolutionRecord & { isNew?: boolean };
    },
    onSuccess: (result) => {
      if (result.patient_id) {
        queryClient.setQueryData(evolutionKeys.detail(result.id), result);
        queryClient.invalidateQueries({ queryKey: evolutionKeys.drafts(result.patient_id) });
      }
    },
    onError: () => {},
  });
};

export const useSignEvolution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const res = await sessionsApi.finalize(recordId);
      return res.data as EvolutionRecord;
    },
    onSuccess: (data) => {
      invalidateEvolutionCache(queryClient, data.patient_id, data.id);
      toast({
        title: "Evolução finalizada",
        description: "A evolução foi finalizada e assinada com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao finalizar evolução",
        description:
          error instanceof EvolutionOperationError ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteEvolution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recordId, patientId }: { recordId: string; patientId: string }) => {
      await sessionsApi.delete(recordId);
      return { recordId, patientId };
    },
    onSuccess: (result) => {
      invalidateEvolutionCache(queryClient, result.patientId, result.recordId);
      toast({
        title: "Evolução excluída",
        description: "A evolução foi excluída com sucesso.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro ao excluir evolução",
        description:
          error instanceof EvolutionOperationError ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

// ===== Backward-compatible aliases =====
export const useCreateSoapRecordV2 = useCreateEvolution;
export const useUpdateSoapRecordV2 = useUpdateEvolution;
export const useCreateSoapRecord = useCreateEvolution;
export const useUpdateSoapRecord = useUpdateEvolution;
export const useSignSoapRecord = useSignEvolution;
export const useDeleteSoapRecord = useDeleteEvolution;
export const useAutoSaveSoapRecord = useAutoSaveEvolution;
export const useAutoSaveSoapRecordV2 = () => {
  const create = useCreateEvolution();
  const update = useUpdateEvolution();
  return {
    mutateAsync: async (data: EvolutionMutationInput & { recordId?: string }) => {
      if (data.recordId) return update.mutateAsync({ ...data, recordId: data.recordId });
      return create.mutateAsync(data);
    },
    isPending: create.isPending || update.isPending,
  };
};
