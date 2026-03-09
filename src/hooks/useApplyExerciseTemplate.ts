/**
 * useApplyExerciseTemplate - Migrated to Neon/Workers
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi, exercisePlansApi } from '@/lib/api/workers-client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface ApplyTemplateParams {
  templateId: string;
  patientId: string;
  surgeryDate?: string;
  adjustWeeks?: boolean;
  startDate?: string;
  endDate?: string;
}

interface ExerciseTemplateItem {
  exercise_id: string;
  sets: number;
  repetitions: number;
  duration: number;
  notes?: string;
  week_start: number | null;
  week_end: number | null;
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

      // 1. Fetch template + items via Workers API (Neon)
      const templateRes = await templatesApi.get(templateId);
      if (!templateRes.data) throw new Error('Template não encontrado');
      const template = templateRes.data;
      const templateItems: ExerciseTemplateItem[] = template.items ?? [];

      // 2. Calculate post-surgery week if applicable
      let currentWeek = 0;
      if (surgeryDate && template.category === 'pos_operatorio') {
        const surgery = new Date(surgeryDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - surgery.getTime());
        currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      }

      // 3. Filter exercises by current phase
      let filteredItems = templateItems;
      if (adjustWeeks && template.category === 'pos_operatorio' && surgeryDate) {
        filteredItems = templateItems.filter((item) => {
          if (item.week_start === null && item.week_end === null) return true;
          if (item.week_start !== null && currentWeek < item.week_start) return false;
          if (item.week_end !== null && currentWeek > item.week_end) return false;
          return true;
        });
      }

      // 4. Create exercise plan via Workers API
      const planName = `${template.name} - ${template.condition_name}${
        template.template_variant ? ` (${template.template_variant})` : ''
      }`;

      const result = await exercisePlansApi.create({
        patient_id: patientId,
        created_by: user.uid,
        name: planName,
        description: `${template.description || ''}${
          surgeryDate ? `\n\nPós-operatório - Semana ${currentWeek}` : ''
        }`,
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate ?? null,
        status: 'ativo',
        items: filteredItems.map((item, idx) => ({
          exercise_id: item.exercise_id,
          order_index: idx,
          sets: item.sets,
          repetitions: item.repetitions,
          duration: item.duration,
          notes: item.notes || (
            item.week_start !== null || item.week_end !== null
              ? `Semanas: ${item.week_start || '0'}${item.week_end ? ` - ${item.week_end}` : '+'}`
              : undefined
          ),
        })),
      });

      return {
        plan: result.data,
        itemsCount: filteredItems.length,
        currentWeek,
        templateName: template.name,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-plans'] });
      queryClient.invalidateQueries({ queryKey: ['patient-exercise-plans'] });
      toast.success(`Plano "${data.templateName}" criado com sucesso!`, {
        description: `${data.itemsCount} exercícios adicionados${
          data.currentWeek > 0 ? ` (Semana ${data.currentWeek})` : ''
        }`,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao aplicar template', { description: error.message });
    },
  });

  return {
    applyTemplate: applyTemplateMutation.mutate,
    isApplying: applyTemplateMutation.isPending,
  };
};
