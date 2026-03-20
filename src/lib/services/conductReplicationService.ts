import { clinicalApi, sessionsApi } from "@/lib/api/workers-client";
import type { ConductTemplate } from "@/types/evolution";
import { fisioLogger as logger } from "@/lib/errors/logger";

export interface ConductData {
	plan?: string;
	techniques?: string[];
	exercises?: string[];
	recommendations?: string;
	[key: string]: unknown;
}

export class ConductReplicationService {
	static async getSavedConducts(patientId: string): Promise<ConductTemplate[]> {
		const res = await sessionsApi.list({ patientId, limit: 10 });
		const records = (res.data ?? []).filter(
			(record) => record.plan && record.plan.trim().length > 0,
		);

		return records.map((record) => ({
			id: record.id,
			patient_id: record.patient_id,
			template_name: `Conduta de ${record.record_date}`,
			conduct_data: {
				plan: record.plan || "",
				techniques: [],
				exercises: [],
				recommendations: record.assessment || "",
			},
			created_by: record.created_by,
			created_at: record.created_at,
		}));
	}

	static async saveConductAsTemplate(
		patientId: string,
		conduct: ConductData,
		name: string,
	): Promise<ConductTemplate> {
		const response = await clinicalApi.conductLibrary.create({
			title: name,
			category: "Outros",
			description: conduct.recommendations,
			conduct_text: conduct.plan || "",
		});
		const template = response.data;

		return {
			id: template.id,
			patient_id: patientId,
			template_name: template.title,
			conduct_data: {
				plan: template.conduct_text,
				techniques: Array.isArray(conduct.techniques) ? conduct.techniques : [],
				exercises: Array.isArray(conduct.exercises) ? conduct.exercises : [],
				recommendations: template.description || undefined,
			},
			created_by: template.created_by || "",
			created_at: template.created_at,
		};
	}

	static async replicateConduct(conductId: string): Promise<{
		plan: string | null;
		assessment: string | null;
		techniques: unknown[];
		exercises: unknown[];
	}> {
		const response = await sessionsApi.get(conductId).catch(() => null);

		if (response?.data) {
			return {
				plan: response.data.plan || null,
				assessment: response.data.assessment || null,
				techniques: [],
				exercises: [],
			};
		}

		const templateResponse = await clinicalApi.conductLibrary.get(conductId);
		const template = templateResponse.data;
		if (!template) {
			throw new Error("Conduta não encontrada");
		}

		return {
			plan: template.conduct_text || null,
			assessment: template.description || null,
			techniques: [],
			exercises: [],
		};
	}

	static async deleteConduct(conductId: string): Promise<void> {
		await clinicalApi.conductLibrary.delete(conductId).catch((error) => {
			logger.warn(
				"Falha ao remover conduta da biblioteca",
				error,
				"conductReplicationService",
			);
		});
	}
}
