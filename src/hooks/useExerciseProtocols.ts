import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProtocolMilestone {
  week: number;
  description: string;
}

export interface ProtocolRestriction {
  week_start: number;
  week_end?: number;
  description: string;
}

export interface ExerciseProtocol {
  id: string;
  name: string;
  condition_name: string;
  protocol_type: 'pos_operatorio' | 'patologia';
  weeks_total?: number;
  milestones: ProtocolMilestone[] | any;
  restrictions: ProtocolRestriction[] | any;
  progression_criteria: any[] | any;
  organization_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const useExerciseProtocols = () => {
  const queryClient = useQueryClient();

  const { data: protocols = [], isLoading, error } = useQuery({
    queryKey: ['exercise-protocols'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .select('*')
        .order('condition_name');

      if (error) throw error;
      return (data || []) as any as ExerciseProtocol[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (protocol: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .insert([protocol as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-protocols'] });
      toast.success('Protocolo criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar protocolo: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...protocol }: Partial<ExerciseProtocol> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .update(protocol as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-protocols'] });
      toast.success('Protocolo atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar protocolo: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_protocols')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-protocols'] });
      toast.success('Protocolo excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir protocolo: ' + error.message);
    },
  });

  return {
    protocols,
    loading: isLoading,
    error,
    createProtocol: createMutation.mutate,
    updateProtocol: updateMutation.mutate,
    deleteProtocol: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};