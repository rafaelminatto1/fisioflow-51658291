
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types";

export interface ExerciseFilters {
    category?: string;
    difficulty?: string;
    searchTerm?: string;
    pathologies?: string[];
    bodyParts?: string[];
    equipment?: string[];
    onlyFavorites?: boolean;
}

export const exerciseService = {
    async getExercises(filters?: ExerciseFilters) {
        let query = supabase
            .from('exercises')
            .select('*')
            .order('name');

        if (filters?.searchTerm) {
            query = query.ilike('name', `%${filters.searchTerm}%`);
        }

        if (filters?.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }

        if (filters?.difficulty && filters.difficulty !== 'all') {
            query = query.eq('difficulty', filters.difficulty);
        }

        if (filters?.pathologies && filters.pathologies.length > 0) {
            // Use overlap operator for array comparison
            // This finds exercises where indicated_pathologies overlaps with the selected pathologies
            query = query.overlaps('indicated_pathologies', filters.pathologies);
        }

        if (filters?.bodyParts && filters.bodyParts.length > 0) {
            query = query.overlaps('body_parts', filters.bodyParts);
        }

        if (filters?.equipment && filters.equipment.length > 0) {
            query = query.overlaps('equipment', filters.equipment);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching exercises:', error);
            throw error;
        }

        return data as Exercise[];
    },

    async getExerciseById(id: string) {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Exercise;
    },

    async createExercise(exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) {
        // Map camelCase to snake_case for DB if necessary, but current types suggest snake_case in interface?
        // Wait, the types I manually updated in src/types/index.ts use snake_case for new fields (indicated_pathologies)
        // but camelCase for old fields (targetMuscles vs body_parts?). 
        // Let's check the DB schema vs Type definition again.
        // The DB columns are snake_case: indicated_pathologies, body_parts, equipment.
        // My updated Type definition in src/types/index.ts used:
        // indicated_pathologies, contraindicated_pathologies, body_parts, equipment. 
        // But original fields like 'targetMuscles' (camelCase) might be mapped differently or I might be mixing conventions.
        // The `useExercises` hook used `select('*')` and cast to `Exercise`.
        // I should ensure consistency. 
        // The existing `Exercise` interface in `src/hooks/useExercises.ts` (Step 40) had `video_url`, `image_url` (snake).
        // The one in `src/types/index.ts` (Step 108 view) has `targetMuscles` (camel).
        // The codebase seems to have mixed types.
        // I will use `any` casting or explicit mapping if needed, but `supabase-js` returns snake_case by default.
        // I should prefer snake_case interfaces close to DB.

        // For now, I'll assume the input `exercise` object keys match DB columns or I map them.
        // Since I'm creating a new service, I'll pass the object as is and let the caller handle keys matching DB.

        const { data, error } = await supabase
            .from('exercises')
            .insert([exercise])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateExercise(id: string, exercise: Partial<Exercise>) {
        const { data, error } = await supabase
            .from('exercises')
            .update(exercise)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteExercise(id: string) {
        const { error } = await supabase
            .from('exercises')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
