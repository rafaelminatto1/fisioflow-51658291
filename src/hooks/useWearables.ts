/**
 * useWearables - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { wearablesApi } from "@/lib/api/workers-client";

export interface WearableDataPoint {
	id: string;
	patient_id: string;
	source: string;
	data_type: string;
	value: number;
	unit?: string;
	timestamp: string;
	created_at: string;
	organization_id?: string;
}

export const useWearables = (patientId?: string) => {
	const queryClient = useQueryClient();

	const {
		data: wearableData = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["wearables", patientId],
		queryFn: async () => {
			if (!patientId) return [];
			const result = await wearablesApi.list({ patientId });
			return (result.data ?? []) as WearableDataPoint[];
		},
		enabled: !!patientId,
	});

	const addWearableData = useMutation({
		mutationFn: async (
			newData: Omit<WearableDataPoint, "id" | "created_at">,
		) => {
			const result = await wearablesApi.create(
				newData as Record<string, unknown>,
			);
			return result.data as WearableDataPoint;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["wearables", patientId] });
			toast.success("Dado adicionado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao adicionar dado: " + error.message);
		},
	});

	return {
		wearableData,
		isLoading,
		error,
		addWearableData: addWearableData.mutate,
		isAdding: addWearableData.isPending,
	};
};
