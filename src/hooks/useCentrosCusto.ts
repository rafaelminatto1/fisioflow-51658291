import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CentroCusto {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type CentroCustoFormData = Pick<CentroCusto, 'nome' | 'descricao' | 'ativo'>;

export function useCentrosCusto() {
  return useQuery({
    queryKey: ['centros_custo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as CentroCusto[];
    },
  });
}

export function useCreateCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (centro: CentroCustoFormData) => {
      const { data, error } = await supabase
        .from('centros_custo')
        .insert(centro)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast({ title: 'Centro de custo criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar centro de custo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CentroCusto> & { id: string }) => {
      const { data, error } = await supabase
        .from('centros_custo')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast({ title: 'Centro de custo atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('centros_custo')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast({ title: 'Centro de custo removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
