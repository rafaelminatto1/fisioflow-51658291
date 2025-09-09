import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { errorLogger } from '@/lib/errors/logger';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions: string;
  category: 'strength' | 'flexibility' | 'balance' | 'cardio' | 'functional' | 'neuromuscular';
  body_region: 'cervical' | 'thoracic' | 'lumbar' | 'upper_limb' | 'lower_limb' | 'core' | 'full_body';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
  contraindications?: string[];
  precautions?: string[];
  video_url?: string;
  image_urls?: string[];
  duration_min?: number;
  duration_max?: number;
  sets_min?: number;
  sets_max?: number;
  reps_min?: number;
  reps_max?: number;
  hold_time?: number;
  rest_time?: number;
  progression_criteria?: string;
  modifications?: string[];
  benefits?: string[];
  created_by: string;
  is_public: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateExerciseData {
  name: string;
  description: string;
  instructions: string;
  category: Exercise['category'];
  body_region: Exercise['body_region'];
  difficulty_level: Exercise['difficulty_level'];
  equipment?: string[];
  contraindications?: string[];
  precautions?: string[];
  video_url?: string;
  image_urls?: string[];
  duration_min?: number;
  duration_max?: number;
  sets_min?: number;
  sets_max?: number;
  reps_min?: number;
  reps_max?: number;
  hold_time?: number;
  rest_time?: number;
  progression_criteria?: string;
  modifications?: string[];
  benefits?: string[];
  is_public?: boolean;
  tags?: string[];
}

export type UpdateExerciseData = Partial<CreateExerciseData>;

export interface ExerciseFilters {
  category?: Exercise['category'];
  body_region?: Exercise['body_region'];
  difficulty_level?: Exercise['difficulty_level'];
  equipment?: string;
  search?: string;
  tags?: string[];
  created_by?: string;
}

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  // Fetch exercises with optional filters
  const fetchExercises = useCallback(async (filters?: ExerciseFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.body_region) {
        query = query.eq('body_region', filters.body_region);
      }
      
      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.equipment) {
        query = query.contains('equipment', [filters.equipment]);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      } else {
        // Show public exercises or user's own exercises
        if (profile) {
          query = query.or(`is_public.eq.true,created_by.eq.${profile.id}`);
        } else {
          query = query.eq('is_public', true);
        }
      }

      // Apply search filter
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,instructions.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setExercises(data || []);
      
      errorLogger.logInfo('Exercises fetched successfully', {
        count: data?.length || 0,
        filters: JSON.stringify(filters)
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar exercícios';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useExercises.fetchExercises',
        filters
      });
      toast({
        title: "Erro ao carregar exercícios",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Create exercise
  const createExercise = useCallback(async (data: CreateExerciseData) => {
    if (!profile) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setError(null);

      const exerciseData = {
        ...data,
        created_by: profile.id,
        is_public: data.is_public || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newExercise, error: createError } = await supabase
        .from('exercises')
        .insert([exerciseData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      setExercises(prev => [newExercise, ...prev]);

      errorLogger.logInfo('Exercise created successfully', {
        exerciseId: newExercise.id,
        name: data.name,
        category: data.category
      });

      toast({
        title: "Exercício criado",
        description: "O exercício foi criado com sucesso.",
      });

      return newExercise;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar exercício';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useExercises.createExercise',
        data
      });
      throw new Error(message);
    }
  }, [profile]);

  // Update exercise
  const updateExercise = useCallback(async (id: string, data: UpdateExerciseData) => {
    try {
      setError(null);

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: updatedExercise, error: updateError } = await supabase
        .from('exercises')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setExercises(prev => prev.map(ex => 
        ex.id === id ? updatedExercise : ex
      ));

      errorLogger.logInfo('Exercise updated successfully', {
        exerciseId: id,
        changes: Object.keys(data)
      });

      toast({
        title: "Exercício atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      return updatedExercise;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar exercício';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useExercises.updateExercise',
        exerciseId: id,
        data
      });
      throw new Error(message);
    }
  }, []);

  // Delete exercise
  const deleteExercise = useCallback(async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setExercises(prev => prev.filter(ex => ex.id !== id));

      errorLogger.logInfo('Exercise deleted successfully', {
        exerciseId: id
      });

      toast({
        title: "Exercício excluído",
        description: "O exercício foi excluído com sucesso.",
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir exercício';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useExercises.deleteExercise',
        exerciseId: id
      });
      throw new Error(message);
    }
  }, []);

  // Get exercise by ID
  const getExerciseById = useCallback((id: string) => {
    return exercises.find(ex => ex.id === id);
  }, [exercises]);

  // Get exercises by category
  const getExercisesByCategory = useCallback((category: Exercise['category']) => {
    return exercises.filter(ex => ex.category === category);
  }, [exercises]);

  // Get exercises by body region
  const getExercisesByBodyRegion = useCallback((bodyRegion: Exercise['body_region']) => {
    return exercises.filter(ex => ex.body_region === bodyRegion);
  }, [exercises]);

  // Search exercises
  const searchExercises = useCallback((searchTerm: string) => {
    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.instructions.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.tags && ex.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [exercises]);

  // Get recommended exercises based on conditions
  const getRecommendedExercises = useCallback((
    bodyRegion: Exercise['body_region'],
    difficulty: Exercise['difficulty_level'] = 'beginner',
    category?: Exercise['category']
  ) => {
    let filtered = exercises.filter(ex => 
      ex.body_region === bodyRegion && 
      ex.difficulty_level === difficulty
    );

    if (category) {
      filtered = filtered.filter(ex => ex.category === category);
    }

    // Sort by public first, then by name
    return filtered.sort((a, b) => {
      if (a.is_public && !b.is_public) return -1;
      if (!a.is_public && b.is_public) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [exercises]);

  // Get available equipment list
  const getAvailableEquipment = useCallback(() => {
    const equipmentSet = new Set<string>();
    exercises.forEach(ex => {
      if (ex.equipment) {
        ex.equipment.forEach(eq => equipmentSet.add(eq));
      }
    });
    return Array.from(equipmentSet).sort();
  }, [exercises]);

  // Get available tags
  const getAvailableTags = useCallback(() => {
    const tagsSet = new Set<string>();
    exercises.forEach(ex => {
      if (ex.tags) {
        ex.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [exercises]);

  // Subscribe to real-time changes
  useEffect(() => {
    fetchExercises();

    const subscription = supabase
      .channel('exercises_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'exercises' 
        }, 
        (_payload) => {
          // Refetch exercises on any change
          fetchExercises();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchExercises]);

  return {
    exercises,
    loading,
    error,
    fetchExercises,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseById,
    getExercisesByCategory,
    getExercisesByBodyRegion,
    searchExercises,
    getRecommendedExercises,
    getAvailableEquipment,
    getAvailableTags
  };
}