import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
  active: boolean;
  joined_at: string;
  profiles?: {
    full_name: string;
    email: string | null;
  } | null;
}

export const useOrganizationMembers = (organizationId?: string) => {
  const queryClient = useQueryClient();

  // Query para listar membros
  const { data: members, isLoading, error } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data as OrganizationMember[];
    },
    enabled: !!organizationId,
  });

  // Mutation para adicionar membro
  const addMember = useMutation({
    mutationFn: async (memberData: {
      organization_id: string;
      user_id: string;
      role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
    }) => {
      const { data, error } = await supabase
        .from('organization_members')
        .insert(memberData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar membro: ' + error.message);
    },
  });

  // Mutation para atualizar role do membro
  const updateMemberRole = useMutation({
    mutationFn: async ({ 
      id, 
      role 
    }: { 
      id: string; 
      role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
    }) => {
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Permissão atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar permissão: ' + error.message);
    },
  });

  // Mutation para remover membro
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ active: false })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover membro: ' + error.message);
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
