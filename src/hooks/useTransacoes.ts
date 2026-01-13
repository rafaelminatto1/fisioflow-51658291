import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Transacao {
  id: string;
  user_id?: string;
  tipo: string;
  valor: number;
  descricao?: string;
  status: string;
  stripe_payment_intent_id?: string;
  stripe_refund_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useTransacoes(userId?: string) {
  return useQuery({
    queryKey: ['transacoes', userId],
    queryFn: async () => {
      let query = supabase
        .from('transacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Transacao[];
    },
  });
}

export function useCreateTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('transacoes')
        .insert([transacao])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar transação: ' + error.message);
    },
  });
}

export function useUpdateTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transacao> }) => {
      const { data: updated, error } = await supabase
        .from('transacoes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação atualizada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar transação: ' + error.message);
    },
  });
}

export function useDeleteTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação excluída com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir transação: ' + error.message);
    },
  });
}
