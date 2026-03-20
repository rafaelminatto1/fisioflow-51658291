import type { Exercise } from "@/types";
import { exercisesApi } from "@/api/v2/exercises";
import {
	NO_EQUIPMENT_GROUP_ID,
	EQUIPMENT,
	HOME_EQUIPMENT_GROUP,
} from "@/lib/constants/exerciseConstants";

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
		let equipment = filters?.equipment;
		if (equipment && equipment.includes(NO_EQUIPMENT_GROUP_ID)) {
			const homeGroupLabels = EQUIPMENT.filter((e) =>
				HOME_EQUIPMENT_GROUP.includes(e.value),
			).map((e) => e.label);
			const expanded = new Set([
				...equipment.filter((e) => e !== NO_EQUIPMENT_GROUP_ID),
				...homeGroupLabels,
			]);
			equipment = Array.from(expanded);
		}

		const res = await exercisesApi.list({
			q: filters?.searchTerm,
			category: filters?.category,
			difficulty: filters?.difficulty,
			limit: 1000,
		});
		let items = res.data ?? [];

		if (equipment?.length) {
			items = items.filter(
				(ex) =>
					!ex.equipment?.length ||
					ex.equipment.some((e) => equipment!.includes(e)),
			);
		}
		if (filters?.bodyParts?.length) {
			items = items.filter((ex) =>
				ex.body_parts?.some((bp) => filters.bodyParts!.includes(bp)),
			);
		}
		if (filters?.onlyFavorites) {
			const favRes = await exercisesApi.myFavorites();
			const favIds = new Set(favRes.data.map((e) => e.id));
			items = items.filter((ex) => favIds.has(ex.id));
		}
		return items;
	},

	async getExerciseById(id: string): Promise<Exercise> {
		const res = await exercisesApi.get(id);
		if (!res.data) throw new Error("Exercício não encontrado");
		return res.data;
	},

	async createExercise(exercise: Omit<Exercise, "id">): Promise<Exercise> {
		const res = await exercisesApi.create(exercise);
		return res.data;
	},

	async updateExercise(
		id: string,
		exercise: Partial<Exercise>,
	): Promise<Exercise> {
		const res = await exercisesApi.update(id, exercise);
		return res.data;
	},

	async deleteExercise(id: string): Promise<void> {
		await exercisesApi.delete(id);
	},

	async mergeExercises(
		_keepId: string,
		mergeIds: string[],
	): Promise<{ success: boolean; deletedCount: number }> {
		await Promise.all(
			mergeIds.map((id) => exercisesApi.delete(id).catch(() => {})),
		);
		return { success: true, deletedCount: mergeIds.length };
	},
};
