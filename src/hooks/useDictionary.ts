import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { wikiApi } from "@/api/v2/knowledge";

export interface DictionaryTerm {
	id: string;
	pt: string;
	en: string;
	category: string;
	subcategory?: string;
	aliasesPt: string[];
	aliasesEn: string[];
	descriptionPt?: string;
	descriptionEn?: string;
	organizationId?: string;
	isGlobal: boolean;
	createdAt: string;
	updatedAt: string;
}

export function useDictionary(q?: string, category?: string) {
	const queryClient = useQueryClient();

	const { data: terms = [], isLoading, error } = useQuery<DictionaryTerm[]>({
		queryKey: ["dictionary", q, category],
		queryFn: async () => {
			const result = await wikiApi.listDictionary({
				q,
				category,
			});
			return result.data as DictionaryTerm[];
		},
	});

	const createMutation = useMutation({
		mutationFn: async (newTerm: Partial<DictionaryTerm>) => {
			return wikiApi.createDictionaryTerm(newTerm as Record<string, unknown>);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dictionary"] });
			toast.success("Termo criado com sucesso");
		},
		onError: () => {
			toast.error("Erro ao criar termo");
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, ...data }: Partial<DictionaryTerm> & { id: string }) => {
			return wikiApi.updateDictionaryTerm(
				id,
				data as Record<string, unknown>,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dictionary"] });
			toast.success("Termo atualizado com sucesso");
		},
		onError: () => {
			toast.error("Erro ao atualizar termo");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			return wikiApi.deleteDictionaryTerm(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dictionary"] });
			toast.success("Termo excluído com sucesso");
		},
		onError: () => {
			toast.error("Erro ao excluir termo");
		},
	});

	return {
		terms,
		isLoading,
		error,
		createTerm: createMutation.mutate,
		updateTerm: updateMutation.mutate,
		deleteTerm: deleteMutation.mutate,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
}
