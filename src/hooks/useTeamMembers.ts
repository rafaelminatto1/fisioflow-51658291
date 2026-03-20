/**
 * useTeamMembers - Hook to fetch team members for mentions and assignments
 */

import { useQuery } from "@tanstack/react-query";
import { organizationMembersApi } from "@/lib/api/workers-client";
import { TeamMember } from "@/types/tarefas";

export function useTeamMembers() {
	return useQuery({
		queryKey: ["team-members"],
		queryFn: async (): Promise<TeamMember[]> => {
			const res = await organizationMembersApi.list({ limit: 1000 });
			const members = res?.data ?? [];
			return members.map((member) => ({
				id: member.user_id ?? member.id,
				full_name: member.profiles?.full_name ?? "Usuário",
				email: member.profiles?.email ?? undefined,
				avatar_url: undefined,
				role: member.role,
			}));
		},
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		refetchOnWindowFocus: false,
	});
}

export function useTeamMember(userId: string | undefined) {
	return useQuery({
		queryKey: ["team-member", userId],
		queryFn: async (): Promise<TeamMember | null> => {
			if (!userId) return null;

			const res = await organizationMembersApi.list({ userId, limit: 1 });
			const member = res?.data?.[0];
			if (!member) return null;
			return {
				id: member.user_id ?? member.id,
				full_name: member.profiles?.full_name ?? "Usuário",
				email: member.profiles?.email ?? undefined,
				avatar_url: undefined,
				role: member.role,
			};
		},
		enabled: !!userId,
		staleTime: 1000 * 60 * 10,
	});
}
