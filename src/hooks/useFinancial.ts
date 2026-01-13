import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  user_id?: string;
  tipo: string;
  descricao?: string;
  valor: number;
  status: string;
  stripe_payment_intent_id?: string;
  stripe_refund_id?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialStats {
  totalRevenue: number;
  pendingPayments: number;
  monthlyGrowth: number;
  paidCount: number;
  totalCount: number;
  averageTicket: number;
}

export const useFinancial = () => {
  const queryClient = useQueryClient();

  // Buscar todas as transações
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  // Calcular estatísticas
  const { data: stats } = useQuery({
    queryKey: ['financial-stats', transactions],
    queryFn: async () => {
      const paidTransactions = transactions.filter(t => t.status === 'concluido');
      const pendingTransactions = transactions.filter(t => t.status === 'pendente');

      const totalRevenue = paidTransactions.reduce((acc, t) => acc + Number(t.valor), 0);
      const pendingPayments = pendingTransactions.reduce((acc, t) => acc + Number(t.valor), 0);

      // Calcular crescimento mensal real
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const currentMonthRevenue = paidTransactions
        .filter(t => {
          const d = new Date(t.created_at || '');
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, t) => acc + Number(t.valor), 0);

      const lastMonthRevenue = paidTransactions
        .filter(t => {
          const d = new Date(t.created_at || '');
          const lastMonthDate = new Date();
          lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
          return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        })
        .reduce((acc, t) => acc + Number(t.valor), 0);

      const monthlyGrowth = lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : currentMonthRevenue > 0 ? 100 : 0;

      const stats: FinancialStats = {
        totalRevenue,
        pendingPayments,
        monthlyGrowth,
        paidCount: paidTransactions.length,
        totalCount: transactions.length,
        averageTicket: paidTransactions.length > 0 ? totalRevenue / paidTransactions.length : 0,
      };

      return stats;
    },
    enabled: transactions.length > 0,
  });

  // Criar transação
  const createMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('transacoes')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar transação: ' + error.message);
    },
  });

  // Atualizar transação
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...transaction }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transacoes')
        .update(transaction)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar transação: ' + error.message);
    },
  });

  // Excluir transação
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação excluída com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir transação: ' + error.message);
    },
  });

  // Marcar como pago
  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('transacoes')
        .update({ status: 'concluido' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação marcada como paga');
    },
    onError: (error: Error) => {
      toast.error('Erro ao marcar como pago: ' + error.message);
    },
  });

  return {
    transactions,
    stats,
    loading: isLoading,
    error,
    createTransaction: createMutation.mutate,
    updateTransaction: updateMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
    markAsPaid: markAsPaidMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
