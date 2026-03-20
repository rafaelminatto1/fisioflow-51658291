/**
 * usePatientObjectives - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clinicalApi } from "@/lib/api/workers-client";

export interface PatientObjective {
	id: string;
	nome: string;
	descricao: string | null;
	categoria: string | null;
	ativo: boolean;
	organization_id: string | null;
	created_at: string;
}

export interface PatientObjectiveAssignment {
	id: string;
	patient_id: string;
	objective_id: string;
	prioridade: number;
	notas: string | null;
	created_at: string;
	objective?: PatientObjective;
}

export type PatientObjectiveFormData = Omit<
	PatientObjective,
	"id" | "created_at" | "organization_id"
>;

export function usePatientObjectives() {
	return useQuery({
		queryKey: ["patient-objectives"],
		queryFn: async () => {
			const res = await clinicalApi.patientObjectives.list();
			return (res.data ?? []) as PatientObjective[];
		},
	});
}

export function usePatientAssignedObjectives(patientId: string | undefined) {
	return useQuery({
		queryKey: ["patient-assigned-objectives", patientId],
		queryFn: async () => {
			if (!patientId) return [];
			const res = await clinicalApi.patientObjectiveAssignments.list(patientId);
			return (res.data ?? []) as PatientObjectiveAssignment[];
		},
		enabled: !!patientId,
	});
}

export function useCreatePatientObjective() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (objective: PatientObjectiveFormData) => {
			const res = await clinicalApi.patientObjectives.create(objective);
			return res.data as PatientObjective;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patient-objectives"] });
			toast.success("Objetivo criado com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao criar objetivo.");
		},
	});
}

export function useUpdatePatientObjective() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...objective
		}: Partial<PatientObjective> & { id: string }) => {
			const res = await clinicalApi.patientObjectives.update(id, objective);
			return res.data as PatientObjective;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patient-objectives"] });
			toast.success("Objetivo atualizado com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao atualizar objetivo.");
		},
	});
}

export function useDeletePatientObjective() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await clinicalApi.patientObjectives.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["patient-objectives"] });
			toast.success("Objetivo excluído com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao excluir objetivo.");
		},
	});
}

export function useAssignObjective() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			patientId,
			objectiveId,
			prioridade = 2,
			notas,
		}: {
			patientId: string;
			objectiveId: string;
			prioridade?: number;
			notas?: string;
		}) => {
			const res = await clinicalApi.patientObjectiveAssignments.create({
				patient_id: patientId,
				objective_id: objectiveId,
				prioridade,
				notas,
			});
			return res.data as PatientObjectiveAssignment;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["patient-assigned-objectives", variables.patientId],
			});
			toast.success("Objetivo atribuído ao paciente.");
		},
		onError: () => {
			toast.error("Erro ao atribuir objetivo.");
		},
	});
}

export function useRemoveObjectiveAssignment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id }: { id: string; patientId: string }) => {
			await clinicalApi.patientObjectiveAssignments.delete(id);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["patient-assigned-objectives", variables.patientId],
			});
			toast.success("Objetivo removido do paciente.");
		},
		onError: () => {
			toast.error("Erro ao remover objetivo.");
		},
	});
}
