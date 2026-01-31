/**
 * useApplyExerciseTemplate - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('exercise_templates') → Firestore collection 'exercise_templates'
 * - supabase.from('exercise_template_items') → Firestore collection 'exercise_template_items'
 * - supabase.from('exercise_plans') → Firestore collection 'exercise_plans'
 * - supabase.from('exercise_plan_items') → Firestore collection 'exercise_plan_items'
 * - Joins replaced with separate queries (Firestore limitation)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDoc, getDocs, addDoc, doc, query, where, orderBy,  } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { db } from '@/integrations/firebase/app';



interface ApplyTemplateParams {
  templateId: string;
  patientId: string;
  surgeryDate?: string; // Para pós-operatórios
  adjustWeeks?: boolean; // Se deve ajustar por semanas
  startDate?: string;
  endDate?: string;
}

export const useApplyExerciseTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const applyTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      patientId,
      surgeryDate,
      adjustWeeks = true,
      startDate,
      endDate,
    }: ApplyTemplateParams) => {
      if (!user?.uid) throw new Error('Usuário não autenticado');

      // 1. Buscar template
      const templateDoc = await getDoc(doc(db, 'exercise_templates', templateId));
      if (!templateDoc.exists()) {
        throw new Error('Template não encontrado');
      }
      const template = { id: templateDoc.id, ...templateDoc.data() };

      // 2. Buscar itens do template
      const itemsQuery = query(
        collection(db, 'exercise_template_items'),
        where('template_id', '==', templateId),
        orderBy('order_index')
      );
      const itemsSnap = await getDocs(itemsQuery);
      const templateItems = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 3. Calcular semanas pós-operatórias se aplicável
      let currentWeek = 0;
      if (surgeryDate && template.category === 'pos_operatorio') {
        const surgery = new Date(surgeryDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - surgery.getTime());
        currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      }

      // 4. Filtrar exercícios pela fase atual (se aplicável)
      let filteredItems = templateItems;

      interface ExerciseTemplateItem {
        exercise_id: string;
        sets: number;
        repetitions: number;
        duration: number;
        notes?: string;
        week_start: number | null;
        week_end: number | null;
      }

      if (adjustWeeks && template.category === 'pos_operatorio' && surgeryDate) {
        filteredItems = templateItems.filter((item: ExerciseTemplateItem) => {
          if (item.week_start === null && item.week_end === null) return true;
          if (item.week_start !== null && currentWeek < item.week_start) return false;
          if (item.week_end !== null && currentWeek > item.week_end) return false;
          return true;
        });
      }

      // 5. Criar plano de exercícios
      const planName = `${template.name} - ${template.condition_name}${
        template.template_variant ? ` (${template.template_variant})` : ''
      }`;

      const planData = {
        patient_id: patientId,
        created_by: user.uid,
        name: planName,
        description: `${template.description || ''}${
          surgeryDate
            ? `\n\nPós-operatório - Semana ${currentWeek}`
            : ''
        }`,
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate,
        status: 'ativo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const planRef = await addDoc(collection(db, 'exercise_plans'), planData);
      const planSnap = await getDoc(planRef);
      const plan = { id: planRef.id, ...planSnap.data() };

      // 6. Adicionar exercícios ao plano
      if (filteredItems.length > 0) {
        const planItems = filteredItems.map((item: ExerciseTemplateItem, index: number) => ({
          plan_id: planRef.id,
          exercise_id: item.exercise_id,
          order_index: index,
          sets: item.sets,
          repetitions: item.repetitions,
          duration: item.duration,
          notes: item.notes || (
            item.week_start !== null || item.week_end !== null
              ? `Semanas: ${item.week_start || '0'}${item.week_end ? ` - ${item.week_end}` : '+'}`
              : undefined
          ),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        // Batch insert all plan items
        await Promise.all(
          planItems.map(item => addDoc(collection(db, 'exercise_plan_items'), item))
        );
      }

      return {
        plan,
        itemsCount: filteredItems.length,
        currentWeek,
        templateName: template.name,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-plans'] });
      queryClient.invalidateQueries({ queryKey: ['patient-exercise-plans'] });

      toast.success(
        `Plano "${data.templateName}" criado com sucesso!`,
        {
          description: `${data.itemsCount} exercícios adicionados${
            data.currentWeek > 0 ? ` (Semana ${data.currentWeek})` : ''
          }`,
        }
      );
    },
    onError: (error: Error) => {
      toast.error('Erro ao aplicar template', {
        description: error.message,
      });
    },
  });

  return {
    applyTemplate: applyTemplateMutation.mutate,
    isApplying: applyTemplateMutation.isPending,
  };
};
