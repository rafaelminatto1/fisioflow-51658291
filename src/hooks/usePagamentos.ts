/**
 * usePagamentos - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('pagamentos') → Firestore collection 'pagamentos'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PagamentoCreate, PagamentoUpdate } from '@/lib/validations/pagamento';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';


export interface Pagamento {
  id: string;
  evento_id: string;
  valor: number;
  forma_pagamento: string;
  pago_em: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper: Convert Firestore doc to Pagamento
const convertDocToPagamento = (doc: { id: string; data: () => Record<string, unknown> }): Pagamento => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Pagamento;
};

export function usePagamentos(eventoId: string) {
  return useQuery({
    queryKey: ['pagamentos', eventoId],
    queryFn: async () => {
      const q = query(
        collection(db, 'pagamentos'),
        where('evento_id', '==', eventoId),
        orderBy('pago_em', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToPagamento);
    },
    enabled: !!eventoId,
  });
}

export function useCreatePagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pagamento: PagamentoCreate & { pago_em: Date }) => {
      const dataToInsert = {
        ...pagamento,
        pago_em: pagamento.pago_em.toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'pagamentos'), dataToInsert);

      return {
        id: docRef.id,
        ...dataToInsert,
      } as Pagamento;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos', data.evento_id] });
      toast({
        title: 'Pagamento adicionado!',
        description: 'Pagamento registrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao adicionar pagamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: PagamentoUpdate & { pago_em?: Date }; eventoId: string }) => {
      const docRef = doc(db, 'pagamentos', id);

      const dataToUpdate = data.pago_em
        ? { ...data, pago_em: data.pago_em.toISOString().split('T')[0], updated_at: new Date().toISOString() }
        : { ...data, updated_at: new Date().toISOString() };

      await updateDoc(docRef, dataToUpdate);

      // Fetch updated document
      const snapshot = await getDoc(docRef);
      return { ...convertDocToPagamento(snapshot), evento_id: eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos', data.evento_id] });
      toast({
        title: 'Pagamento atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar pagamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      await deleteDoc(doc(db, 'pagamentos', id));
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos', eventoId] });
      toast({
        title: 'Pagamento removido!',
        description: 'Pagamento excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover pagamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
