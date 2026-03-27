import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { TreatmentProtocol } from "@/types";
import { useHaptics } from "./useHaptics";

export function useProtocols() {
	const { user } = useAuthStore();
	const queryClient = useQueryClient();
	const { success, error: errorHaptic } = useHaptics();

	// Fetch all protocols for the professional
	const {
		data: protocols = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["protocols", user?.id],
		queryFn: async () => {
			if (!user?.id) return [];
			const response = await fetchApi<any>(`/api/protocols`, {
				params: { professionalId: user.id, limit: 500 },
			});
			// Mapeia campos da API (snake_case) para o tipo frontend
			return ((response.data || []) as any[]).map((p: any): TreatmentProtocol => ({
				id: p.id,
				name: p.name || '',
				description: p.description || '',
				category: p.protocolType || p.category || 'Geral',
				condition: p.conditionName || p.condition || '',
				duration: p.weeksTotal ? `${p.weeksTotal} semanas` : '',
				exercises: p.exercises || [],
				isTemplate: p.isTemplate ?? false,
				createdAt: p.createdAt || p.created_at || new Date().toISOString(),
				updatedAt: p.updatedAt || p.updated_at || new Date().toISOString(),
				tags: p.tags || [],
				evidenceLevel: p.evidenceLevel || '',
				phases: p.phases || [],
			}));
		},
		enabled: !!user?.id,
	});

	// Create protocol
	const createMutation = useMutation({
		mutationFn: async (
			data: Omit<TreatmentProtocol, "id" | "createdAt" | "updatedAt">,
		) => {
			if (!user?.id) throw new Error("User not authenticated");
			const response = await fetchApi<any>("/api/protocols", {
				method: "POST",
				data: {
					...data,
					professionalId: user.id,
				},
			});
			return response.data?.id;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["protocols"] });
			success();
		},
		onError: () => {
			errorHaptic();
		},
	});

	// Update protocol
	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<TreatmentProtocol>;
		}) => {
			await fetchApi(`/api/protocols/${id}`, {
				method: "PUT",
				data,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["protocols"] });
			success();
		},
		onError: () => {
			errorHaptic();
		},
	});

	// Delete protocol (soft delete)
	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			await fetchApi(`/api/protocols/${id}`, { method: "DELETE" });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["protocols"] });
			success();
		},
		onError: () => {
			errorHaptic();
		},
	});

	// Duplicate protocol
	const duplicateMutation = useMutation({
		mutationFn: async (protocolId: string) => {
			if (!user?.id) throw new Error("User not authenticated");

			const response = await fetchApi<any>(
				`/api/protocols/${protocolId}/duplicate`,
				{
					method: "POST",
				},
			);
			return response.data?.id;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["protocols"] });
			success();
		},
		onError: () => {
			errorHaptic();
		},
	});

	return {
		protocols,
		isLoading,
		error,
		refetch,
		create: createMutation.mutateAsync,
		update: updateMutation.mutateAsync,
		delete: deleteMutation.mutateAsync,
		duplicate: duplicateMutation.mutateAsync,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isDuplicating: duplicateMutation.isPending,
	};
}
