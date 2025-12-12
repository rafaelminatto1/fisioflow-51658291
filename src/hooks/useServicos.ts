import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Servico {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  duracao_padrao: number;
  tipo_cobranca: 'unitario' | 'mensal' | 'pacote';
  valor: number;
  centro_custo: string | null;
  permite_agendamento_online: boolean;
  cor: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ServicoFormData = Omit<Servico, 'id' | 'created_at' | 'updated_at'>;

export function useServicos() {
  return useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as Servico[];
    },
  });
}

export function useCreateServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (servico: ServicoFormData) => {
      const { data, error } = await supabase
        .from('servicos')
        .insert(servico)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({ title: 'Serviço criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar serviço', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Servico> & { id: string }) => {
      const { data, error } = await supabase
        .from('servicos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({ title: 'Serviço atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar serviço', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({ title: 'Serviço removido com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover serviço', description: error.message, variant: 'destructive' });
    },
  });
}
