import { clinicalApi } from "@/api/v2";
import type {
	BodyRegion,
	PainEvolutionData,
	PainMapFormData,
	PainMapPoint,
	PainMapRecord,
	PainStatistics,
} from "@/types/painMap";

const mapPoint = (point: Record<string, unknown>): PainMapPoint => ({
	region: String(point.region ?? "lombar") as BodyRegion,
	intensity: Number(point.intensity ?? 0) as PainMapPoint["intensity"],
	painType: String(
		point.pain_type ?? point.painType ?? "aguda",
	) as PainMapPoint["painType"],
	description: (point.description as string) ?? undefined,
	x: Number(point.x_coordinate ?? point.x ?? 0),
	y: Number(point.y_coordinate ?? point.y ?? 0),
});

const mapPainMap = (row: Record<string, unknown>): PainMapRecord => ({
	id: String(row.id),
	patient_id: String(row.patient_id),
	session_id: row.evolution_id ? String(row.evolution_id) : undefined,
	appointment_id: row.appointment_id ? String(row.appointment_id) : undefined,
	recorded_at: String(
		row.recorded_at ?? row.created_at ?? new Date().toISOString(),
	),
	pain_points: Array.isArray(row.points)
		? row.points.map((point) => mapPoint(point as Record<string, unknown>))
		: [],
	global_pain_level: Number(
		row.pain_level ?? row.global_pain_level ?? 0,
	) as PainMapRecord["global_pain_level"],
	notes: (row.notes as string) ?? undefined,
	created_by: String(row.created_by ?? ""),
	created_at: String(row.created_at ?? new Date().toISOString()),
	updated_at: String(
		row.updated_at ?? row.created_at ?? new Date().toISOString(),
	),
});

export class PainMapService {
	static async getPainMapsByPatientId(
		patientId: string,
	): Promise<PainMapRecord[]> {
		const res = await clinicalApi.painMaps.list({ patientId });
		return (res.data ?? []).map((row) =>
			mapPainMap(row as unknown as Record<string, unknown>),
		);
	}

	static async getPainMapById(id: string): Promise<PainMapRecord> {
		const res = await clinicalApi.painMaps.get(id);
		return mapPainMap(res.data as unknown as Record<string, unknown>);
	}

	static async createPainMap(painMap: PainMapFormData): Promise<PainMapRecord> {
		const res = await clinicalApi.painMaps.create({
			patient_id: painMap.patient_id,
			evolution_id: painMap.session_id,
			pain_level: painMap.global_pain_level,
			notes: painMap.notes,
		});
		const created = mapPainMap(res.data as unknown as Record<string, unknown>);

		if (painMap.pain_points?.length) {
			await Promise.all(
				painMap.pain_points.map((point) =>
					clinicalApi.painMaps.addPoint(created.id, {
						x_coordinate: point.x,
						y_coordinate: point.y,
						intensity: point.intensity,
						region: point.region,
					}),
				),
			);
		}

		return this.getPainMapById(created.id);
	}

	static async updatePainMap(
		id: string,
		painMap: Partial<PainMapFormData>,
	): Promise<PainMapRecord> {
		await clinicalApi.painMaps.update(id, {
			patient_id: painMap.patient_id,
			evolution_id: painMap.session_id,
			pain_level: painMap.global_pain_level,
			notes: painMap.notes,
		});
		return this.getPainMapById(id);
	}

	static async deletePainMap(id: string): Promise<void> {
		await clinicalApi.painMaps.delete(id);
	}

	static async getPainEvolution(
		patientId: string,
		startDate?: string,
		endDate?: string,
	): Promise<PainEvolutionData[]> {
		const allRecords = await this.getPainMapsByPatientId(patientId);
		let filteredRecords = allRecords;
		if (startDate)
			filteredRecords = filteredRecords.filter(
				(record) => record.recorded_at >= startDate,
			);
		if (endDate)
			filteredRecords = filteredRecords.filter(
				(record) => record.recorded_at <= endDate,
			);

		return filteredRecords.map((record) => ({
			date: record.recorded_at,
			globalPainLevel: record.global_pain_level,
			regionCount: record.pain_points.length,
			mostAffectedRegion: this.getMostAffectedRegion(record.pain_points),
			painPoints: record.pain_points,
		}));
	}

	static async getPainStatistics(patientId: string): Promise<PainStatistics> {
		const records = await this.getPainMapsByPatientId(patientId);

		if (records.length === 0) {
			return {
				averagePainLevel: 0,
				painReduction: 0,
				mostFrequentRegion: "lombar",
				painFreeRegionsCount: 0,
				improvementTrend: "stable",
			};
		}

		const painLevels = records.map((r) => r.global_pain_level);
		const averagePainLevel =
			painLevels.reduce((a, b) => a + b, 0) / painLevels.length;

		const firstPain = records[records.length - 1].global_pain_level;
		const lastPain = records[0].global_pain_level;
		const painReduction =
			firstPain > 0 ? ((firstPain - lastPain) / firstPain) * 100 : 0;

		const regionFrequency = new Map<BodyRegion, number>();
		records.forEach((record) => {
			record.pain_points.forEach((point) => {
				regionFrequency.set(
					point.region,
					(regionFrequency.get(point.region) || 0) + 1,
				);
			});
		});

		const mostFrequentRegion =
			Array.from(regionFrequency.entries()).sort(
				(a, b) => b[1] - a[1],
			)[0]?.[0] || "lombar";

		const allRegions = new Set<BodyRegion>();
		records[0]?.pain_points.forEach((point) => allRegions.add(point.region));
		const painFreeRegionsCount = 25 - allRegions.size;

		let improvementTrend: PainStatistics["improvementTrend"] = "stable";
		if (records.length >= 3) {
			const recent = records.slice(0, 3).map((r) => r.global_pain_level);
			const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
			if (recent[0] < avg - 1) improvementTrend = "improving";
			else if (recent[0] > avg + 1) improvementTrend = "worsening";
		}

		return {
			averagePainLevel,
			painReduction,
			mostFrequentRegion,
			painFreeRegionsCount,
			improvementTrend,
		};
	}

	private static getMostAffectedRegion(
		painPoints: { region: BodyRegion; intensity: number }[],
	): BodyRegion | undefined {
		if (painPoints.length === 0) return undefined;
		return [...painPoints].sort((a, b) => b.intensity - a.intensity)[0].region;
	}

	static getRegionLabel(region: BodyRegion): string {
		const labels: Record<BodyRegion, string> = {
			cabeca: "Cabeça",
			cabeca_frente: "Cabeça (Frente)",
			cabeca_frente_esquerda: "Cabeça (Frente Esq.)",
			cabeca_frente_direita: "Cabeça (Frente Dir.)",
			cabeca_nuca_esquerda: "Nuca (Esq.)",
			cabeca_nuca_direita: "Nuca (Dir.)",
			pescoco: "Pescoço",
			pescoco_frontal_esquerdo: "Pescoço (Frente Esq.)",
			pescoco_frontal_direito: "Pescoço (Frente Dir.)",
			pescoco_nuca_esquerdo: "Cervical (Esq.)",
			pescoco_nuca_direito: "Cervical (Dir.)",
			ombro_direito: "Ombro Direito",
			ombro_esquerdo: "Ombro Esquerdo",
			braco_direito: "Braço Direito",
			braco_esquerdo: "Braço Esquerdo",
			antebraco_direito: "Antebraço Direito",
			antebraco_esquerdo: "Antebraço Esquerdo",
			mao_direita: "Mão Direita",
			mao_esquerda: "Mão Esquerda",
			torax: "Tórax",
			torax_esquerdo: "Tórax (Esq.)",
			torax_direito: "Tórax (Dir.)",
			costas_superior_esquerda: "Costas Superior (Esq.)",
			costas_superior_direita: "Costas Superior (Dir.)",
			abdomen: "Abdômen",
			abdomen_esquerdo: "Abdômen (Esq.)",
			abdomen_direito: "Abdômen (Dir.)",
			lombar: "Lombar",
			lombar_esquerda: "Lombar (Esq.)",
			lombar_direita: "Lombar (Dir.)",
			gluteo_esquerdo: "Glúteo (Esq.)",
			gluteo_direito: "Glúteo (Dir.)",
			quadril_direito: "Quadril Direito",
			quadril_esquerdo: "Quadril Esquerdo",
			coxa_direita: "Coxa Direita",
			coxa_esquerda: "Coxa Esquerda",
			joelho_direito: "Joelho Direito",
			joelho_esquerdo: "Joelho Esquerdo",
			perna_direita: "Perna Direita",
			panturrilha_direita: "Panturrilha Direita",
			perna_esquerda: "Perna Esquerda",
			panturrilha_esquerda: "Panturrilha Esquerda",
			tornozelo_direito: "Tornozelo Direito",
			tornozelo_esquerdo: "Tornozelo Esquerdo",
			pe_direito: "Pé Direito",
			pe_esquerdo: "Pé Esquerdo",
		};
		return labels[region];
	}

	static getPainIntensityColor(intensity: number): string {
		if (intensity === 0) return "hsl(var(--muted))";
		if (intensity <= 3) return "hsl(47, 100%, 60%)";
		if (intensity <= 6) return "hsl(30, 100%, 50%)";
		return "hsl(0, 80%, 50%)";
	}
}
