import { Exercise } from '@/types';
import { NO_EQUIPMENT_GROUP_ID, EQUIPMENT, HOME_EQUIPMENT_GROUP } from '@/lib/constants/exerciseConstants';
import { exercisesFirestore } from './exercisesFirestore';

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
    async getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
        // Expand equipment filters if needed (handling special group "Sem Equipamento")
        let equipment = filters?.equipment;
        if (equipment && equipment.includes(NO_EQUIPMENT_GROUP_ID)) {
            const homeGroupLabels = EQUIPMENT
                .filter(e => HOME_EQUIPMENT_GROUP.includes(e.value))
                .map(e => e.label);

            const expanded = new Set([...equipment.filter(e => e !== NO_EQUIPMENT_GROUP_ID), ...homeGroupLabels]);
            equipment = Array.from(expanded);
        }

        return exercisesFirestore.getExercises({
            ...filters,
            equipment,
        });
    },

    async getExerciseById(id: string): Promise<Exercise> {
        const exercise = await exercisesFirestore.getExerciseById(id);
        if (!exercise) {
            throw new Error('Exercício não encontrado');
        }
        return exercise;
    },

    async createExercise(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
        return exercisesFirestore.createExercise(exercise);
    },

    async updateExercise(id: string, exercise: Partial<Exercise>): Promise<Exercise> {
        return exercisesFirestore.updateExercise(id, exercise);
    },

    async deleteExercise(id: string): Promise<void> {
        await exercisesFirestore.deleteExercise(id);
    },

    async mergeExercises(keepId: string, mergeIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
        return exercisesFirestore.mergeExercises(keepId, mergeIds);
    }
};
