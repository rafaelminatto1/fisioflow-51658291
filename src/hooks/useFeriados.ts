/**
 * useFeriados - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('feriados') → Firestore collection 'feriados'
 * - supabase.select() → getDocs()
 * - supabase.insert() → addDoc()
 * - supabase.update() → updateDoc()
 * - supabase.delete() → deleteDoc()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';



export interface Feriado {
  id: string;
  organization_id: string | null;
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'ponto_facultativo';
  recorrente: boolean;
  bloqueia_agenda: boolean;
  created_at: string;
  updated_at: string;
}

export type FeriadoFormData = Omit<Feriado, 'id' | 'created_at' | 'updated_at'>;

// Helper to convert Firestore doc to Feriado
const convertDocToFeriado = (doc: { id: string; data: () => Record<string, unknown> }): Feriado => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Feriado;
};

export function useFeriados(year?: number) {
  return useQuery({
    queryKey: ['feriados', year],
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'feriados'),
        orderBy('data')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToFeriado);

      // Filter by year if provided
      if (year) {
        data = data.filter(f => {
          const feriadoDate = new Date(f.data);
          return feriadoDate.getFullYear() === year;
        });
      }

      return data;
    },
  });
}

export function useCreateFeriado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feriado: FeriadoFormData) => {
      const feriadoData = {
        ...feriado,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'feriados'), feriadoData);
      const docSnap = await getDoc(docRef);

      return convertDocToFeriado(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar feriado', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFeriado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Feriado> & { id: string }) => {
      const docRef = doc(db, 'feriados', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToFeriado(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar feriado', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFeriado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'feriados', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado removido com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover feriado', description: error.message, variant: 'destructive' });
    },
  });
}
