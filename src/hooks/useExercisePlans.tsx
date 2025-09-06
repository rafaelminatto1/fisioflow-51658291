import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExercisePlan {
  id: string;
  name: string;
  description: string;
  patient_id: string;
  status: 'Ativo' | 'Inativo' | 'Concluído';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ExercisePlanItem {
  id: string;
  exercise_plan_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  rest_time: number;
  order_index: number;
  notes?: string;
}

export function useExercisePlans() {
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExercisePlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedPlans: ExercisePlan[] = data?.map(plan => ({
        ...plan,
        status: plan.status as 'Ativo' | 'Inativo' | 'Concluído'
      })) || [];
      
      setExercisePlans(formattedPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos de exercícios');
    } finally {
      setLoading(false);
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

  const updateExercisePlan = async (id: string, updates: Partial<ExercisePlan>) => {
    try {
      const updateData: Partial<Pick<ExercisePlan, 'name' | 'description' | 'patient_id' | 'status'>> = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.patient_id) updateData.patient_id = updates.patient_id;
      if (updates.status) updateData.status = updates.status;

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

  const getExercisePlan = (id: string) => {
    return exercisePlans.find(plan => plan.id === id);
  };

  useEffect(() => {
    fetchExercisePlans();
  }, []);

  return {
    exercisePlans,
    loading,
    error,
    addExercisePlan,
    updateExercisePlan,
    deleteExercisePlan,
    getExercisePlan,
    refetch: fetchExercisePlans,
  };
}