import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExerciseTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  condition_name: string;
  template_variant?: string;
  organization_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Campos clínicos baseados em evidências
  clinical_notes?: string;
  contraindications?: string;
  precautions?: string;
  progression_notes?: string;
  evidence_level?: 'A' | 'B' | 'C' | 'D';
  references?: string[];
}

export interface ExerciseTemplateItem {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  sets?: number;
  repetitions?: number;
  duration?: number;
  notes?: string;
  week_start?: number;
  week_end?: number;
  // Campos clínicos específicos por exercício
  clinical_notes?: string;
  focus_muscles?: string[];
  purpose?: string;
  exercise?: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    difficulty?: string;
  };
}

export const useExerciseTemplates = (category?: string) => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['exercise-templates', category],
    queryFn: async () => {
      let query = supabase
        .from('exercise_templates')
        .select('*')
        .order('condition_name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ExerciseTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<ExerciseTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('exercise_templates')
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar template: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...template }: Partial<ExerciseTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercise_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-templates'] });
      toast.success('Template atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar template: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-templates'] });
      toast.success('Template excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir template: ' + error.message);
    },
  });

  return {
    templates,
    loading: isLoading,
    error,
    createTemplate: createMutation.mutate,
    createTemplateAsync: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useTemplateItems = (templateId?: string) => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['exercise-template-items', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('exercise_template_items')
        .select(`
          *,
          exercise:exercises(id, name, description, category, difficulty)
        `)
        .eq('template_id', templateId)
        .order('order_index');

      if (error) throw error;
      return data as ExerciseTemplateItem[];
    },
    enabled: !!templateId,
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<ExerciseTemplateItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('exercise_template_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-template-items', templateId] });
      toast.success('Exercício adicionado ao template');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar exercício: ' + error.message);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_template_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-template-items', templateId] });
      toast.success('Exercício removido do template');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover exercício: ' + error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<ExerciseTemplateItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercise_template_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-template-items', templateId] });
      toast.success('Exercício atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar exercício: ' + error.message);
    },
  });

  return {
    items,
    loading: isLoading,
    addItem: addItemMutation.mutate,
    removeItem: removeItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
  };
};
