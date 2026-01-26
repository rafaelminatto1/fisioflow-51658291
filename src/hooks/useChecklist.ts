/**
 * useChecklist - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('checklist_items') → Firestore collection 'checklist_items'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ChecklistItemCreate, ChecklistItemUpdate } from '@/lib/validations/checklist';
import { getFirebaseDb } from '@/integrations/firebase/app';
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

const db = getFirebaseDb();

export function useChecklist(eventoId: string) {
  return useQuery({
    queryKey: ['checklist', eventoId],
    queryFn: async () => {
      const q = query(
        collection(db, 'checklist_items'),
        where('evento_id', '==', eventoId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!eventoId,
  });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: ChecklistItemCreate) => {
      const docRef = await addDoc(collection(db, 'checklist_items'), item);

      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...docSnap.data() };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', data.evento_id] });
      toast({
        title: 'Item adicionado!',
        description: 'Item do checklist criado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao adicionar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: ChecklistItemUpdate; eventoId: string }) => {
      const docRef = doc(db, 'checklist_items', id);
      await updateDoc(docRef, data);

      const docSnap = await getDoc(docRef);
      return { id: docSnap.id, ...docSnap.data(), eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', data.evento_id] });
      toast({
        title: 'Item atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const docRef = doc(db, 'checklist_items', id);
      const docSnap = await getDoc(docRef);

      const item = { id: docSnap.id, ...docSnap.data() } as any;
      const novoStatus = item.status === 'OK' ? 'ABERTO' : 'OK';

      await updateDoc(docRef, { status: novoStatus });

      return { ...item, status: novoStatus, eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', data.evento_id] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      await deleteDoc(doc(db, 'checklist_items', id));
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', eventoId] });
      toast({
        title: 'Item removido!',
        description: 'Item excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
