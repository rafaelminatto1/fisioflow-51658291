/**
 * useTarefas - Migrated to Firebase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, writeBatch, documentId, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { getUserOrganizationId } from '@/utils/userHelpers';
import { fisioLogger } from '@/lib/errors/logger';

const auth = getFirebaseAuth();

// Re-export types from centralized types file
export type {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  TarefaTipo,
  TeamMember,
  TarefaAttachment,
  TarefaReference,
  TarefaChecklist,
  TarefaChecklistItem,
  TarefaComment,
  TarefaActivity,
  TarefaMention,
} from '@/types/tarefas';

export {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORIDADE_LABELS,
  PRIORIDADE_COLORS,
  TIPO_LABELS,
  TIPO_COLORS,
} from '@/types/tarefas';

import type { Tarefa, TarefaStatus } from '@/types/tarefas';

// Query key para cache e prefetch
export const TAREFAS_QUERY_KEY = ['tarefas'] as const;

// Helper: Convert Firestore doc to Tarefa
const convertDocToTarefa = (doc: { id: string; data: () => Record<string, unknown> }): Tarefa => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Tarefa;
};

// QueryFn extraída para permitir prefetch (melhora velocidade ao abrir /tarefas)
export async function fetchTarefas(): Promise<Tarefa[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    fisioLogger.debug('No organization_id found - returning empty array', undefined, 'useTarefas');
    return [];
  }

  const q = firestoreQuery(
    collection(db, 'tarefas'),
    where('organization_id', '==', organizationId),
    orderBy('order_index', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertDocToTarefa);
}

export function useTarefas() {
  return useQuery({
    queryKey: TAREFAS_QUERY_KEY,
    queryFn: fetchTarefas,
    staleTime: 1000 * 60 * 5, // 5 minutos - dados considerados frescos
    gcTime: 1000 * 60 * 30, // 30 minutos - tempo para garbage collection
    refetchOnWindowFocus: false, // Evita recargas ao mudar de aba
  });
}

export function useProjectTarefas(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tarefas', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const q = firestoreQuery(
        collection(db, 'tarefas'),
        where('project_id', '==', projectId),
        orderBy('order_index', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToTarefa);
    },
    enabled: !!projectId, // Só executa se projectId for fornecido
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefa: Partial<Tarefa>) => {
      const organization_id = await getUserOrganizationId();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const tarefaData = {
        titulo: tarefa.titulo!,
        descricao: tarefa.descricao,
        status: tarefa.status || 'A_FAZER',
        prioridade: tarefa.prioridade || 'MEDIA',
        tipo: tarefa.tipo || 'TAREFA',
        data_vencimento: tarefa.data_vencimento,
        tags: tarefa.tags || [],
        order_index: tarefa.order_index || 0,
        organization_id,
        created_by: firebaseUser.uid,
        project_id: tarefa.project_id,
        parent_id: tarefa.parent_id,
        checklists: tarefa.checklists || [],
        attachments: tarefa.attachments || [],
        references: tarefa.references || [],
        dependencies: tarefa.dependencies || [],
        start_date: tarefa.start_date,
        responsavel_id: tarefa.responsavel_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'tarefas'), tarefaData);
      const docSnap = await getDoc(docRef);

      return { id: docSnap.id, ...tarefaData };
    },
    onMutate: async (newTarefa) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ['tarefas'] });

      // Salvar estado anterior para rollback
      const previousTarefas = queryClient.getQueryData(['tarefas']);

      // Criar tarefa temporária para atualização otimista
      const tempTarefa: Tarefa = {
        id: `temp-${Date.now()}`,
        titulo: newTarefa.titulo!,
        descricao: newTarefa.descricao,
        status: newTarefa.status || 'A_FAZER',
        prioridade: newTarefa.prioridade || 'MEDIA',
        tipo: newTarefa.tipo || 'TAREFA',
        data_vencimento: newTarefa.data_vencimento,
        start_date: newTarefa.start_date,
        project_id: newTarefa.project_id,
        order_index: newTarefa.order_index || 0,
        tags: newTarefa.tags || [],
        checklists: newTarefa.checklists || [],
        attachments: newTarefa.attachments || [],
        references: newTarefa.references || [],
        dependencies: newTarefa.dependencies || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Adicionar temporariamente ao cache
      queryClient.setQueryData(['tarefas'], (old: Tarefa[] | undefined) => {
        if (!old) return old;
        return [...old, tempTarefa];
      });

      return { previousTarefas, tempTarefa };
    },
    onSuccess: (data, _variables, context) => {
      // Substituir tarefa temporária pela real
      queryClient.setQueryData(['tarefas'], (old: Tarefa[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === context?.tempTarefa.id ? data : t);
      });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error: Error, _variables, context) => {
      // Rollback em caso de erro
      if (context?.previousTarefas) {
        queryClient.setQueryData(['tarefas'], context.previousTarefas);
      }
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });
}

export function useUpdateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tarefa> & { id: string }) => {
      const docRef = doc(db, 'tarefas', id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToTarefa(docSnap);
    },
    onMutate: async (updatedTarefa) => {
      // Cancelar queries em andamento para evitar conflitos
      await queryClient.cancelQueries({ queryKey: ['tarefas'] });

      // Salvar estado anterior para rollback em caso de erro
      const previousTarefas = queryClient.getQueryData(['tarefas']);

      // Atualização otimista - atualiza o cache imediatamente
      queryClient.setQueryData(['tarefas'], (old: Tarefa[] | undefined) => {
        if (!old) return old;
        return old.map((t) => (t.id === updatedTarefa.id ? { ...t, ...updatedTarefa } : t));
      });

      return { previousTarefas };
    },
    onError: (err, _updatedTarefa, context) => {
      // Rollback para o estado anterior em caso de erro
      if (context?.previousTarefas) {
        queryClient.setQueryData(['tarefas'], context.previousTarefas);
      }
      toast.error('Erro ao atualizar tarefa: ' + err.message);
    },
  });
}

export function useDeleteTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'tarefas', id));
      return id;
    },
    onMutate: async (deletedId) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ['tarefas'] });

      // Salvar estado anterior para rollback
      const previousTarefas = queryClient.getQueryData(['tarefas']);

      // Remover do cache otimistamente
      queryClient.setQueryData(['tarefas'], (old: Tarefa[] | undefined) => {
        if (!old) return old;
        return old.filter(t => t.id !== deletedId);
      });

      return { previousTarefas, deletedId };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback em caso de erro
      if (context?.previousTarefas) {
        queryClient.setQueryData(['tarefas'], context.previousTarefas);
      }
      toast.error('Erro ao excluir tarefa: ' + error.message);
    },
    onSuccess: () => {
      toast.success('Tarefa excluída com sucesso!');
    },
  });
}

export function useBulkUpdateTarefas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefas: Array<{ id: string; status?: TarefaStatus; order_index?: number }>) => {
      // Use batch for bulk updates (max 500 operations)
      const batchSize = 500;
      for (let i = 0; i < tarefas.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = tarefas.slice(i, i + batchSize);

        chunk.forEach(({ id, ...updates }) => {
          const docRef = doc(db, 'tarefas', id);
          batch.update(docRef, { ...updates, updated_at: new Date().toISOString() });
        });

        await batch.commit();
      }

      return tarefas;
    },
    onMutate: async (updatedTarefas) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ['tarefas'] });

      // Salvar estado anterior para rollback
      const previousTarefas = queryClient.getQueryData(['tarefas']);

      // Atualizar cache otimistamente
      queryClient.setQueryData(['tarefas'], (old: Tarefa[] | undefined) => {
        if (!old) return old;
        const updatedMap = new Map(updatedTarefas.map(t => [t.id, t]));
        return old.map(t => {
          const updates = updatedMap.get(t.id);
          return updates ? { ...t, ...updates } : t;
        });
      });

      return { previousTarefas };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback em caso de erro
      if (context?.previousTarefas) {
        queryClient.setQueryData(['tarefas'], context.previousTarefas);
      }
      toast.error('Erro ao reordenar tarefas: ' + error.message);
    },
  });
}
