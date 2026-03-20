/**
 * useTreatmentCycles - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { treatmentCyclesApi } from "@/lib/api/workers-client";
import { fisioLogger as logger } from "@/lib/errors/logger";
import type { TreatmentCycle } from "@/components/evolution/TreatmentCycles";

const cycleKeys = {
	all: ["treatment-cycles"] as const,
	list: (patientId: string) => [...cycleKeys.all, "list", patientId] as const,
};

export type CreateCycleInput = Omit<TreatmentCycle, "id"> & {
	patient_id?: string;
};
export type UpdateCycleInput = Partial<Omit<TreatmentCycle, "id">>;

export function useTreatmentCycles(patientId: string) {
	const queryClient = useQueryClient();

	const cyclesQuery = useQuery({
		queryKey: cycleKeys.list(patientId),
		queryFn: async () => {
			if (!patientId) return [];
			const result = await treatmentCyclesApi.list(patientId);
			return (result.data ?? []) as unknown as TreatmentCycle[];
		},
		enabled: !!patientId,
		staleTime: 60_000,
		gcTime: 5 * 60_000,
	});

	const createCycleMutation = useMutation({
		mutationFn: async (input: CreateCycleInput) => {
			const result = await treatmentCyclesApi.create({
				...input,
				patient_id: input.patient_id ?? patientId,
			} as Record<string, unknown>);
			return result.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: cycleKeys.list(patientId) });
		},
		onError: (err) => {
			logger.error("Error creating treatment cycle", err, "useTreatmentCycles");
		},
	});

	const updateCycleMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: UpdateCycleInput;
		}) => {
			const result = await treatmentCyclesApi.update(
				id,
				data as Record<string, unknown>,
			);
			return result.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: cycleKeys.list(patientId) });
		},
		onError: (err) => {
			logger.error("Error updating treatment cycle", err, "useTreatmentCycles");
		},
	});

	const deleteCycleMutation = useMutation({
		mutationFn: async (cycleId: string) => {
			await treatmentCyclesApi.delete(cycleId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: cycleKeys.list(patientId) });
		},
		onError: (err) => {
			logger.error("Error deleting treatment cycle", err, "useTreatmentCycles");
		},
	});

	return {
		cycles: cyclesQuery.data ?? [],
		isLoading: cyclesQuery.isLoading,
		createCycle: createCycleMutation.mutateAsync,
		isCreating: createCycleMutation.isPending,
		updateCycle: updateCycleMutation.mutateAsync,
		isUpdating: updateCycleMutation.isPending,
		deleteCycle: deleteCycleMutation.mutateAsync,
		isDeleting: deleteCycleMutation.isPending,
	};
}
