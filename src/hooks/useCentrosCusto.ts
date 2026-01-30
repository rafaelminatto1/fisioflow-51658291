/**
 * useCentrosCusto - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('centros_custo') → Firestore collection 'centros_custo'
 * - supabase.select() → getDocs()
 * - supabase.insert() → addDoc()
 * - supabase.update() → updateDoc()
 * - supabase.delete() → deleteDoc()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';
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


export interface CentroCusto {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type CentroCustoFormData = Pick<CentroCusto, 'nome' | 'descricao' | 'ativo'>;

// Helper to convert Firestore doc to CentroCusto
const convertDocToCentroCusto = (doc: { id: string; data: () => Record<string, unknown> }): CentroCusto => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as CentroCusto;
};

export function useCentrosCusto() {
  return useQuery({
    queryKey: ['centros_custo'],
    queryFn: async () => {
      const q = query(
        collection(db, 'centros_custo'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToCentroCusto);
    },
  });
}

export function useCreateCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (centro: CentroCustoFormData) => {
      const centroData = {
        ...centro,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'centros_custo'), centroData);
      const docSnap = await getDoc(docRef);

      return convertDocToCentroCusto(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast({ title: 'Centro de custo criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar centro de custo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CentroCusto> & { id: string }) => {
      const docRef = doc(db, 'centros_custo', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToCentroCusto(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast({ title: 'Centro de custo atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'centros_custo', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast({ title: 'Centro de custo removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
