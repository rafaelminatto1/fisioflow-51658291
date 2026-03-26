/**
 * useOrganizationMembers - Migrated to Neon/Cloudflare
 *
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { organizationMembersApi } from "@/api/v2";

export const useOrganizationMembers = (organizationId?: string) => {
	const queryClient = useQueryClient();

	// Query para listar membros
	const {
		data: members,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["organization-members", organizationId],
		queryFn: async () => {
			if (!organizationId) return [];
			const res = await organizationMembersApi.list({ organizationId });
			return res.data ?? [];
		},
		enabled: !!organizationId,
	});

	// Mutation para adicionar membro
	const addMember = useMutation({
		mutationFn: async (memberData: {
			organization_id?: string;
			user_id: string;
			role: "admin" | "fisioterapeuta" | "estagiario" | "paciente";
		}) => {
			const res = await organizationMembersApi.create({
				organizationId: memberData.organization_id,
				userId: memberData.user_id,
				role: memberData.role,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["organization-members"] });
			toast.success("Membro adicionado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao adicionar membro: " + error.message);
		},
	});

	// Mutation para atualizar role do membro
	const updateMemberRole = useMutation({
		mutationFn: async ({
			id,
			role,
		}: {
			id: string;
			role: "admin" | "fisioterapeuta" | "estagiario" | "paciente";
		}) => {
			const res = await organizationMembersApi.update(id, { role });
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["organization-members"] });
			toast.success("Permissão atualizada com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar permissão: " + error.message);
		},
	});

	// Mutation para remover membro
	const removeMember = useMutation({
		mutationFn: async (memberId: string) => {
			await organizationMembersApi.remove(memberId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["organization-members"] });
			toast.success("Membro removido com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao remover membro: " + error.message);
		},
	});

	return {
		members,
		isLoading,
		error,
		addMember: addMember.mutate,
		updateMemberRole: updateMemberRole.mutate,
		removeMember: removeMember.mutate,
		isAdding: addMember.isPending,
		isUpdating: updateMemberRole.isPending,
		isRemoving: removeMember.isPending,
	};
};
