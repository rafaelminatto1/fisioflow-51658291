/**
 * useFormasPagamento - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('formas_pagamento') → Firestore collection 'formas_pagamento'
 * - supabase.select() → getDocs()
 * - supabase.insert() → addDoc()
 * - supabase.update() → updateDoc()
 * - supabase.delete() → deleteDoc()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getFirebaseDb } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';

const db = getFirebaseDb();

export interface FormaPagamento {
  id: string;
  organization_id: string | null;
  nome: string;
  tipo: 'geral' | 'entrada' | 'saida';
  taxa_percentual: number;
  dias_recebimento: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type FormaPagamentoFormData = Pick<FormaPagamento, 'nome' | 'tipo' | 'taxa_percentual' | 'dias_recebimento' | 'ativo'>;

// Helper to convert Firestore doc to FormaPagamento
const convertDocToFormaPagamento = (doc: any): FormaPagamento => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as FormaPagamento;
};

export function useFormasPagamento() {
  return useQuery({
    queryKey: ['formas_pagamento'],
    queryFn: async () => {
      const q = query(
        collection(db, 'formas_pagamento'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToFormaPagamento);
    },
  });
}

export function useCreateFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (forma: FormaPagamentoFormData) => {
      const formaData = {
        ...forma,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'formas_pagamento'), formaData);
      const docSnap = await getDoc(docRef);

      return convertDocToFormaPagamento(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] });
      toast({ title: 'Forma de pagamento criada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormaPagamento> & { id: string }) => {
      const docRef = doc(db, 'formas_pagamento', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToFormaPagamento(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] });
      toast({ title: 'Forma de pagamento atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'formas_pagamento', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] });
      toast({ title: 'Forma de pagamento removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
