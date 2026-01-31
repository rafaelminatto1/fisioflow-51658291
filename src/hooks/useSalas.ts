/**
 * useSalas - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('salas') → Firestore collection 'salas'
 * - supabase.select() → getDocs()
 * - supabase.insert() → addDoc()
 * - supabase.update() → updateDoc()
 * - supabase.delete() → deleteDoc()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, orderBy } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';



export interface Sala {
  id: string;
  organization_id: string | null;
  nome: string;
  capacidade: number;
  descricao: string | null;
  cor: string;
  equipamentos: string[] | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type SalaFormData = Pick<Sala, 'nome' | 'capacidade' | 'descricao' | 'cor' | 'equipamentos' | 'ativo'>;

// Helper to convert Firestore doc to Sala
const convertDocToSala = (doc: { id: string; data: () => Record<string, unknown> }): Sala => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Sala;
};

export function useSalas() {
  return useQuery({
    queryKey: ['salas'],
    queryFn: async () => {
      const q = query(
        collection(db, 'salas'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToSala);
    },
  });
}

export function useCreateSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sala: SalaFormData) => {
      const salaData = {
        ...sala,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'salas'), salaData);
      const docSnap = await getDoc(docRef);

      return convertDocToSala(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast({ title: 'Sala criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar sala', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sala> & { id: string }) => {
      const docRef = doc(db, 'salas', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToSala(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast({ title: 'Sala atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'salas', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast({ title: 'Sala removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
