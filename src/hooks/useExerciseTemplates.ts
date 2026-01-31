/**
 * useExerciseTemplates - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('exercise_templates') → Firestore collection 'exercise_templates'
 * - supabase.from('exercise_template_items') → Firestore collection 'exercise_template_items'
 * - Joins with exercises handled by fetching exercise data separately
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';



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

// Helper to convert Firestore doc to ExerciseTemplate
const convertDocToExerciseTemplate = (doc: { id: string; data: () => Record<string, unknown> }): ExerciseTemplate => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as ExerciseTemplate;
};

// Helper to convert Firestore doc to ExerciseTemplateItem
const convertDocToExerciseTemplateItem = (doc: { id: string; data: () => Record<string, unknown> }): ExerciseTemplateItem => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as ExerciseTemplateItem;
};

export const useExerciseTemplates = (category?: string) => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['exercise-templates', category],
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'exercise_templates'),
        orderBy('condition_name')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToExerciseTemplate);

      // Filter by category if provided
      if (category) {
        data = data.filter(t => t.category === category);
      }

      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<ExerciseTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const templateData = {
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'exercise_templates'), templateData);
      const docSnap = await getDoc(docRef);

      return convertDocToExerciseTemplate(docSnap);
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
      const docRef = doc(db, 'exercise_templates', id);
      await updateDoc(docRef, {
        ...template,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToExerciseTemplate(docSnap);
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
      await deleteDoc(doc(db, 'exercise_templates', id));
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

      const q = firestoreQuery(
        collection(db, 'exercise_template_items'),
        where('template_id', '==', templateId),
        orderBy('order_index')
      );

      const snapshot = await getDocs(q);
      const templateItems = snapshot.docs.map(convertDocToExerciseTemplateItem);

      // Fetch exercise data for each item
      const itemsWithExercise = await Promise.all(
        templateItems.map(async (item) => {
          if (item.exercise_id) {
            const exerciseDoc = await getDoc(doc(db, 'exercises', item.exercise_id));
            if (exerciseDoc.exists()) {
              const exerciseData = exerciseDoc.data();
              return {
                ...item,
                exercise: {
                  id: exerciseDoc.id,
                  name: exerciseData.name,
                  description: exerciseData.description,
                  category: exerciseData.category,
                  difficulty: exerciseData.difficulty,
                },
              };
            }
          }
          return item;
        })
      );

      return itemsWithExercise as ExerciseTemplateItem[];
    },
    enabled: !!templateId,
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<ExerciseTemplateItem, 'id' | 'created_at'>) => {
      const itemData = {
        ...item,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'exercise_template_items'), itemData);
      const docSnap = await getDoc(docRef);

      return convertDocToExerciseTemplateItem(docSnap);
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
      await deleteDoc(doc(db, 'exercise_template_items', id));
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
      const docRef = doc(db, 'exercise_template_items', id);
      await updateDoc(docRef, item);

      const docSnap = await getDoc(docRef);
      return convertDocToExerciseTemplateItem(docSnap);
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
