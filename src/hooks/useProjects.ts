/**
 * useProjects - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectsApi, type ProjectRecord } from "@/api/v2";

export type Project = ProjectRecord;

export function useProjects() {
	return useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const res = await projectsApi.list();
			return (res?.data ?? []) as Project[];
		},
	});
}

export function useProject(id: string) {
	return useQuery({
		queryKey: ["projects", id],
		queryFn: async () => {
			if (!id) return null;
			const res = await projectsApi.get(id);
			return (res?.data ?? null) as Project | null;
		},
		enabled: !!id,
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (project: Partial<Project>) => {
			const res = await projectsApi.create(project);
			return (res?.data ?? res) as Project;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			toast.success("Projeto criado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar projeto: " + error.message);
		},
	});
}

export function useUpdateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<Project> & { id: string }) => {
			const res = await projectsApi.update(id, updates);
			return (res?.data ?? res) as Project;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["projects", variables.id] });
			toast.success("Projeto atualizado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar projeto: " + error.message);
		},
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await projectsApi.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			toast.success("Projeto excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao excluir projeto: " + error.message);
		},
	});
}
