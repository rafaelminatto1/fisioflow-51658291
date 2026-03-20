import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wikiApi } from "@/lib/api/workers-client";
import { toast } from "sonner";

const KEYS = {
	list: (params?: object) => ["workers", "wiki", "list", params] as const,
	detail: (slug: string) => ["workers", "wiki", slug] as const,
	children: (slug: string) => ["workers", "wiki", slug, "children"] as const,
	versions: (slug: string) => ["workers", "wiki", slug, "versions"] as const,
};

export function useWorkerWikiPages(params?: {
	q?: string;
	category?: string;
	page?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: KEYS.list(params),
		queryFn: () => wikiApi.list(params),
		staleTime: 1000 * 60 * 5,
		select: (res) => res,
	});
}

export function useWorkerWikiPage(slug: string) {
	return useQuery({
		queryKey: KEYS.detail(slug),
		queryFn: () => wikiApi.get(slug),
		enabled: !!slug,
		staleTime: 1000 * 60 * 5,
		select: (res) => res.data,
	});
}

export function useWorkerWikiChildren(slug: string) {
	return useQuery({
		queryKey: KEYS.children(slug),
		queryFn: () => wikiApi.children(slug),
		enabled: !!slug,
		staleTime: 1000 * 60 * 5,
		select: (res) => res.data,
	});
}

export function useWorkerWikiVersions(slug: string) {
	return useQuery({
		queryKey: KEYS.versions(slug),
		queryFn: () => wikiApi.versions(slug),
		enabled: !!slug,
		staleTime: 1000 * 60,
		select: (res) => res.data,
	});
}

export function useCreateWikiPage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: wikiApi.create,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["workers", "wiki"] });
			toast.success("Página criada com sucesso");
		},
		onError: (err: Error) => {
			toast.error("Erro ao criar página: " + err.message);
		},
	});
}

export function useUpdateWikiPage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ slug, data }: { slug: string; data: any }) =>
			wikiApi.update(slug, data),
		onSuccess: (_, { slug }) => {
			qc.invalidateQueries({ queryKey: ["workers", "wiki"] });
			qc.invalidateQueries({ queryKey: KEYS.detail(slug) });
			toast.success("Página atualizada com sucesso");
		},
		onError: (err: Error) => {
			toast.error("Erro ao atualizar página: " + err.message);
		},
	});
}

export function useDeleteWikiPage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: wikiApi.delete,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["workers", "wiki"] });
			toast.success("Página excluída com sucesso");
		},
		onError: (err: Error) => {
			toast.error("Erro ao excluir página: " + err.message);
		},
	});
}
