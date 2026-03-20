import {
	differenceInDays,
	differenceInMonths,
	differenceInYears,
} from "date-fns";
import { patientsApi, type PatientSurgery } from "@/lib/api/workers-client";
import type { Surgery, SurgeryFormData } from "@/types/evolution";

const serializeSurgery = (row: PatientSurgery): Surgery => ({
	id: row.id,
	patient_id: row.patient_id ?? "",
	surgery_name: row.name,
	surgery_date: row.surgery_date ?? row.created_at,
	affected_side: row.affected_side ?? "nao_aplicavel",
	notes: row.notes ?? undefined,
	surgeon: row.surgeon ?? undefined,
	surgeon_name: row.surgeon ?? undefined,
	hospital: row.hospital ?? undefined,
	surgery_type: row.post_op_protocol ?? undefined,
	complications: row.complications ?? undefined,
	created_at: row.created_at,
	updated_at: row.updated_at ?? row.created_at,
});

export class SurgeryService {
	static async getSurgeriesByPatientId(patientId: string): Promise<Surgery[]> {
		const res = await patientsApi.surgeries(patientId);
		return (res.data ?? []).map((row) => ({
			...serializeSurgery(row),
			patient_id: patientId,
		}));
	}

	static async addSurgery(data: SurgeryFormData): Promise<Surgery> {
		const res = await patientsApi.createSurgery(data.patient_id, data);
		return { ...serializeSurgery(res.data), patient_id: data.patient_id };
	}

	static async updateSurgery(
		surgeryId: string,
		data: Partial<SurgeryFormData>,
	): Promise<Surgery> {
		const patientId = String(data.patient_id ?? "").trim();
		if (!patientId)
			throw new Error("patient_id é obrigatório para atualizar cirurgia");

		const res = await patientsApi.updateSurgery(patientId, surgeryId, data);
		return { ...serializeSurgery(res.data), patient_id: patientId };
	}

	static async deleteSurgery(
		surgeryId: string,
		patientId: string,
	): Promise<void> {
		await patientsApi.deleteSurgery(patientId, surgeryId);
	}

	static calculateTimeSinceSurgery(surgeryDate: string): string {
		const now = new Date();
		const surgery = new Date(surgeryDate);

		const days = differenceInDays(now, surgery);
		const months = differenceInMonths(now, surgery);
		const years = differenceInYears(now, surgery);

		if (years > 0) return years === 1 ? "há 1 ano" : `há ${years} anos`;
		if (months > 0) return months === 1 ? "há 1 mês" : `há ${months} meses`;
		if (days > 0) return days === 1 ? "há 1 dia" : `há ${days} dias`;
		return "hoje";
	}

	static getRecoveryPhase(surgeryDate: string): {
		phase: string;
		color: string;
	} {
		const days = differenceInDays(new Date(), new Date(surgeryDate));

		if (days <= 30) return { phase: "Fase Aguda", color: "destructive" };
		if (days <= 90) return { phase: "Fase Subaguda", color: "warning" };
		if (days <= 180) return { phase: "Recuperação", color: "default" };
		return { phase: "Consolidada", color: "success" };
	}
}
