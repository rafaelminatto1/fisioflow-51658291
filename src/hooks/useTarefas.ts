import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    }
  });
}

export function useCreateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefa: Partial<Tarefa>) => {
      // Get org_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      const user = await supabase.auth.getUser();

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
          organization_id: profile?.organization_id,
          created_by: user.data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    }
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast.success('Tarefa excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir tarefa: ' + error.message);
    }
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao reordenar tarefas: ' + error.message);
    }
  });
}
