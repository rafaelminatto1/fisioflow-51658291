import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { organizationMembersApi, type OrganizationMember } from "@/api/v2";
import { UserRole } from "@/types/auth";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  role: UserRole;
  created_at: string;
  disabled: boolean;
  membership_id: string;
}

function normalizeMember(member: OrganizationMember): UserRow {
  const profile = (member.profiles ?? {}) as {
    full_name?: string;
    email?: string;
  };
  return {
    id: member.user_id,
    email: profile.email ?? "",
    full_name: profile.full_name ?? profile.email ?? "Usuário sem nome",
    roles: [member.role],
    role: member.role as UserRole,
    created_at: member.joined_at,
    disabled: member.active === false,
    membership_id: member.id,
  };
}

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res = await organizationMembersApi.list({ limit: 1000 });
      return ((res?.data ?? []) as OrganizationMember[]).map(normalizeMember);
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const membership = users.find((user) => user.id === userId);
      if (!membership?.membership_id) {
        throw new Error("Membro da organização não encontrado");
      }

      await organizationMembersApi.update(membership.membership_id, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      toast({ title: "Função do usuário atualizada com sucesso" });
    },
    onError: (error: unknown) => {
      logger.error("Update role error", error, "useUsers");
      toast({
        title: "Erro ao atualizar função",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const removeRole = (params: { userId: string; role: string }) => {
    updateUserRoleMutation.mutate({
      userId: params.userId,
      role: "paciente" as UserRole,
    });
  };

  return {
    users,
    isLoading,
    addRole: updateUserRoleMutation.mutate,
    updateRole: updateUserRoleMutation.mutate,
    removeRole,
  };
}
