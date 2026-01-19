import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FinancialService, Transaction, FinancialStats } from '@/services/financialService';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';

export type { Transaction, FinancialStats };

export const useFinancial = () => {
  const queryClient = useQueryClient();

  // Buscar todas as transações
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: FinancialService.fetchTransactions,
  });

  // Calcular estatísticas
  const { data: stats } = useQuery({
    queryKey: ['financial-stats', transactions],
    queryFn: () => FinancialService.calculateStats(transactions),
    enabled: transactions.length > 0,
  });

  // Criar transação
  const createMutation = useMutation({
    mutationFn: FinancialService.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação criada com sucesso');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useFinancial.create');
    },
  });

  // Atualizar transação
  const updateMutation = useMutation({
    mutationFn: ({ id, ...transaction }: Partial<Transaction> & { id: string }) =>
      FinancialService.updateTransaction(id, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação atualizada com sucesso');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useFinancial.update');
    },
  });

  // Excluir transação
  const deleteMutation = useMutation({
    mutationFn: FinancialService.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação excluída com sucesso');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useFinancial.delete');
    },
  });

  // Marcar como pago
  const markAsPaidMutation = useMutation({
    mutationFn: FinancialService.markAsPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação marcada como paga');
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useFinancial.markAsPaid');
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
