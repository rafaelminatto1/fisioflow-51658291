import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmpresaParceira {
  id: string;
  nome: string;
  contato?: string;
  email?: string;
  telefone?: string;
  contrapartidas?: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmpresasParceiras() {
  return useQuery({
    queryKey: ['empresas-parceiras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as EmpresaParceira[];
    },
  });
}

export function useCreateEmpresaParceira() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (empresa: Omit<EmpresaParceira, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .insert([empresa])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-parceiras'] });
      toast({
        title: 'Empresa parceira criada!',
        description: 'Empresa adicionada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar empresa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEmpresaParceira() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmpresaParceira> }) => {
      const { data: updated, error } = await supabase
        .from('empresas_parceiras')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-parceiras'] });
      toast({
        title: 'Empresa atualizada!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar empresa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEmpresaParceira() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('empresas_parceiras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-parceiras'] });
      toast({
        title: 'Empresa removida!',
        description: 'Empresa excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover empresa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
