import { Exercise } from '@/types';
import { NO_EQUIPMENT_GROUP_ID, EQUIPMENT, HOME_EQUIPMENT_GROUP } from '@/lib/constants/exerciseConstants';
import { exercisesFirestore } from './exercisesFirestore';
import { callFunctionHttp } from '@/integrations/firebase/functions';
import { toProxyUrl } from '@/lib/storageProxy';

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
        // Usar diretamente Firestore por enquanto para garantir funcionamento
        // A API V2 (Postgres) pode ter problemas de conexão
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
        // Usar diretamente Firestore por enquanto
        const exercise = await exercisesFirestore.getExerciseById(id);
        if (!exercise) throw new Error('Exercício não encontrado');
        return exercise;
    },

    async createExercise(exercise: Omit<Exercise, 'id'>): Promise<Exercise> {
        // Criar no Firestore (que dispara o sync para SQL via trigger se configurado)
        // ou criar via V2 que sincroniza de volta. Vamos manter Firestore como master 
        // para escrita por enquanto para garantir offline support.
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
