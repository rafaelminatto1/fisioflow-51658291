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
      // Otimizado: Select apenas colunas necessárias
      const { data, error } = await supabase
        .from('servicos')
        .select('id, organization_id, nome, descricao, duracao_padrao, tipo_cobranca, valor, centro_custo, permite_agendamento_online, cor, ativo, created_at, updated_at')
        .order('nome');

      if (error) throw error;
      return data as Servico[];
    },
    staleTime: 1000 * 60 * 15, // 15 minutos - serviços mudam pouco
    gcTime: 1000 * 60 * 30,
  });
}

export function useCreateServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (servico: ServicoFormData) => {
      // Otimizado: Select apenas colunas necessárias
      const { data, error } = await supabase
        .from('servicos')
        .insert(servico)
        .select('id, organization_id, nome, descricao, duracao_padrao, tipo_cobranca, valor, centro_custo, permite_agendamento_online, cor, ativo, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update - adiciona serviço antes da resposta do servidor
    onMutate: async (newServico) => {
      await queryClient.cancelQueries({ queryKey: ['servicos'] });

      const previousServicos = queryClient.getQueryData<Servico[]>(['servicos']);

      const optimisticServico: Servico = {
        ...newServico,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Servico[]>(['servicos'], (old) => {
        const newData = [...(old || []), optimisticServico];
        return newData.sort((a, b) => a.nome.localeCompare(b.nome));
      });

      return { previousServicos };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['servicos'], context?.previousServicos);
      toast({ title: 'Erro ao criar serviço', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Serviço criado com sucesso' });
    },
  });
}

export function useUpdateServico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Servico> & { id: string }) => {
      // Otimizado: Select apenas colunas necessárias
      const { data, error } = await supabase
        .from('servicos')
        .update(updates)
        .eq('id', id)
        .select('id, organization_id, nome, descricao, duracao_padrao, tipo_cobranca, valor, centro_custo, permite_agendamento_online, cor, ativo, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update - atualiza serviço antes da resposta do servidor
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['servicos'] });

      const previousServicos = queryClient.getQueryData<Servico[]>(['servicos']);

      queryClient.setQueryData<Servico[]>(['servicos'], (old) =>
        (old || []).map((s) =>
          s.id === id
            ? { ...s, ...updates, updated_at: new Date().toISOString() }
            : s
        )
      );

      return { previousServicos };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['servicos'], context?.previousServicos);
      toast({ title: 'Erro ao atualizar serviço', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Serviço atualizado com sucesso' });
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
    // Optimistic update - remove serviço da lista visualmente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['servicos'] });

      const previousServicos = queryClient.getQueryData<Servico[]>(['servicos']);

      queryClient.setQueryData<Servico[]>(['servicos'], (old) =>
        (old || []).filter((s) => s.id !== id)
      );

      return { previousServicos };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['servicos'], context?.previousServicos);
      toast({ title: 'Erro ao remover serviço', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Serviço removido com sucesso' });
    },
  });
}
