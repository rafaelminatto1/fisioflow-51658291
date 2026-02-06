/**
 * useConvenios - Migrated to Firebase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, orderBy, db } from '@/integrations/firebase/app';
import { toast } from '@/hooks/use-toast';

export interface Convenio {
  id: string;
  organization_id: string | null;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  contato_responsavel: string | null;
  valor_repasse: number;
  prazo_pagamento_dias: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ConvenioFormData = Pick<Convenio, 'nome' | 'cnpj' | 'telefone' | 'email' | 'contato_responsavel' | 'valor_repasse' | 'prazo_pagamento_dias' | 'observacoes' | 'ativo'>;

// Helper: Convert Firestore doc to Convenio
const convertDocToConvenio = (doc: { id: string; data: () => Record<string, unknown> }): Convenio => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Convenio;
};

export function useConvenios() {
  return useQuery({
    queryKey: ['convenios'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'convenios'),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToConvenio);
    },
  });
}

export function useCreateConvenio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convenio: ConvenioFormData) => {
      const convenioData = {
        ...convenio,
        organization_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'convenios'), convenioData);
      const docSnap = await getDoc(docRef);

      return convertDocToConvenio(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast({ title: 'Convênio criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar convênio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateConvenio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Convenio> & { id: string }) => {
      const docRef = doc(db, 'convenios', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToConvenio(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast({ title: 'Convênio atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteConvenio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'convenios', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast({ title: 'Convênio removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
