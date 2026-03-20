import { exerciseTemplatesApi } from "@/lib/api/workers-client";
import type { ExerciseV2Item } from "@/components/evolution/v2/types";

export interface ExerciseTemplate {
	id: string;
	name: string;
	diagnosis_cid?: string;
	description?: string;
	exercises: Omit<ExerciseV2Item, "id">[];
	category?: string;
}

export class ExerciseTemplateService {
	private static mapTemplate(
		template: Awaited<
			ReturnType<typeof exerciseTemplatesApi.list>
		>["data"][number],
	): ExerciseTemplate {
		return {
			id: template.id,
			name: template.name,
			diagnosis_cid: template.conditionName ?? undefined,
			description: template.description ?? undefined,
			category: template.category ?? undefined,
			exercises: (template.items ?? []).map((item) => ({
				exercise_id: item.exerciseId,
				sets: item.sets ?? undefined,
				reps: item.repetitions ?? undefined,
				duration: item.duration ?? undefined,
				notes: item.notes ?? undefined,
			})) as Omit<ExerciseV2Item, "id">[],
		};
	}

	/**
	 * Get all exercise templates
	 */
	static async getAllTemplates(): Promise<ExerciseTemplate[]> {
		const response = await exerciseTemplatesApi.list({ limit: 500 });
		return (response.data ?? []).map((template) => this.mapTemplate(template));
	}

	/**
	 * Find templates by diagnosis CID or name
	 */
	static async findTemplatesByDiagnosis(
		diagnosis: string,
	): Promise<ExerciseTemplate[]> {
		const templates = await this.getAllTemplates();
		const search = diagnosis.toLowerCase();

		return templates.filter(
			(t) =>
				t.diagnosis_cid?.toLowerCase().includes(search) ||
				t.name.toLowerCase().includes(search) ||
				t.description?.toLowerCase().includes(search),
		);
	}

	/**
	 * Get a default template for a specific clinical area
	 */
	static async getTemplatesByCategory(
		category: string,
	): Promise<ExerciseTemplate[]> {
		const response = await exerciseTemplatesApi.list({ category, limit: 500 });
		return (response.data ?? []).map((template) => this.mapTemplate(template));
	}
}
