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
      let query = supabase.from('contas_financeiras').select('*').order('data_vencimento', { ascending: true });
      if (tipo) query = query.eq('tipo', tipo);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data as ContaFinanceira[];
    },
  });
}

export function useCreateContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conta: Omit<ContaFinanceira, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('contas_financeiras').insert(conta).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      toast.success('Conta criada com sucesso.');
    },
    onError: () => toast.error('Erro ao criar conta.'),
  });
}

export function useUpdateContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...conta }: Partial<ContaFinanceira> & { id: string }) => {
      const { data, error } = await supabase.from('contas_financeiras').update(conta).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      toast.success('Conta atualizada.');
    },
    onError: () => toast.error('Erro ao atualizar conta.'),
  });
}

export function useDeleteContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contas_financeiras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      toast.success('Conta excluída.');
    },
    onError: () => toast.error('Erro ao excluir conta.'),
  });
}

// Resumo financeiro
export function useResumoFinanceiro() {
  return useQuery({
    queryKey: ['resumo-financeiro'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contas_financeiras').select('*');
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
  });
}
