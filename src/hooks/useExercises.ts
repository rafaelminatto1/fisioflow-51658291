import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  video_url?: string;
  image_url?: string;
  instructions?: string;
  sets?: number;
  repetitions?: number;
  duration?: number;
  created_at?: string;
  updated_at?: string;
}

export const useExercises = () => {
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Exercise[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (exercise: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('exercises')
        .insert([exercise])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercício criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar exercício: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...exercise }: Partial<Exercise> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update(exercise)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercício atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar exercício: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercício excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir exercício: ' + error.message);
    },
  });

  return {
    exercises,
    loading: isLoading,
    error,
    createExercise: createMutation.mutate,
    updateExercise: updateMutation.mutate,
    deleteExercise: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
