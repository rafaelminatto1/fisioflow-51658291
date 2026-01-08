import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';
  active: boolean;
  joined_at: string;
}

export const useOrganizations = () => {
  const queryClient = useQueryClient();

  // Query para listar organizações do usuário
  const { data: organizations, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as Organization[];
    },
  });

  // Query para organização atual do usuário
  const { data: currentOrganization } = useQuery({
    queryKey: ['current-organization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current organization:', error);
        throw error;
      }

      if (!data) {
        console.warn('Organization not found (404/406) for ID:', profile.organization_id);
      }

      return data as Organization;
    },
  });

  // Mutation para criar organização
  const createOrganization = useMutation({
    mutationFn: async (orgData: { name: string; slug: string; settings?: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: orgData.name,
          slug: orgData.slug,
          settings: orgData.settings || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organização criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar organização: ' + error.message);
    },
  });

  // Mutation para atualizar organização
  const updateOrganization = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });
      toast.success('Organização atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar organização: ' + error.message);
    },
  });

  return {
    organizations,
    currentOrganization,
    isLoading,
    error,
    createOrganization: createOrganization.mutate,
    updateOrganization: updateOrganization.mutate,
    isCreating: createOrganization.isPending,
    isUpdating: updateOrganization.isPending,
  };
};
