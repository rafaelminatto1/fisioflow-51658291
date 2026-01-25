import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserOrganizationId } from '@/utils/userHelpers';
import { getFirebaseAuth } from '@/integrations/firebase/app';

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'A_FAZER' | 'EM_PROGRESSO' | 'REVISAO' | 'CONCLUIDO';
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  data_vencimento?: string;
  hora_vencimento?: string;
  start_date?: string; // For Gantt/Timeline
  responsavel_id?: string;
  lead_id?: string;
  organization_id?: string;
  created_by?: string;
  project_id?: string;
  parent_id?: string;
  order_index: number;
  tags: string[];
  checklist?: { id: string; text: string; completed: boolean }[];
  attachments?: { id: string; url: string; name: string; type: string }[];
  dependencies?: string[]; // IDs of tasks that must be completed before this one
  created_at: string;
  updated_at: string;
  responsavel?: {
    full_name: string;
    avatar_url?: string;
  };
}

export type TarefaStatus = Tarefa['status'];
export type TarefaPrioridade = Tarefa['prioridade'];

export const STATUS_LABELS: Record<TarefaStatus, string> = {
  A_FAZER: 'A Fazer',
  EM_PROGRESSO: 'Em Progresso',
  REVISAO: 'Revisão',
  CONCLUIDO: 'Concluído'
};

export const PRIORIDADE_LABELS: Record<TarefaPrioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente'
};

export const PRIORIDADE_COLORS: Record<TarefaPrioridade, string> = {
  BAIXA: 'bg-muted text-muted-foreground',
  MEDIA: 'bg-blue-500/20 text-blue-400',
  ALTA: 'bg-orange-500/20 text-orange-400',
  URGENTE: 'bg-red-500/20 text-red-400'
};

export function useTarefas() {
  return useQuery({
    queryKey: ['tarefas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as Tarefa[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos - dados considerados frescos
    gcTime: 1000 * 60 * 30, // 30 minutos - tempo para garbage collection
    refetchOnWindowFocus: false, // Evita recargas ao mudar de aba
  });
}

/**
 * Hook otimizado para buscar tarefas de um projeto específico
 * Filtra no backend para reduzir transferência de dados
 */
export function useProjectTarefas(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tarefas', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []) as Tarefa[];
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
      // Get org_id from profile (migrated to helper that uses Firestore)
      const organization_id = await getUserOrganizationId();
      const auth = getFirebaseAuth();
      const firebaseUser = auth.currentUser;

      const { data, error } = await supabase
        .from('tarefas')
        .insert([{
          titulo: tarefa.titulo!,
          descricao: tarefa.descricao,
          status: tarefa.status || 'A_FAZER',
          prioridade: tarefa.prioridade || 'MEDIA',
          data_vencimento: tarefa.data_vencimento,
          tags: tarefa.tags || [],
          order_index: tarefa.order_index || 0,
          organization_id,
          created_by: firebaseUser?.uid
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
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
        data_vencimento: newTarefa.data_vencimento,
        start_date: newTarefa.start_date,
        project_id: newTarefa.project_id,
        order_index: newTarefa.order_index || 0,
        tags: newTarefa.tags || [],
        checklist: newTarefa.checklist,
        attachments: newTarefa.attachments,
        dependencies: newTarefa.dependencies,
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
      const { data, error } = await supabase
        .from('tarefas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
    // Removido onSettled - a atualização otimista já mantém o cache sincronizado
    // Invalidação não é mais necessária pois confiamos na resposta do servidor
  });
}

export function useDeleteTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tarefas')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
      const promises = tarefas.map(({ id, ...updates }) =>
        supabase.from('tarefas').update(updates).eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error('Erro ao atualizar algumas tarefas');
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
    // Removido onSuccess - atualização otimista já mantém cache sincronizado
  });
}
