import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/types";
import { EQUIPMENT, HOME_EQUIPMENT_GROUP, NO_EQUIPMENT_GROUP_ID } from '@/lib/constants/exerciseConstants';

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
            let equipmentFilters = [...filters.equipment];

            // Check if group ID is present
            if (equipmentFilters.includes(NO_EQUIPMENT_GROUP_ID)) {
                // Remove the group ID
                equipmentFilters = equipmentFilters.filter(e => e !== NO_EQUIPMENT_GROUP_ID);

                // Add all labels from the group
                const homeGroupLabels = EQUIPMENT
                    .filter(e => HOME_EQUIPMENT_GROUP.includes(e.value))
                    .map(e => e.label);

                // Add unique labels
                homeGroupLabels.forEach(label => {
                    if (!equipmentFilters.includes(label)) {
                        equipmentFilters.push(label);
                    }
                });
            }

            // Since we expanded the list, we might have added many items.
            // overlaps works if ANY of the items match.
            // If the user selected "Sem Equipamento", we want to find exercises that have ANY of the home equipment.
            // That matches "overlaps" logic.
            // "overlaps" means "records where column array && filter array has any intersection".

            if (equipmentFilters.length > 0) {
                query = query.overlaps('equipment', equipmentFilters);
            }
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
    },

    /**
     * Merge duplicate exercises into one.
     * Keeps the primary exercise and deletes the others.
     * Optionally consolidates unique data from merged exercises.
     */
    async mergeExercises(keepId: string, mergeIds: string[]) {
        // 1. Get all exercises to merge for data consolidation
        const { data: exercisesToMerge, error: fetchError } = await supabase
            .from('exercises')
            .select('*')
            .in('id', [keepId, ...mergeIds]);

        if (fetchError) throw fetchError;

        const keepExercise = exercisesToMerge?.find(e => e.id === keepId);
        if (!keepExercise) throw new Error('Exercise to keep not found');

        // 2. Consolidate unique data from merged exercises
        const mergeExercises = exercisesToMerge?.filter(e => e.id !== keepId) || [];

        // Merge array fields (combine unique values)
        const consolidatedData: Partial<typeof keepExercise> = {};

        // Merge body_parts
        const allBodyParts = new Set([
            ...(keepExercise.body_parts || []),
            ...mergeExercises.flatMap(e => e.body_parts || [])
        ]);
        if (allBodyParts.size > 0) {
            consolidatedData.body_parts = Array.from(allBodyParts);
        }

        // Merge equipment
        const allEquipment = new Set([
            ...(keepExercise.equipment || []),
            ...mergeExercises.flatMap(e => e.equipment || [])
        ]);
        if (allEquipment.size > 0) {
            consolidatedData.equipment = Array.from(allEquipment);
        }

        // Merge indicated_pathologies
        const allIndicatedPathologies = new Set([
            ...(keepExercise.indicated_pathologies || []),
            ...mergeExercises.flatMap(e => e.indicated_pathologies || [])
        ]);
        if (allIndicatedPathologies.size > 0) {
            consolidatedData.indicated_pathologies = Array.from(allIndicatedPathologies);
        }

        // Use video_url from keep exercise, or grab from first merged that has one
        if (!keepExercise.video_url) {
            const exerciseWithVideo = mergeExercises.find(e => e.video_url);
            if (exerciseWithVideo) {
                consolidatedData.video_url = exerciseWithVideo.video_url;
            }
        }

        // Use image_url from keep exercise, or grab from first merged that has one
        if (!keepExercise.image_url) {
            const exerciseWithImage = mergeExercises.find(e => e.image_url);
            if (exerciseWithImage) {
                consolidatedData.image_url = exerciseWithImage.image_url;
            }
        }

        // 3. Update the exercise to keep with consolidated data
        if (Object.keys(consolidatedData).length > 0) {
            const { error: updateError } = await supabase
                .from('exercises')
                .update(consolidatedData)
                .eq('id', keepId);

            if (updateError) throw updateError;
        }

        // 4. Delete the merged exercises
        const { error: deleteError } = await supabase
            .from('exercises')
            .delete()
            .in('id', mergeIds);

        if (deleteError) throw deleteError;

        return { success: true, deletedCount: mergeIds.length };
    }
};
