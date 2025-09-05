import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Exercise } from '@/types';

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedExercises: Exercise[] = data?.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category as 'fortalecimento' | 'alongamento' | 'mobilidade' | 'cardio' | 'equilibrio' | 'respiratorio',
        difficulty: exercise.difficulty as 'iniciante' | 'intermediario' | 'avancado',
        duration: exercise.duration,
        description: exercise.description,
        instructions: exercise.instructions,
        targetMuscles: exercise.target_muscles || [],
        equipment: exercise.equipment || [],
        contraindications: exercise.contraindications || '',
        createdAt: new Date(exercise.created_at),
        updatedAt: new Date(exercise.updated_at),
      })) || [];

      setExercises(formattedExercises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar exercícios');
    } finally {
      setLoading(false);
    }
  };

  const addExercise = async (exerciseData: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: exerciseData.name,
          category: exerciseData.category,
          difficulty: exerciseData.difficulty,
          duration: exerciseData.duration,
          description: exerciseData.description,
          instructions: exerciseData.instructions,
          target_muscles: exerciseData.targetMuscles,
          equipment: exerciseData.equipment || null,
          contraindications: exerciseData.contraindications || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchExercises();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar exercício');
      throw err;
    }
  };

  const updateExercise = async (id: string, updates: Partial<Exercise>) => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.category) updateData.category = updates.category;
      if (updates.difficulty) updateData.difficulty = updates.difficulty;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.description) updateData.description = updates.description;
      if (updates.instructions) updateData.instructions = updates.instructions;
      if (updates.targetMuscles) updateData.target_muscles = updates.targetMuscles;
      if (updates.equipment !== undefined) updateData.equipment = updates.equipment || null;
      if (updates.contraindications !== undefined) updateData.contraindications = updates.contraindications || null;

      const { error } = await supabase
        .from('exercises')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar exercício');
      throw err;
    }
  };

  const deleteExercise = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir exercício');
      throw err;
    }
  };

  const getExercise = (id: string) => {
    return exercises.find(exercise => exercise.id === id);
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  return {
    exercises,
    loading,
    error,
    addExercise,
    updateExercise,
    deleteExercise,
    getExercise,
    refetch: fetchExercises,
  };
}