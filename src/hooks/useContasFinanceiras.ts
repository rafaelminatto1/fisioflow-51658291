import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContaFinanceira {
  id: string;
  tipo: 'receber' | 'pagar';
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  categoria: string | null;
  forma_pagamento: string | null;
  parcelas: number;
  parcela_atual: number;
  recorrente: boolean;
  patient_id: string | null;
  fornecedor_id: string | null;
  observacoes: string | null;
  created_at: string;
}

export function useContasFinanceiras(tipo?: 'receber' | 'pagar', status?: string) {
  return useQuery({
    queryKey: ['contas-financeiras', tipo, status],
    queryFn: async () => {
      // Optimized: Select only required columns instead of *
      let query = supabase.from('contas_financeiras').select('id, descricao, valor, data_vencimento, data_pagamento, tipo, status, fornecedor_id, observacoes, created_at').order('data_vencimento', { ascending: true });
      if (tipo) query = query.eq('tipo', tipo);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data as ContaFinanceira[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCreateContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conta: Omit<ContaFinanceira, 'id' | 'created_at'>) => {
      // Optimized: Select only required columns
      const { data, error } = await supabase.from('contas_financeiras').insert(conta).select('id, descricao, valor, data_vencimento, data_pagamento, tipo, status, fornecedor_id, observacoes, created_at').single();
      if (error) throw error;
      return data;
    },
    // Optimistic update - adiciona conta à lista antes da resposta do servidor
    onMutate: async (newConta) => {
      await queryClient.cancelQueries({ queryKey: ['contas-financeiras'] });

      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(['contas-financeiras']);

      const optimisticConta: ContaFinanceira = {
        ...newConta,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ContaFinanceira[]>(['contas-financeiras'], (old) => {
        const newData = [...(old || []), optimisticConta];
        return newData.sort((a, b) =>
          new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
        );
      });

      return { previousContas };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['contas-financeiras'], context?.previousContas);
      toast.error('Erro ao criar conta.');
    },
    onSuccess: (data) => {
      toast.success('Conta criada com sucesso.');
    },
  });
}

export function useUpdateContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...conta }: Partial<ContaFinanceira> & { id: string }) => {
      // Optimized: Select only required columns
      const { data, error } = await supabase.from('contas_financeiras').update(conta).eq('id', id).select('id, descricao, valor, data_vencimento, data_pagamento, tipo, status, fornecedor_id, observacoes, created_at').single();
      if (error) throw error;
      return data;
    },
    // Optimistic update - atualiza conta na lista antes da resposta do servidor
    onMutate: async ({ id, ...conta }) => {
      await queryClient.cancelQueries({ queryKey: ['contas-financeiras'] });

      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(['contas-financeiras']);

      queryClient.setQueryData<ContaFinanceira[]>(['contas-financeiras'], (old) =>
        (old || []).map((c) =>
          c.id === id
            ? { ...c, ...conta }
            : c
        ).sort((a, b) =>
          new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
        )
      );

      return { previousContas };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['contas-financeiras'], context?.previousContas);
      toast.error('Erro ao atualizar conta.');
    },
    onSuccess: () => {
      toast.success('Conta atualizada.');
    },
  });
}

export function useDeleteContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_financeiras').delete().eq('id', id);
      if (error) throw error;
    },
    // Optimistic update - remove conta da lista visualmente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contas-financeiras'] });

      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(['contas-financeiras']);

      queryClient.setQueryData<ContaFinanceira[]>(['contas-financeiras'], (old) =>
        (old || []).filter((c) => c.id !== id)
      );

      return { previousContas };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['contas-financeiras'], context?.previousContas);
      toast.error('Erro ao excluir conta.');
    },
    onSuccess: () => {
      toast.success('Conta excluída.');
    },
  });
}

// Resumo financeiro - otimizado com colunas específicas
export function useResumoFinanceiro() {
  return useQuery({
    queryKey: ['resumo-financeiro'],
    queryFn: async () => {
      // Otimizado: Select apenas colunas necessárias para o resumo
      const { data, error } = await supabase.from('contas_financeiras').select('tipo, status, valor, data_vencimento');
      if (error) throw error;
      
      const hoje = new Date().toISOString().split('T')[0];
      const contas = data as ContaFinanceira[];
      
      const receber = contas.filter(c => c.tipo === 'receber');
      const pagar = contas.filter(c => c.tipo === 'pagar');
      
      return {
        totalReceber: receber.filter(c => c.status === 'pendente').reduce((acc, c) => acc + Number(c.valor), 0),
        totalPagar: pagar.filter(c => c.status === 'pendente').reduce((acc, c) => acc + Number(c.valor), 0),
        receberAtrasado: receber.filter(c => c.status === 'pendente' && c.data_vencimento < hoje).length,
        pagarAtrasado: pagar.filter(c => c.status === 'pendente' && c.data_vencimento < hoje).length,
        receberHoje: receber.filter(c => c.data_vencimento === hoje && c.status === 'pendente').length,
        pagarHoje: pagar.filter(c => c.data_vencimento === hoje && c.status === 'pendente').length,
      };
    },
    staleTime: 1000 * 60 * 1, // 1 minuto - resumo financeiro precisa ser mais fresco
    gcTime: 1000 * 60 * 3, // 3 minutos
  });
}
