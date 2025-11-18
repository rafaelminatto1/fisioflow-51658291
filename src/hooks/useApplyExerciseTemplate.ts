import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

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
      if (!user?.id) throw new Error('Usuário não autenticado');

      // 1. Buscar template e seus itens
      const { data: template, error: templateError } = await supabase
        .from('exercise_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      if (!template) throw new Error('Template não encontrado');

      const { data: templateItems, error: itemsError } = await supabase
        .from('exercise_template_items')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('template_id', templateId)
        .order('order_index');

      if (itemsError) throw itemsError;

      // 2. Calcular semanas pós-operatórias se aplicável
      let currentWeek = 0;
      if (surgeryDate && template.category === 'pos_operatorio') {
        const surgery = new Date(surgeryDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - surgery.getTime());
        currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      }

      // 3. Filtrar exercícios pela fase atual (se aplicável)
      let filteredItems = templateItems || [];
      if (adjustWeeks && template.category === 'pos_operatorio' && surgeryDate) {
        filteredItems = (templateItems || []).filter(item => {
          if (item.week_start === null && item.week_end === null) return true;
          if (item.week_start !== null && currentWeek < item.week_start) return false;
          if (item.week_end !== null && currentWeek > item.week_end) return false;
          return true;
        });
      }

      // 4. Criar plano de exercícios
      const planName = `${template.name} - ${template.condition_name}${
        template.template_variant ? ` (${template.template_variant})` : ''
      }`;
      
      const { data: plan, error: planError } = await supabase
        .from('exercise_plans')
        .insert({
          patient_id: patientId,
          created_by: user.id,
          name: planName,
          description: `${template.description || ''}${
            surgeryDate
              ? `\n\nPós-operatório - Semana ${currentWeek}`
              : ''
          }`,
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: endDate,
          status: 'ativo',
        })
        .select()
        .single();

      if (planError) throw planError;
      if (!plan) throw new Error('Erro ao criar plano');

      // 5. Adicionar exercícios ao plano
      if (filteredItems.length > 0) {
        const planItems = filteredItems.map((item, index) => ({
          plan_id: plan.id,
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
        }));

        const { error: itemsInsertError } = await supabase
          .from('exercise_plan_items')
          .insert(planItems);

        if (itemsInsertError) throw itemsInsertError;
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
