/**
 * useTransacoes - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('transacoes') → Firestore collection 'transacoes'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';


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

// Helper: Convert Firestore doc to Transacao
const convertDocToTransacao = (doc: { id: string; data: () => Record<string, unknown> }): Transacao => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Transacao;
};

export function useTransacoes(userId?: string) {
  return useQuery({
    queryKey: ['transacoes', userId],
    queryFn: async () => {
      let q = query(
        collection(db, 'transacoes'),
        orderBy('created_at', 'desc')
      );

      if (userId) {
        q = query(
          collection(db, 'transacoes'),
          where('user_id', '==', userId),
          orderBy('created_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToTransacao);
    },
  });
}

export function useCreateTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at'>) => {
      const transacaoData = {
        ...transacao,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'transacoes'), transacaoData);
      const docSnap = await getDoc(docRef);

      return convertDocToTransacao(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação criada com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao criar transação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}

export function useUpdateTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transacao> }) => {
      const docRef = doc(db, 'transacoes', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToTransacao(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação atualizada com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar transação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}

export function useDeleteTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'transacoes', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação excluída com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao excluir transação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
}
