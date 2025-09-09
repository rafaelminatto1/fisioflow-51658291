import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExercisePlan {
  id: string;
  name: string;
  description: string;
  patient_id: string;
  patient_name?: string;
  status: 'Ativo' | 'Inativo' | 'Concluído';
  created_at: string;
  updated_at: string;
  created_by: string;
  phase?: 'acute' | 'subacute' | 'chronic' | 'maintenance';
  estimated_duration_weeks?: number;
  frequency_per_week?: number;
  total_exercises?: number;
  last_session_date?: string;
}

export interface ExercisePlanItem {
  id: string;
  exercise_plan_id: string;
  exercise_id: string;
  exercise?: {
    id: string;
    name: string;
    category: string;
    difficulty: string;
    description: string;
    instructions: string;
    target_muscles: string[];
    equipment?: string[];
    contraindications?: string;
  };
  sets: number;
  reps: number;
  rest_time: number;
  order_index: number;
  notes?: string;
  weight_kg?: number;
  duration_seconds?: number;
  progression_criteria?: string;
  modifications?: string[];
  is_completed?: boolean;
  completion_date?: string;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  condition: string;
  phase: 'acute' | 'subacute' | 'chronic' | 'maintenance';
  exercises: ExercisePlanItem[];
  estimated_duration_weeks: number;
  frequency_per_week: number;
}

export interface ExerciseProgress {
  exercise_id: string;
  exercise_name: string;
  sessions_completed: number;
  total_sessions_planned: number;
  average_sets_completed: number;
  average_reps_completed: number;
  progression_level: number;
  last_performed_date?: string;
  difficulty_rating?: 'easy' | 'appropriate' | 'difficult';
  patient_feedback?: string;
}

export function useExercisePlans() {
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [planItems, setPlanItems] = useState<Record<string, ExercisePlanItem[]>>({});
  const [templates] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExercisePlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_plans')
        .select(`
          *,
          patients(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedPlans: ExercisePlan[] = data?.map(plan => ({
        ...plan,
        patient_name: plan.patients?.name,
        status: plan.status as 'Ativo' | 'Inativo' | 'Concluído'
      })) || [];
      
      setExercisePlans(formattedPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos de exercícios');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanItems = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('exercise_plan_items')
        .select(`
          *,
          exercises(*)
        `)
        .eq('exercise_plan_id', planId)
        .order('order_index');

      if (error) throw error;

      const items: ExercisePlanItem[] = data?.map(item => ({
        ...item,
        exercise: item.exercises
      })) || [];

      setPlanItems(prev => ({
        ...prev,
        [planId]: items
      }));

      return items;
    } catch (err) {
      console.error('Error fetching plan items:', err);
      return [];
    }
  };

  const addExercisePlan = async (planData: Omit<ExercisePlan, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('exercise_plans')
        .insert({
          name: planData.name,
          description: planData.description,
          patient_id: planData.patient_id,
          status: planData.status,
          phase: planData.phase,
          estimated_duration_weeks: planData.estimated_duration_weeks,
          frequency_per_week: planData.frequency_per_week,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchExercisePlans();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar plano de exercícios');
      throw err;
    }
  };

  const addExerciseToPlan = async (planId: string, exerciseData: Omit<ExercisePlanItem, 'id' | 'exercise_plan_id'>) => {
    try {
      // Get current max order_index
      const currentItems = planItems[planId] || [];
      const maxOrder = Math.max(...currentItems.map(item => item.order_index), -1);

      const { data, error } = await supabase
        .from('exercise_plan_items')
        .insert({
          exercise_plan_id: planId,
          exercise_id: exerciseData.exercise_id,
          sets: exerciseData.sets,
          reps: exerciseData.reps,
          rest_time: exerciseData.rest_time,
          order_index: maxOrder + 1,
          notes: exerciseData.notes,
          weight_kg: exerciseData.weight_kg,
          duration_seconds: exerciseData.duration_seconds,
          progression_criteria: exerciseData.progression_criteria,
          modifications: exerciseData.modifications,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPlanItems(planId);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar exercício ao plano');
      throw err;
    }
  };

  const updateExercisePlan = async (id: string, updates: Partial<ExercisePlan>) => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.patient_id) updateData.patient_id = updates.patient_id;
      if (updates.status) updateData.status = updates.status;
      if (updates.phase) updateData.phase = updates.phase;
      if (updates.estimated_duration_weeks) updateData.estimated_duration_weeks = updates.estimated_duration_weeks;
      if (updates.frequency_per_week) updateData.frequency_per_week = updates.frequency_per_week;

      const { error } = await supabase
        .from('exercise_plans')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchExercisePlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar plano de exercícios');
      throw err;
    }
  };

  const updatePlanItem = async (itemId: string, updates: Partial<ExercisePlanItem>) => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.sets) updateData.sets = updates.sets;
      if (updates.reps) updateData.reps = updates.reps;
      if (updates.rest_time) updateData.rest_time = updates.rest_time;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.weight_kg !== undefined) updateData.weight_kg = updates.weight_kg;
      if (updates.duration_seconds !== undefined) updateData.duration_seconds = updates.duration_seconds;
      if (updates.progression_criteria !== undefined) updateData.progression_criteria = updates.progression_criteria;
      if (updates.modifications !== undefined) updateData.modifications = updates.modifications;
      if (updates.is_completed !== undefined) updateData.is_completed = updates.is_completed;

      const { error } = await supabase
        .from('exercise_plan_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      // Refresh plan items for the affected plan
      const item = Object.values(planItems).flat().find(item => item.id === itemId);
      if (item) {
        await fetchPlanItems(item.exercise_plan_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar exercício do plano');
      throw err;
    }
  };

  const deleteExercisePlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exercise_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchExercisePlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir plano de exercícios');
      throw err;
    }
  };

  const removeExerciseFromPlan = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('exercise_plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Refresh plan items
      const item = Object.values(planItems).flat().find(item => item.id === itemId);
      if (item) {
        await fetchPlanItems(item.exercise_plan_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover exercício do plano');
      throw err;
    }
  };

  const reorderPlanItems = async (planId: string, itemIds: string[]) => {
    try {
      const updates = itemIds.map((itemId, index) => 
        supabase
          .from('exercise_plan_items')
          .update({ order_index: index })
          .eq('id', itemId)
      );

      await Promise.all(updates);
      await fetchPlanItems(planId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reordenar exercícios');
      throw err;
    }
  };

  const duplicatePlan = async (planId: string, newName?: string) => {
    try {
      const originalPlan = getExercisePlan(planId);
      if (!originalPlan) throw new Error('Plan not found');

      const { data: newPlan, error: planError } = await supabase
        .from('exercise_plans')
        .insert({
          name: newName || `${originalPlan.name} (Cópia)`,
          description: originalPlan.description,
          patient_id: originalPlan.patient_id,
          status: 'Inativo',
          phase: originalPlan.phase,
          estimated_duration_weeks: originalPlan.estimated_duration_weeks,
          frequency_per_week: originalPlan.frequency_per_week,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Copy plan items
      const originalItems = planItems[planId] || [];
      if (originalItems.length > 0) {
        const itemsData = originalItems.map(item => ({
          exercise_plan_id: newPlan.id,
          exercise_id: item.exercise_id,
          sets: item.sets,
          reps: item.reps,
          rest_time: item.rest_time,
          order_index: item.order_index,
          notes: item.notes,
          weight_kg: item.weight_kg,
          duration_seconds: item.duration_seconds,
          progression_criteria: item.progression_criteria,
          modifications: item.modifications,
        }));

        const { error: itemsError } = await supabase
          .from('exercise_plan_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      await fetchExercisePlans();
      return newPlan;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao duplicar plano');
      throw err;
    }
  };

  const createPlanFromTemplate = async (templateId: string, patientId: string, planName: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data: newPlan, error: planError } = await supabase
        .from('exercise_plans')
        .insert({
          name: planName,
          description: `Plano baseado no template: ${template.name}`,
          patient_id: patientId,
          status: 'Ativo',
          phase: template.phase,
          estimated_duration_weeks: template.estimated_duration_weeks,
          frequency_per_week: template.frequency_per_week,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Add exercises from template
      if (template.exercises.length > 0) {
        const itemsData = template.exercises.map(exercise => ({
          exercise_plan_id: newPlan.id,
          exercise_id: exercise.exercise_id,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_time: exercise.rest_time,
          order_index: exercise.order_index,
          notes: exercise.notes,
          weight_kg: exercise.weight_kg,
          duration_seconds: exercise.duration_seconds,
          progression_criteria: exercise.progression_criteria,
          modifications: exercise.modifications,
        }));

        const { error: itemsError } = await supabase
          .from('exercise_plan_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      await fetchExercisePlans();
      return newPlan;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar plano a partir do template');
      throw err;
    }
  };

  const getExercisePlan = (id: string) => {
    return exercisePlans.find(plan => plan.id === id);
  };

  const getPlanItems = (planId: string) => {
    return planItems[planId] || [];
  };

  // Statistics and analytics
  const planStats = useMemo(() => {
    const totalPlans = exercisePlans.length;
    const activePlans = exercisePlans.filter(plan => plan.status === 'Ativo').length;
    const completedPlans = exercisePlans.filter(plan => plan.status === 'Concluído').length;
    
    const plansByPhase = exercisePlans.reduce((acc, plan) => {
      if (plan.phase) {
        acc[plan.phase] = (acc[plan.phase] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const averageExercisesPerPlan = exercisePlans.reduce((sum, plan) => {
      const items = planItems[plan.id] || [];
      return sum + items.length;
    }, 0) / (exercisePlans.length || 1);

    return {
      totalPlans,
      activePlans,
      completedPlans,
      plansByPhase,
      averageExercisesPerPlan: Math.round(averageExercisesPerPlan),
    };
  }, [exercisePlans, planItems]);

  const getPatientPlans = (patientId: string) => {
    return exercisePlans.filter(plan => plan.patient_id === patientId);
  };

  const getActivePlanForPatient = (patientId: string) => {
    return exercisePlans.find(plan => plan.patient_id === patientId && plan.status === 'Ativo');
  };

  useEffect(() => {
    fetchExercisePlans();
  }, []);

  useEffect(() => {
    // Auto-fetch plan items for all plans when they change
    exercisePlans.forEach(plan => {
      if (!planItems[plan.id]) {
        fetchPlanItems(plan.id);
      }
    });
  }, [exercisePlans, planItems]);

  return {
    exercisePlans,
    planItems,
    templates,
    loading,
    error,
    planStats,
    addExercisePlan,
    addExerciseToPlan,
    updateExercisePlan,
    updatePlanItem,
    deleteExercisePlan,
    removeExerciseFromPlan,
    reorderPlanItems,
    duplicatePlan,
    createPlanFromTemplate,
    getExercisePlan,
    getPlanItems,
    getPatientPlans,
    getActivePlanForPatient,
    fetchPlanItems,
    refetch: fetchExercisePlans,
  };
}