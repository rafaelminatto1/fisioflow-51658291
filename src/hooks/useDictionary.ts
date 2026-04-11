import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
			const searchParams = new URLSearchParams();
			if (q) searchParams.append("q", q);
			if (category) searchParams.append("category", category);
			
			const res = await fetch(`/api/wiki/dictionary?${searchParams.toString()}`);
			if (!res.ok) throw new Error("Erro ao buscar dicionário");
			const json = await res.json();
			return json.data;
		},
	});

	const createMutation = useMutation({
		mutationFn: async (newTerm: Partial<DictionaryTerm>) => {
			const res = await fetch("/api/wiki/dictionary", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newTerm),
			});
			if (!res.ok) throw new Error("Erro ao criar termo");
			return res.json();
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
			const res = await fetch(`/api/wiki/dictionary/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error("Erro ao atualizar termo");
			return res.json();
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
			const res = await fetch(`/api/wiki/dictionary/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Erro ao excluir termo");
			return res.json();
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
