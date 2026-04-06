import type { Patient } from "@/types";
import {
	patientsApi,
	clinicalApi as workersClinicalApi,
	exerciseSessionsApi,
} from "@/api/v2";

interface PatientApiData {
	id: string;
	name?: string;
	full_name?: string;
	email?: string | null;
	phone?: string | null;
	cpf?: string | null;
	birth_date?: string;
	gender?: string;
	main_condition?: string;
	observations?: string;
	status: string;
	progress?: number;
	incomplete_registration?: boolean;
	created_at?: string;
	updated_at?: string;
}

interface PatientUpdateData {
	name?: string;
	email?: string | null;
	phone?: string | null;
	cpf?: string | null;
	birth_date?: string;
	main_condition?: string | null;
	status?: string;
}

/**
 * Patient service with optimized queries
 * Uses centralized constants for consistency
 */
export class PatientService {
	/**
	 * Fetch all patients
	 * Uses optimized column selection from constants
	 */
	static async getPatients(_organizationId?: string): Promise<Patient[]> {
		const response = await patientsApi.list({ limit: 1000 });
		const data = response.data || [];

		return data.map((p: PatientApiData) => ({
			id: p.id,
			name: p.name || p.full_name || "Sem nome", // Fallback for name
			email: p.email ?? undefined,
			phone: p.phone ?? undefined,
			cpf: p.cpf ?? undefined,
			birthDate: p.birth_date ?? new Date().toISOString(),
			gender: p.gender || "outro",
			mainCondition: p.main_condition || p.observations || "",
			status: p.status === "Em Tratamento" ? "Em Tratamento" : "Inicial", // Simplify status mapping
			progress: p.progress || 0,
			incomplete_registration: p.incomplete_registration ?? false,
			createdAt: p.created_at ?? new Date().toISOString(),
			updatedAt: p.updated_at ?? new Date().toISOString(),
		}));
	}

	/**
	 * Fetch a single patient by ID
	 */
	static async getPatientById(id: string): Promise<Patient | null> {
		const response = await patientsApi.get(id);
		const data = response.data;

		if (!data) return null;

		return {
			id: data.id,
			name: data.name || data.full_name,
			email: data.email ?? undefined,
			phone: data.phone ?? undefined,
			cpf: data.cpf ?? undefined,
			birthDate: data.birth_date ?? new Date().toISOString(),
			gender: data.gender || "outro",
			mainCondition: data.main_condition || "",
			status: data.status === "Em Tratamento" ? "Em Tratamento" : "Inicial",
			progress: data.progress || 0,
			incomplete_registration: false,
			createdAt: data.created_at ?? new Date().toISOString(),
			updatedAt: data.updated_at ?? new Date().toISOString(),
		};
	}

	/**
	 * Create a new patient
	 */
	static async createPatient(patient: Omit<Patient, "id">): Promise<Patient> {
		const response = await patientsApi.create({
			name: patient.name,
			email: patient.email,
			phone: patient.phone,
			cpf: patient.cpf,
			birth_date: patient.birthDate,
			main_condition: patient.mainCondition,
			status: patient.status,
		});
		const data = response.data;

		return {
			id: data.id,
			name: data.name,
			email: data.email ?? undefined,
			phone: data.phone ?? undefined,
			cpf: data.cpf ?? undefined,
			birthDate: data.birth_date ?? new Date().toISOString(),
			gender: data.gender || "outro",
			mainCondition: data.main_condition || "",
			status: data.status,
			progress: 0,
			incomplete_registration: false,
			createdAt: data.created_at ?? new Date().toISOString(),
			updatedAt: data.updated_at ?? new Date().toISOString(),
		};
	}

	/**
	 * Update an existing patient
	 */
	static async updatePatient(
		id: string,
		updates: Partial<Patient>,
	): Promise<Patient> {
		const updateData: PatientUpdateData = {};
		if (updates.name) updateData.name = updates.name;
		if (updates.email !== undefined) updateData.email = updates.email;
		if (updates.phone !== undefined) updateData.phone = updates.phone;
		if (updates.cpf !== undefined) updateData.cpf = updates.cpf;
		if (updates.birthDate) updateData.birth_date = updates.birthDate;
		if (updates.mainCondition !== undefined)
			updateData.main_condition = updates.mainCondition;
		if (updates.status) updateData.status = updates.status;

		const response = await patientsApi.update(id, updateData);
		const data = response.data;

		return {
			id: data.id,
			name: data.name,
			email: data.email ?? undefined,
			phone: data.phone ?? undefined,
			cpf: data.cpf ?? undefined,
			birthDate: data.birth_date ?? new Date().toISOString(),
			gender: data.gender || "outro",
			mainCondition: data.main_condition || "",
			status: data.status,
			progress: data.progress || 0,
			incomplete_registration: false,
			createdAt: data.created_at ?? new Date().toISOString(),
			updatedAt: data.updated_at ?? new Date().toISOString(),
		};
	}

	/**
	 * Delete a patient
	 */
	static async deletePatient(id: string): Promise<void> {
		await patientsApi.delete(id);
	}

	static async getPatientByProfileId(
		profileId: string,
	): Promise<Patient | null> {
		const response = await patientsApi.getByProfile(profileId);
		const data = response.data;

		if (!data) return null;

		return {
			id: data.id,
			name: data.name || data.full_name,
			email: data.email ?? undefined,
			phone: data.phone ?? undefined,
			cpf: data.cpf ?? undefined,
			birthDate: data.birth_date ?? new Date().toISOString(),
			gender: data.gender || "outro",
			mainCondition: data.observations || data.main_condition || "",
			status:
				data.status === "active" || data.status === "Em Tratamento"
					? "Em Tratamento"
					: "Inicial",
			progress: data.progress || 0,
			incomplete_registration: data.incomplete_registration ?? false,
			createdAt: data.created_at ?? new Date().toISOString(),
			updatedAt: data.updated_at ?? new Date().toISOString(),
		};
	}

	/**
	 * Fetch prescribed exercises for a patient
	 */
	static async getPrescribedExercises(patientId: string) {
		const response = await workersClinicalApi.prescribedExercises.list({
			patientId,
			active: true,
		});
		return response.data;
	}

	static async logExercise(
		patientId: string,
		prescriptionId: string,
		difficulty: string,
		notes?: string,
	) {
		await exerciseSessionsApi.create({
			patient_id: patientId,
			exercise_id: prescriptionId,
			exercise_type: "prescribed_exercise",
			start_time: new Date().toISOString(),
			end_time: new Date().toISOString(),
			duration: undefined,
			repetitions: 1,
			completed: true,
			metrics: {
				difficulty: Number(difficulty),
				note_length: notes?.length ?? 0,
			},
			posture_issues_summary: {},
		});
	}

	// Optimized: Select specific columns instead of *
	static async getPainRecords(patientId: string) {
		const response = await workersClinicalApi.painMaps.list({ patientId });
		return (response.data ?? []).map((record) => ({
			id: record.id,
			patient_id: record.patient_id,
			level: record.pain_level ?? 0,
			type: record.body_region ?? "Dor",
			bodyPart: record.body_region ?? "Não informado",
			notes: record.notes ?? "",
			created_at: record.created_at,
			updated_at: record.updated_at,
		}));
	}

	static async savePainRecord(
		patientId: string,
		level: number,
		type: string,
		bodyPart: string,
		notes?: string,
	) {
		await workersClinicalApi.painMaps.create({
			patient_id: patientId,
			body_region: bodyPart || type,
			pain_level: level,
			notes: notes ? `${type}: ${notes}` : type,
		});
	}
}
