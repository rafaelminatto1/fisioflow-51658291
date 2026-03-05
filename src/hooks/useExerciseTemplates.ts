/**
 * useExerciseTemplates - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query as firestoreQuery, where, orderBy, db } from '@/integrations/firebase/app';
import { templatesApi, type ExerciseTemplate as WorkersTemplate, type ExerciseTemplateItem as WorkersTemplateItem } from '@/lib/api/workers-client';
import { toast } from 'sonner';
import { normalizeFirestoreData } from '@/utils/firestoreData';

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
  bibliographic_references?: string[];
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

/**
 * Mapeia formato do Worker para App legada
 */
const mapWorkerToAppTemplate = (t: WorkersTemplate): ExerciseTemplate => ({
  id: t.id,
  name: t.name,
  description: t.description || undefined,
  category: t.category || '',
  condition_name: t.conditionName || '',
  template_variant: t.templateVariant || undefined,
  organization_id: t.organizationId || undefined,
  created_by: t.createdBy || undefined,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
  clinical_notes: t.clinicalNotes || undefined,
  contraindications: t.contraindications || undefined,
  precautions: t.precautions || undefined,
  progression_notes: t.progressionNotes || undefined,
  evidence_level: t.evidenceLevel || undefined,
  bibliographic_references: t.bibliographicReferences,
});

const mapWorkerToAppTemplateItem = (i: WorkersTemplateItem): ExerciseTemplateItem => ({
  id: i.id,
  template_id: i.templateId,
  exercise_id: i.exerciseId,
  order_index: i.orderIndex,
  sets: i.sets || undefined,
  repetitions: i.repetitions || undefined,
  duration: i.duration || undefined,
  notes: i.notes || undefined,
  week_start: i.weekStart || undefined,
  week_end: i.weekEnd || undefined,
  clinical_notes: i.clinicalNotes || undefined,
  focus_muscles: i.focusMuscles,
  purpose: i.purpose || undefined,
});

export const useWorkersTemplates = (filters?: { q?: string; category?: string; page?: number; limit?: number }) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workers-templates', filters],
    queryFn: () => templatesApi.list(filters),
    staleTime: 1000 * 60 * 5,
  });

  const templates = (data?.data ?? []).map(mapWorkerToAppTemplate);

  return {
    templates,
    meta: data?.meta,
    loading: isLoading,
    error,
    refetch,
  };
};

export const useExerciseTemplates = (category?: string) => {
  const queryClient = useQueryClient();

  const { templates, loading, error } = useWorkersTemplates({ category });

  const createMutation = useMutation({
    mutationFn: (template: any) => templatesApi.create(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar template: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...template }: any) => templatesApi.update(id, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-templates'] });
      toast.success('Template atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar template: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: templatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers-templates'] });
      toast.success('Template excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir template: ' + error.message);
    },
  });

  return {
    templates,
    loading,
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

export const useWorkersTemplateDetail = (id: string) => {
  return useQuery({
    queryKey: ['workers-template', id],
    queryFn: () => templatesApi.get(id),
    enabled: !!id,
  });
};

export const useTemplateItems = (templateId?: string) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-template-items', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const res = await templatesApi.get(templateId);
      return res.data.items.map(mapWorkerToAppTemplateItem);
    },
    enabled: !!templateId,
  });

  const items = data ?? [];

  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<ExerciseTemplateItem, 'id' | 'created_at'>) => {
      if (!templateId) throw new Error('templateId é obrigatório');
      const current = await templatesApi.get(templateId);
      const currentItems = current.data.items;
      const newItems = [...currentItems, { ...item, order_index: currentItems.length }];
      const res = await templatesApi.update(templateId, { items: newItems });
      return res.data.items.map(mapWorkerToAppTemplateItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-template-items', templateId] });
      queryClient.invalidateQueries({ queryKey: ['workers-templates'] });
      toast.success('Exercício adicionado ao template');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar exercício: ' + error.message);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!templateId) throw new Error('templateId é obrigatório');
      const current = await templatesApi.get(templateId);
      const newItems = current.data.items.filter((i: WorkersTemplateItem) => i.id !== id);
      await templatesApi.update(templateId, { items: newItems });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-template-items', templateId] });
      queryClient.invalidateQueries({ queryKey: ['workers-templates'] });
      toast.success('Exercício removido do template');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover exercício: ' + error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<ExerciseTemplateItem> & { id: string }) => {
      if (!templateId) throw new Error('templateId é obrigatório');
      const current = await templatesApi.get(templateId);
      const newItems = current.data.items.map((i: WorkersTemplateItem) =>
        i.id === id ? { ...i, ...changes } : i
      );
      const res = await templatesApi.update(templateId, { items: newItems });
      return res.data.items.map(mapWorkerToAppTemplateItem);
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