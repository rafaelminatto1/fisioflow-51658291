import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/app';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { FinancialService, Transaction, FinancialStats } from '@/services/financialService';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/errors/logger';

export type { Transaction, FinancialStats };

export const useFinancial = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [period, setPeriod] = React.useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');

  // Registrar listener para atualizações em tempo real
  useEffect(() => {
    if (!db || !profile?.organization_id) return;

    const q = query(
      collection(db, 'contas_financeiras'),
      where('organization_id', '==', profile.organization_id)
    );

    const unsubscribe = onSnapshot(q, () => {
      logger.debug('Financial data changed, invalidating queries', null, 'useFinancial');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    });

    return () => unsubscribe();
  }, [profile?.organization_id, queryClient]);

  // Buscar todas as transações
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: FinancialService.fetchTransactions,
  });

  // Filtrar transações baseado no período
  const filteredTransactions = React.useMemo(() => {
    if (period === 'all') return transactions;

    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Zera hora para comparação justa de início

    if (period === 'daily') {
      // Já é hoje 00:00
    } else if (period === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      start.setDate(now.getDate() - 30);
    }

    return transactions.filter(t => {
      if (!t.created_at) return false;
      const tDate = new Date(t.created_at);
      return tDate >= start;
    });
  }, [transactions, period]);

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    // Estatísticas do período visualizado
    const periodStats = FinancialService.calculateStats(filteredTransactions);

    // Estatísticas globais para crescimento (preserva o cálculo de mês atual vs anterior)
    // Se o período for 'mensal' ou 'all', o crescimento faz sentido ser o global
    // Se for diário, growth talvez devesse comparar com ontem, mas vamos manter o global mensal por enquanto como indicativo macro
    const globalStats = FinancialService.calculateStats(transactions);

    return {
      ...periodStats,
      monthlyGrowth: globalStats.monthlyGrowth // Mantém crescimento mensal global
    };
  }, [filteredTransactions, transactions]);

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
    transactions: filteredTransactions, // Retorna filtradas para listas
    allTransactions: transactions, // Acesso bruto se precisar
    stats,
    period,
    setPeriod,
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
