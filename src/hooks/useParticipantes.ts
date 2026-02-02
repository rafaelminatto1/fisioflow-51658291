/**
 * useParticipantes - Migrated to Firebase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { ParticipanteCreate, ParticipanteUpdate } from '@/lib/validations/participante';
import { db } from '@/integrations/firebase/app';


interface Participante {
  id: string;
  evento_id: string;
  [key: string]: unknown;
}

// Helper to convert Firestore doc to Participante
const convertDocToParticipante = (doc: { id: string; data: () => Record<string, unknown> }): Participante => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Participante;
};

export function useParticipantes(eventoId: string) {
  return useQuery({
    queryKey: ['participantes', eventoId],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'participantes'),
        where('evento_id', '==', eventoId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToParticipante);
    },
    enabled: !!eventoId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useCreateParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participante: ParticipanteCreate) => {
      const participanteData = {
        ...participante,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'participantes'), participanteData);
      const snapshot = await getDocs(firestoreQuery(collection(db, 'participantes')));
      const newDoc = snapshot.docs.find(doc => doc.id === docRef.id);

      if (!newDoc) throw new Error('Failed to create participante');
      return convertDocToParticipante(newDoc);
    },
    // Optimistic update - adiciona participante antes da resposta do servidor
    onMutate: async (newParticipante) => {
      await queryClient.cancelQueries({ queryKey: ['participantes', newParticipante.evento_id] });

      const previousParticipantes = queryClient.getQueryData(['participantes', newParticipante.evento_id]);

      const optimisticParticipante = {
        ...newParticipante,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['participantes', newParticipante.evento_id], (old: Participante[] | undefined) => [
        optimisticParticipante as unknown as Participante,
        ...(old || []),
      ]);

      return { previousParticipantes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['participantes', variables.evento_id], context?.previousParticipantes);
      toast({
        title: 'Erro ao adicionar participante',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Participante adicionado!',
        description: 'Participante cadastrado com sucesso.',
      });
    },
  });
}

export function useUpdateParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: ParticipanteUpdate; eventoId: string }) => {
      const docRef = doc(db, 'participantes', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      const snapshot = await getDocs(firestoreQuery(collection(db, 'participantes')));
      const updatedDoc = snapshot.docs.find(doc => doc.id === id);

      if (!updatedDoc) throw new Error('Failed to update participante');
      return { ...convertDocToParticipante(updatedDoc), evento_id: eventoId };
    },
    // Optimistic update - atualiza participante antes da resposta do servidor
    onMutate: async ({ id, data, eventoId }) => {
      await queryClient.cancelQueries({ queryKey: ['participantes', eventoId] });

      const previousParticipantes = queryClient.getQueryData(['participantes', eventoId]);

      queryClient.setQueryData(['participantes', eventoId], (old: Participante[] | undefined) =>
        (old || []).map((p) =>
          p.id === id
            ? { ...p, ...data, updated_at: new Date().toISOString() }
            : p
        )
      );

      return { previousParticipantes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['participantes', variables.eventoId], context?.previousParticipantes);
      toast({
        title: 'Erro ao atualizar participante',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Participante atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
  });
}

export function useDeleteParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      await deleteDoc(doc(db, 'participantes', id));
      return eventoId;
    },
    // Optimistic update - remove participante da lista visualmente
    onMutate: async ({ id, eventoId }) => {
      await queryClient.cancelQueries({ queryKey: ['participantes', eventoId] });

      const previousParticipantes = queryClient.getQueryData(['participantes', eventoId]);

      queryClient.setQueryData(['participantes', eventoId], (old: { id: string }[]) =>
        (old || []).filter((p) => p.id !== id)
      );

      return { previousParticipantes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['participantes', variables.eventoId], context?.previousParticipantes);
      toast({
        title: 'Erro ao remover participante',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Participante removido!',
        description: 'Participante excluído com sucesso.',
      });
    },
  });
}

export function useExportParticipantes() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventoId: string) => {
      const q = firestoreQuery(
        collection(db, 'participantes'),
        where('evento_id', '==', eventoId)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(convertDocToParticipante);

      // Criar CSV
      const headers = ['Nome', 'Contato', 'Instagram', 'Segue Perfil', 'Observações'];
      const csvContent = [
        headers.join(','),
        ...data.map(p => [
          (p as Record<string, unknown>).nome,
          (p as Record<string, unknown>).contato || '',
          (p as Record<string, unknown>).instagram || '',
          (p as Record<string, unknown>).segue_perfil ? 'Sim' : 'Não',
          (p as Record<string, unknown>).observacoes || ''
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `participantes_${eventoId}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Exportação concluída!',
        description: 'CSV de participantes baixado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
