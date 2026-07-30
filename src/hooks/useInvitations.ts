/**
 * useInvitations - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { invitationsApi } from "@/api/v2";

export type AppRole = "admin" | "fisioterapeuta" | "estagiario" | "paciente";

export interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface CreateInvitationInput {
  email: string;
  role: AppRole;
}

export interface UpdateInvitationInput {
  invitationId: string;
  email: string;
  role: AppRole;
  expiresAt: string;
}

export function useInvitations() {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const result = await invitationsApi.list();
      return (result.data ?? []) as Invitation[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await invitationsApi.delete(invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Convite revogado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao revogar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ email, role }: CreateInvitationInput) => {
      const result = await invitationsApi.create({ email, role });
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast(
        result.email_sent === false
          ? {
              title: "Convite criado, mas o e-mail não saiu",
              description: "Copie o link do convite e envie manualmente.",
              variant: "destructive",
            }
          : { title: "Convite criado e e-mail enviado" },
      );
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ invitationId, email, role, expiresAt }: UpdateInvitationInput) => {
      const result = await invitationsApi.update(invitationId, {
        email,
        role,
        expires_at: expiresAt,
      });
      return result.data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Convite atualizado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await invitationsApi.resend(invitationId);
    },
    onSuccess: () => {
      toast({ title: "E-mail do convite reenviado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reenviar convite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    invitations,
    isLoading,
    revokeInvitation: deleteMutation.mutateAsync,
    deleteInvitation: deleteMutation.mutateAsync,
    createInvitation: createMutation.mutateAsync,
    updateInvitation: updateMutation.mutateAsync,
    resendInvitation: resendMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isResending: resendMutation.isPending,
  };
}
