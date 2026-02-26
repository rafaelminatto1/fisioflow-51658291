/**
 * useContasFinanceiras - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, getDocs, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { useOrganizations } from '@/hooks/useOrganizations';

// ... (interface)

export function useContasFinanceiras(tipo?: 'receber' | 'pagar', status?: string) {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['contas-financeiras', organizationId, tipo, status],
    queryFn: async () => {
      if (!organizationId) return [];
      try {
        let q = firestoreQuery(
          collection(db, 'contas_financeiras'),
          where('organization_id', '==', organizationId),
          orderBy('data_vencimento', 'asc')
        );

        if (tipo) {
          q = firestoreQuery(
            collection(db, 'contas_financeiras'),
            where('organization_id', '==', organizationId),
            where('tipo', '==', tipo),
            orderBy('data_vencimento', 'asc')
          );
        }

        if (status) {
          if (tipo) {
            q = firestoreQuery(
              collection(db, 'contas_financeiras'),
              where('organization_id', '==', organizationId),
              where('tipo', '==', tipo),
              where('status', '==', status),
              orderBy('data_vencimento', 'asc')
            );
          } else {
            q = firestoreQuery(
              collection(db, 'contas_financeiras'),
              where('organization_id', '==', organizationId),
              where('status', '==', status),
              orderBy('data_vencimento', 'asc')
            );
          }
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as ContaFinanceira[];
      } catch (error) {
        // Se a coleção não existir ainda, retorna array vazio
        logger.warn('[useContasFinanceiras] Error fetching or collection does not exist', error, 'useContasFinanceiras');
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCreateContaFinanceira() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: async (conta: Omit<ContaFinanceira, 'id' | 'created_at'>) => {
      if (!organizationId) throw new Error('Organização não identificada');
      const contaData = {
        ...conta,
        organization_id: organizationId,
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
      await queryClient.cancelQueries({ queryKey: ['contas-financeiras', organizationId] });

      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(['contas-financeiras', organizationId]);

      const optimisticConta: ContaFinanceira = {
        ...newConta,
        id: `temp-${Date.now()}`,
        organization_id: organizationId!,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ContaFinanceira[]>(['contas-financeiras', organizationId], (old) => {
        const newData = [...(old || []), optimisticConta];
        return newData.sort((a, b) =>
          new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
        );
      });

      return { previousContas };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['contas-financeiras', organizationId], context?.previousContas);
      toast.error('Erro ao criar conta.');
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras', organizationId] });
      toast.success('Conta criada com sucesso.');
    },
  });
}

export function useUpdateContaFinanceira() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

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
      await queryClient.cancelQueries({ queryKey: ['contas-financeiras', organizationId] });

      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(['contas-financeiras', organizationId]);

      queryClient.setQueryData<ContaFinanceira[]>(['contas-financeiras', organizationId], (old) =>
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
      queryClient.setQueryData(['contas-financeiras', organizationId], context?.previousContas);
      toast.error('Erro ao atualizar conta.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras', organizationId] });
      toast.success('Conta atualizada.');
    },
  });
}

export function useDeleteContaFinanceira() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'contas_financeiras', id);
      await deleteDoc(docRef);
    },
    // Optimistic update - remove conta da lista visualmente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contas-financeiras', organizationId] });

      const previousContas = queryClient.getQueryData<ContaFinanceira[]>(['contas-financeiras', organizationId]);

      queryClient.setQueryData<ContaFinanceira[]>(['contas-financeiras', organizationId], (old) =>
        (old || []).filter((c) => c.id !== id)
      );

      return { previousContas };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['contas-financeiras', organizationId], context?.previousContas);
      toast.error('Erro ao excluir conta.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras', organizationId] });
      toast.success('Conta excluída.');
    },
  });
}

// Resumo financeiro - otimizado com colunas específicas
export function useResumoFinanceiro() {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['resumo-financeiro', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const q = firestoreQuery(
        collection(db, 'contas_financeiras'),
        where('organization_id', '==', organizationId)
      );
      const snapshot = await getDocs(q);
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
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 1, // 1 minuto - resumo financeiro precisa ser mais fresco
    gcTime: 1000 * 60 * 3, // 3 minutos
  });
}