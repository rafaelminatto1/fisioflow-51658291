/**
 * usePrestadores - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, db } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { PrestadorCreate, PrestadorUpdate } from '@/lib/validations/prestador';

interface Prestador {
  id: string;
  evento_id: string;
  status_pagamento: string;
  [key: string]: unknown;
}

// Helper to convert doc
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T =>
  ({ id: doc.id, ...doc.data() } as T);

export function usePrestadores(eventoId: string) {
  return useQuery({
    queryKey: ['prestadores', eventoId],
    queryFn: async () => {
      if (!eventoId) return [];

      const q = firestoreQuery(
        collection(db, 'prestadores'),
        where('evento_id', '==', eventoId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc<Prestador>);
    },
    enabled: !!eventoId,
  });
}

export function useCreatePrestador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prestador: PrestadorCreate) => {
      const docRef = await addDoc(collection(db, 'prestadores'), {
        ...prestador,
        created_at: new Date().toISOString()
      });
      const newDoc = await getDoc(docRef);
      return convertDoc<Prestador>(newDoc);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', data.evento_id] });
      toast({
        title: 'Prestador adicionado!',
        description: 'Prestador cadastrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao adicionar prestador',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePrestador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: PrestadorUpdate; eventoId: string }) => {
      const docRef = doc(db, 'prestadores', id);
      await updateDoc(docRef, data);

      const updated = await getDoc(docRef);
      return { ...convertDoc<Prestador>(updated), evento_id: eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', data.evento_id] });
      toast({
        title: 'Prestador atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar prestador',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePrestador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      await deleteDoc(doc(db, 'prestadores', id));
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', eventoId] });
      toast({
        title: 'Prestador removido!',
        description: 'Prestador excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover prestador',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useMarcarPagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const docRef = doc(db, 'prestadores', id);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) throw new Error('Prestador não encontrado');
      const prestador = snapshot.data();

      const novoStatus = prestador.status_pagamento === 'PAGO' ? 'PENDENTE' : 'PAGO';

      await updateDoc(docRef, { status_pagamento: novoStatus });
      const updated = await getDoc(docRef);

      return { ...convertDoc<Prestador>(updated), eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', data.eventoId] });
      toast({
        title: 'Status atualizado!',
        description: `Pagamento marcado como ${data.status_pagamento.toLowerCase()}.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

