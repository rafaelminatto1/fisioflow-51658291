import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConductTemplate {
  id: string;
  title: string;
  description?: string;
  conduct_text: string;
  category: string;
  organization_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConductData {
  title: string;
  description?: string;
  conduct_text: string;
  category: string;
  organization_id?: string;
}

export const useConductLibrary = (category?: string) => {
  return useQuery({
    queryKey: ['conduct-library', category],
    queryFn: async () => {
      let query = supabase
        .from('conduct_library')
        .select('*')
        .order('title');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConductTemplate[];
    }
  });
};

export const useCreateConduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateConductData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: conduct, error } = await supabase
        .from('conduct_library')
        .insert({
          ...data,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return conduct as ConductTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct-library'] });
      toast({
        title: 'Conduta salva',
        description: 'A conduta foi adicionada à biblioteca.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao salvar conduta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

export const useDeleteConduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (conductId: string) => {
      const { error } = await supabase
        .from('conduct_library')
        .delete()
        .eq('id', conductId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct-library'] });
      toast({
        title: 'Conduta removida',
        description: 'A conduta foi removida da biblioteca.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover conduta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};
