import { request } from "./base";
import type {
	PatientRow,
	PatientStats,
	PatientMedicalRecord,
	PatientPhysicalExamination,
	PatientTreatmentPlan,
	PatientMedicalAttachment,
	PatientSurgery,
} from "@/types/workers";

export interface PatientsListParams {
	status?: string;
	search?: string;
	createdFrom?: string;
	createdTo?: string;
	incompleteRegistration?: boolean;
	sortBy?:
		| "name_asc"
		| "name_desc"
		| "created_at_desc"
		| "created_at_asc"
		| "main_condition_asc"
		| "main_condition_desc"
		| "next_appointment_asc"
		| "last_activity_desc"
		| "open_balance_desc"
		| "risk_desc";
	condition?: string;
	classification?: string;
	pathologies?: string[];
	pathologyStatus?: string;
	careProfiles?: string[];
	sports?: string[];
	therapyFocuses?: string[];
	paymentModel?: string;
	financialStatus?: string;
	origin?: string;
	partnerCompany?: string;
	hasSurgery?: boolean;
	limit?: number;
	offset?: number;
}

export interface PatientsListSummary {
	total: number;
	active: number;
	newPatients: number;
	atRisk: number;
	completed: number;
	inactive7: number;
	inactive30: number;
	inactive60: number;
	noShowRisk: number;
	hasUnpaid: number;
}

export interface PatientsListFacets {
	pathologies: string[];
	careProfiles: string[];
	sports: string[];
	therapyFocuses: string[];
	origins: string[];
	partners: string[];
}

export interface PatientsListResponse {
	data: PatientRow[];
	total?: number;
	page?: number;
	perPage?: number;
	summary?: PatientsListSummary;
	facets?: PatientsListFacets;
}

function buildPatientsQueryString(params?: PatientsListParams) {
	const query = new URLSearchParams();

	for (const [key, rawValue] of Object.entries(params ?? {})) {
		if (rawValue == null) continue;
		if (Array.isArray(rawValue)) {
			for (const value of rawValue) {
				if (value) query.append(key, String(value));
			}
			continue;
		}
		query.set(key, String(rawValue));
	}

	return query.toString();
}

export const patientsApi = {
	list: (params?: PatientsListParams) => {
		const qs = buildPatientsQueryString(params);
		return request<PatientsListResponse>(`/api/patients${qs ? `?${qs}` : ""}`);
	},
	getByProfile: (profileId: string) =>
		request<{ data: PatientRow | null }>(
			`/api/patients/by-profile/${encodeURIComponent(profileId)}`,
		),
	get: (id: string) => request<{ data: PatientRow }>(`/api/patients/${id}`),
	create: (data: Partial<PatientRow>) =>
		request<{ data: PatientRow }>("/api/patients", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Partial<PatientRow>) =>
		request<{ data: PatientRow }>(`/api/patients/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string, mode?: "hard") =>
		request<{ success: boolean }>(
			`/api/patients/${id}${mode ? `?mode=${mode}` : ""}`,
			{ method: "DELETE" },
		),
	stats: (id: string) =>
		request<{ data: PatientStats }>(`/api/patients/${id}/stats`),
	lastUpdated: () =>
		request<{ data: { last_updated_at: string | null } }>(
			"/api/patients/last-updated",
		),
	medicalRecords: (patientId: string) =>
		request<{ data: PatientMedicalRecord[] }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-records`,
		),
	createMedicalRecord: (
		patientId: string,
		data: Omit<
			PatientMedicalRecord,
			"id" | "patient_id" | "created_at" | "updated_at"
		>,
	) =>
		request<{ data: PatientMedicalRecord }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-records`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	updateMedicalRecord: (
		patientId: string,
		recordId: string,
		data: Partial<
			Omit<
				PatientMedicalRecord,
				"id" | "patient_id" | "created_at" | "updated_at"
			>
		>,
	) =>
		request<{ data: PatientMedicalRecord }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-records/${encodeURIComponent(recordId)}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	deleteMedicalRecord: (patientId: string, recordId: string) =>
		request<{ ok: boolean }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-records/${encodeURIComponent(recordId)}`,
			{
				method: "DELETE",
			},
		),
	physicalExaminations: (patientId: string) =>
		request<{ data: PatientPhysicalExamination[] }>(
			`/api/patients/${encodeURIComponent(patientId)}/physical-examinations`,
		),
	createPhysicalExamination: (
		patientId: string,
		data: Omit<
			PatientPhysicalExamination,
			"id" | "patient_id" | "created_at" | "updated_at"
		>,
	) =>
		request<{ data: PatientPhysicalExamination }>(
			`/api/patients/${encodeURIComponent(patientId)}/physical-examinations`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	updatePhysicalExamination: (
		patientId: string,
		examId: string,
		data: Partial<
			Omit<
				PatientPhysicalExamination,
				"id" | "patient_id" | "created_at" | "updated_at"
			>
		>,
	) =>
		request<{ data: PatientPhysicalExamination }>(
			`/api/patients/${encodeURIComponent(patientId)}/physical-examinations/${encodeURIComponent(examId)}`,
			{ method: "PUT", body: JSON.stringify(data) },
		),
	deletePhysicalExamination: (patientId: string, examId: string) =>
		request<{ ok: boolean }>(
			`/api/patients/${encodeURIComponent(patientId)}/physical-examinations/${encodeURIComponent(examId)}`,
			{ method: "DELETE" },
		),
	treatmentPlans: (patientId: string) =>
		request<{ data: PatientTreatmentPlan[] }>(
			`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`,
		),
	createTreatmentPlan: (
		patientId: string,
		data: Omit<
			PatientTreatmentPlan,
			"id" | "patient_id" | "created_at" | "updated_at"
		>,
	) =>
		request<{ data: PatientTreatmentPlan }>(
			`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	updateTreatmentPlan: (
		patientId: string,
		planId: string,
		data: Partial<
			Omit<
				PatientTreatmentPlan,
				"id" | "patient_id" | "created_at" | "updated_at"
			>
		>,
	) =>
		request<{ data: PatientTreatmentPlan }>(
			`/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}`,
			{ method: "PUT", body: JSON.stringify(data) },
		),
	deleteTreatmentPlan: (patientId: string, planId: string) =>
		request<{ ok: boolean }>(
			`/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}`,
			{ method: "DELETE" },
		),
	medicalAttachments: (patientId: string, params?: { recordId?: string }) => {
		const qs = new URLSearchParams(
			Object.fromEntries(
				Object.entries(params ?? {})
					.filter(([, v]) => v != null)
					.map(([k, v]) => [k, String(v)]),
			),
		).toString();
		return request<{ data: PatientMedicalAttachment[] }>(
			`/api/patients/${encodeURIComponent(patientId)}/attachments${qs ? `?${qs}` : ""}`,
		);
	},
	createMedicalAttachment: (
		patientId: string,
		data: Omit<PatientMedicalAttachment, "id" | "patient_id" | "uploaded_at">,
	) =>
		request<{ data: PatientMedicalAttachment }>(
			`/api/patients/${encodeURIComponent(patientId)}/attachments`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	deleteMedicalAttachment: (patientId: string, attachmentId: string) =>
		request<{ ok: boolean }>(
			`/api/patients/${encodeURIComponent(patientId)}/attachments/${encodeURIComponent(attachmentId)}`,
			{ method: "DELETE" },
		),
	surgeries: (patientId: string) =>
		request<{ data: PatientSurgery[] }>(
			`/api/patients/${encodeURIComponent(patientId)}/surgeries`,
		),
	createSurgery: (
		patientId: string,
		data: {
			surgery_name: string;
			surgery_date?: string | null;
			surgeon_name?: string | null;
			notes?: string | null;
		},
	) =>
		request<{ data: PatientSurgery }>(
			`/api/patients/${encodeURIComponent(patientId)}/surgeries`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	updateSurgery: (
		patientId: string,
		surgeryId: string,
		data: Partial<{
			surgery_name: string;
			surgery_date: string | null;
			surgeon_name: string | null;
			notes: string | null;
		}>,
	) =>
		request<{ data: PatientSurgery }>(
			`/api/patients/${encodeURIComponent(patientId)}/surgeries/${encodeURIComponent(surgeryId)}`,
			{ method: "PUT", body: JSON.stringify(data) },
		),
	deleteSurgery: (patientId: string, surgeryId: string) =>
		request<{ ok: boolean }>(
			`/api/patients/${encodeURIComponent(patientId)}/surgeries/${encodeURIComponent(surgeryId)}`,
			{ method: "DELETE" },
		),
	pathologies: (patientId: string) =>
		request<{
			data: Array<{
				id: string;
				name: string;
				status: string;
				severity?: string;
			}>;
		}>(`/api/patients/${encodeURIComponent(patientId)}/pathologies`),
	createPathology: (patientId: string, data: any) =>
		request<{ data: any }>(
			`/api/patients/${encodeURIComponent(patientId)}/pathologies`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	updatePathology: (patientId: string, pathologyId: string, data: any) =>
		request<{ data: any }>(
			`/api/patients/${encodeURIComponent(patientId)}/pathologies/${encodeURIComponent(pathologyId)}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	deletePathology: (patientId: string, pathologyId: string) =>
		request<{ ok: boolean }>(
			`/api/patients/${encodeURIComponent(patientId)}/pathologies/${encodeURIComponent(pathologyId)}`,
			{
				method: "DELETE",
			},
		),
	medicalReturns: (patientId: string) =>
		request<{ data: any[] }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-returns`,
		),
	createMedicalReturn: (patientId: string, data: any) =>
		request<{ data: any }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-returns`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	updateMedicalReturn: (patientId: string, returnId: string, data: any) =>
		request<{ data: any }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-returns/${encodeURIComponent(returnId)}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	deleteMedicalReturn: (patientId: string, returnId: string) =>
		request<{ ok: boolean }>(
			`/api/patients/${encodeURIComponent(patientId)}/medical-returns/${encodeURIComponent(returnId)}`,
			{
				method: "DELETE",
			},
		),
};
