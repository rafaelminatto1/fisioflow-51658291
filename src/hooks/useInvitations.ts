/**
 * useInvitations - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { invitationsApi } from '@/lib/api/workers-client';

export type AppRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

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
    queryKey: ['invitations'],
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
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Convite revogado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao revogar convite', description: error.message, variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ email, role }: CreateInvitationInput) => {
      const result = await invitationsApi.create({ email, role });
      return result.data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Convite criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar convite', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ invitationId, email, role, expiresAt }: UpdateInvitationInput) => {
      const result = await invitationsApi.update(invitationId, { email, role, expires_at: expiresAt });
      return result.data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Convite atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar convite', description: error.message, variant: 'destructive' });
    },
  });

  return {
    invitations,
    isLoading,
    revokeInvitation: deleteMutation.mutateAsync,
    deleteInvitation: deleteMutation.mutateAsync,
    createInvitation: createMutation.mutateAsync,
    updateInvitation: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
