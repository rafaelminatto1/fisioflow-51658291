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
		keepId: string,
		mergeIds: string[],
	): Promise<{ success: boolean; deletedCount: number }> {
		try {
			// 1. Buscar os exercícios que serão fundidos para capturar seus nomes
			const exercisesToMerge = await Promise.all(
				mergeIds.map(id => exercisesApi.get(id).catch(() => null))
			);
			
			const namesToAlias = exercisesToMerge
				.filter(res => res && res.data)
				.map(res => res!.data!.name)
				.filter(Boolean) as string[];

			// 2. Buscar o exercício canônico
			const canonicalRes = await exercisesApi.get(keepId);
			if (!canonicalRes.data) throw new Error("Exercício canônico não encontrado");
			
			const currentAliases = canonicalRes.data.aliases_pt || [];
			const updatedAliases = Array.from(new Set([...currentAliases, ...namesToAlias]));

			// 3. Atualizar o exercício canônico com os novos apelidos
			await exercisesApi.update(keepId, {
				aliases_pt: updatedAliases
			} as any);

			// 4. Deletar os obsoletos
			await Promise.all(
				mergeIds.map((id) => exercisesApi.delete(id).catch(() => {}))
			);

			return { success: true, deletedCount: mergeIds.length };
		} catch (error) {
			logger.error("Falha ao unir exercícios de forma inteligente", error as Error, "exerciseService");
			// Fallback para delete simples se falhar a lógica de aliases
			await Promise.all(
				mergeIds.map((id) => exercisesApi.delete(id).catch(() => {}))
			);
			return { success: true, deletedCount: mergeIds.length };
		}
	},
};
