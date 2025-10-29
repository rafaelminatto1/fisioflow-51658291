import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Transacao {
  id: string;
  user_id?: string;
  tipo: string;
  valor: number;
  descricao?: string;
  status: string;
  stripe_payment_intent_id?: string;
  stripe_refund_id?: string;
  metadata?: any;
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
  const { toast } = useToast();

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
      toast({
        title: 'Transação criada!',
        description: 'Transação registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar transação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTransacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({
        title: 'Transação atualizada!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar transação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
