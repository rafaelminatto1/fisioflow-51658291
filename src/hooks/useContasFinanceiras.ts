/**
 * useContasFinanceiras - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, getDocs, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';

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
      try {
        let q = firestoreQuery(
          collection(db, 'contas_financeiras'),
          orderBy('data_vencimento', 'asc')
        );

        if (tipo) {
          q = firestoreQuery(
            collection(db, 'contas_financeiras'),
            where('tipo', '==', tipo),
            orderBy('data_vencimento', 'asc')
          );
        }

        if (status) {
          if (tipo) {
            q = firestoreQuery(
              collection(db, 'contas_financeiras'),
              where('tipo', '==', tipo),
              where('status', '==', status),
              orderBy('data_vencimento', 'asc')
            );
          } else {
            q = firestoreQuery(
              collection(db, 'contas_financeiras'),
              where('status', '==', status),
              orderBy('data_vencimento', 'asc')
            );
          }
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as ContaFinanceira[];
      } catch (error) {
        // Se a coleção não existir ainda, retorna array vazio
        logger.warn('[useContasFinanceiras] Collection does not exist yet', error, 'useContasFinanceiras');
        return [];
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCreateContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conta: Omit<ContaFinanceira, 'id' | 'created_at'>) => {
      const contaData = {
        ...conta,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'contas_financeiras'), contaData);

      return {
        id: docRef.id,
        ...contaData,
      } as ContaFinanceira;
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
    onSuccess: (_data) => {
      toast.success('Conta criada com sucesso.');
    },
  });
}

export function useUpdateContaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...conta }: Partial<ContaFinanceira> & { id: string }) => {
      const docRef = doc(db, 'contas_financeiras', id);
      await updateDoc(docRef, conta);

      const snap = await getDoc(docRef);
      return {
        id: snap.id,
        ...snap.data(),
      } as ContaFinanceira;
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
      const docRef = doc(db, 'contas_financeiras', id);
      await deleteDoc(docRef);
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
      const snapshot = await getDocs(collection(db, 'contas_financeiras'));
      const contas = snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as ContaFinanceira[];

      const hoje = new Date().toISOString().split('T')[0];

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