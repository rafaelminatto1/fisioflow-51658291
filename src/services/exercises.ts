import { exercisesApi } from "@/integrations/firebase/functions";
import { Exercise } from "@/types";
import { NO_EQUIPMENT_GROUP_ID, EQUIPMENT, HOME_EQUIPMENT_GROUP } from '@/lib/constants/exerciseConstants';

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
        // Expand equipment filters if needed (handling special group "Sem Equipamento")
        let equipment = filters?.equipment;
        if (equipment && equipment.includes(NO_EQUIPMENT_GROUP_ID)) {
            const homeGroupLabels = EQUIPMENT
                .filter(e => HOME_EQUIPMENT_GROUP.includes(e.value))
                .map(e => e.label);

            const expanded = new Set([...equipment.filter(e => e !== NO_EQUIPMENT_GROUP_ID), ...homeGroupLabels]);
            equipment = Array.from(expanded);
        }

        const response = await exercisesApi.list({
            category: filters?.category,
            difficulty: filters?.difficulty,
            search: filters?.searchTerm,
            limit: 1000
            // Note: Cloud function uses "search" instead of "searchTerm"
            // Note: pathologies and bodyParts filters are NOT yet implemented in the basic listExercises cloud function, 
            // but we pass them if we update the function later.
        });

        return response.data as Exercise[];
    },

    async getExerciseById(id: string) {
        const response = await exercisesApi.get(id);
        return response.data as Exercise;
    },

    async createExercise(exercise: any) {
        const response = await exercisesApi.create(exercise);
        return response.data;
    },

    async updateExercise(id: string, exercise: Partial<Exercise>) {
        const response = await exercisesApi.update(id, exercise);
        return response.data;
    },

    async deleteExercise(id: string) {
        await exercisesApi.delete(id);
    },

    async mergeExercises(keepId: string, mergeIds: string[]) {
        const response = await exercisesApi.merge(keepId, mergeIds);
        return response;
    }
};
