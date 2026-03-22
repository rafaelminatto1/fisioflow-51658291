import { patientsApi, type PatientPathology } from "@/api/v2";
import type { Pathology, PathologyFormData } from "@/types/evolution";

const mapStatus = (value?: string | null): Pathology["status"] => {
	if (value === "active" || value === "em_tratamento") return "em_tratamento";
	if (value === "treated" || value === "tratada") return "tratada";
	return "cronica";
};

const serializePathology = (row: PatientPathology): Pathology => ({
	id: row.id,
	patient_id:
		(row as PatientPathology & { patient_id?: string }).patient_id ?? "",
	pathology_name: row.name,
	cid_code: row.icd_code ?? undefined,
	diagnosis_date: row.diagnosed_at ?? undefined,
	severity:
		(row as PatientPathology & { severity?: Pathology["severity"] | null })
			.severity ?? undefined,
	affected_region:
		(row as PatientPathology & { affected_region?: string | null })
			.affected_region ?? undefined,
	status: mapStatus(row.status),
	notes: row.notes ?? undefined,
	created_at: row.created_at,
	updated_at:
		(row as PatientPathology & { updated_at?: string | null }).updated_at ??
		row.created_at,
});

export class PathologyService {
	static async getPathologiesByPatientId(
		patientId: string,
	): Promise<Pathology[]> {
		const res = await patientsApi.pathologies(patientId);
		return (res.data ?? [])
			.map(serializePathology)
			.map((item) => ({ ...item, patient_id: patientId }));
	}

	static async getActivePathologies(patientId: string): Promise<Pathology[]> {
		const data = await this.getPathologiesByPatientId(patientId);
		return data.filter((item) => item.status === "em_tratamento");
	}

	static async getResolvedPathologies(patientId: string): Promise<Pathology[]> {
		const data = await this.getPathologiesByPatientId(patientId);
		return data.filter(
			(item) => item.status === "tratada" || item.status === "cronica",
		);
	}

	static async addPathology(data: PathologyFormData): Promise<Pathology> {
		const res = await patientsApi.createPathology(data.patient_id, data);
		return { ...serializePathology(res.data), patient_id: data.patient_id };
	}

	static async updatePathology(
		pathologyId: string,
		data: Partial<PathologyFormData>,
	): Promise<Pathology> {
		const patientId = String(data.patient_id ?? "").trim();
		if (!patientId)
			throw new Error("patient_id é obrigatório para atualizar patologia");

		const res = await patientsApi.updatePathology(patientId, pathologyId, data);
		return { ...serializePathology(res.data), patient_id: patientId };
	}

	static async markAsResolved(
		pathologyId: string,
		patientId: string,
	): Promise<Pathology> {
		return this.updatePathology(pathologyId, {
			patient_id: patientId,
			status: "tratada",
		});
	}

	static async markAsActive(
		pathologyId: string,
		patientId: string,
	): Promise<Pathology> {
		return this.updatePathology(pathologyId, {
			patient_id: patientId,
			status: "em_tratamento",
		});
	}

	static async deletePathology(
		pathologyId: string,
		patientId: string,
	): Promise<void> {
		await patientsApi.deletePathology(patientId, pathologyId);
	}

	static getStatusColor(status: string): string {
		switch (status) {
			case "em_tratamento":
				return "warning";
			case "tratada":
				return "success";
			case "cronica":
				return "secondary";
			default:
				return "outline";
		}
	}

	static getStatusLabel(status: string): string {
		switch (status) {
			case "em_tratamento":
				return "Em Tratamento";
			case "tratada":
				return "Tratada";
			case "cronica":
				return "Crônica";
			default:
				return status;
		}
	}
}
