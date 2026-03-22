import { request, requestPublic } from "./base";
import type {
	PatientExam,
	PatientExamFile,
	MedicalRequest,
	MedicalRequestFile,
	PatientGoal,
	EvolutionMeasurementRecord,
	TreatmentSessionRecord,
	ClinicalTestTemplateRecord,
	SessionRecord,
	PainMap,
	PainMapPoint,
	EvolutionTemplate,
	ConductLibraryRecord,
	ExercisePrescription,
	PrescribedExercise,
	StandardizedTestResultRow,
} from "@/types/workers";

const clin = (path: string, opts?: RequestInit) =>
	request<any>(`/api/clinical${path}`, opts);

export const examsApi = {
	list: (patientId: string) =>
		request<{ data: PatientExam[] }>(
			`/api/exams?patientId=${encodeURIComponent(patientId)}`,
		),

	create: (data: {
		patient_id: string;
		title: string;
		exam_date?: string;
		exam_type?: string;
		description?: string;
	}) =>
		request<{ data: PatientExam }>("/api/exams", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	addFile: (examId: string, file: Omit<PatientExamFile, "id" | "exam_id">) =>
		request<{ data: PatientExamFile }>(`/api/exams/${examId}/files`, {
			method: "POST",
			body: JSON.stringify(file),
		}),

	delete: (id: string) =>
		request<{ ok: boolean; deleted_files?: string[] }>(`/api/exams/${id}`, {
			method: "DELETE",
		}),

	deleteFile: (examId: string, fileId: string) =>
		request<{ ok: boolean }>(`/api/exams/${examId}/files/${fileId}`, {
			method: "DELETE",
		}),
};
export const medicalRequestsApi = {
	list: (patientId: string) =>
		request<{ data: MedicalRequest[] }>(
			`/api/medical-requests?patientId=${encodeURIComponent(patientId)}`,
		),

	create: (data: {
		patient_id: string;
		doctor_name?: string;
		request_date?: string;
		notes?: string;
	}) =>
		request<{ data: MedicalRequest }>("/api/medical-requests", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	addFile: (
		requestId: string,
		file: Omit<MedicalRequestFile, "id" | "medical_request_id">,
	) =>
		request<{ data: MedicalRequestFile }>(
			`/api/medical-requests/${requestId}/files`,
			{
				method: "POST",
				body: JSON.stringify(file),
			},
		),

	delete: (id: string) =>
		request<{ ok: boolean; deleted_files?: string[] }>(
			`/api/medical-requests/${id}`,
			{ method: "DELETE" },
		),

	deleteFile: (requestId: string, fileId: string) =>
		request<{ ok: boolean }>(
			`/api/medical-requests/${requestId}/files/${fileId}`,
			{ method: "DELETE" },
		),
};

export const pathologiesApi = {
	listOptions: () =>
		request<{ data: Array<{ value: string; label: string; category: string }> }>(
			"/api/clinical/pathologies/options",
		),
};

export const goalsApi = {
	list: (patientId: string) =>
		request<{ data: PatientGoal[] }>(
			`/api/goals?patientId=${encodeURIComponent(patientId)}`,
		),

	create: (data: {
		patient_id: string;
		description?: string;
		goal_title?: string;
		goal_description?: string;
		category?: string;
		target_date?: string;
		target_value?: string;
		current_value?: string;
		current_progress?: number;
		priority?: string;
		status?: string;
		metadata?: Record<string, unknown>;
	}) =>
		request<{ data: PatientGoal }>("/api/goals", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	update: (
		id: string,
		data: {
			status?: string;
			description?: string;
			goal_title?: string;
			goal_description?: string;
			category?: string;
			priority?: string;
			target_date?: string;
			target_value?: string;
			current_value?: string;
			current_progress?: number;
			achieved_at?: string;
			completed_at?: string;
			metadata?: Record<string, unknown>;
		},
	) =>
		request<{ data: PatientGoal }>(`/api/goals/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),

	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/goals/${id}`, { method: "DELETE" }),
};

export const evolutionApi = {
	measurements: {
		list: (patientId: string, params?: { limit?: number }) => {
			const query = new URLSearchParams(
				Object.entries({
					patientId,
					limit: params?.limit ? String(params.limit) : undefined,
				}).filter(([, value]) => value != null) as [string, string][],
			).toString();

			return request<{ data: EvolutionMeasurementRecord[] }>(
				`/api/evolution/measurements${query ? `?${query}` : ""}`,
			);
		},
		create: (data: {
			patient_id: string;
			measurement_type: string;
			measurement_name: string;
			value?: number;
			unit?: string;
			notes?: string;
			custom_data?: Record<string, unknown>;
			measured_at?: string;
		}) =>
			request<{ data: EvolutionMeasurementRecord }>(
				"/api/evolution/measurements",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
	},
	requiredMeasurements: {
		list: (pathologies: string[]) => {
			const query = new URLSearchParams();
			if (pathologies.length > 0) {
				query.set("pathologies", pathologies.join(","));
			}
			return request<{ data: any[] }>(
				`/api/evolution/required-measurements${query.toString() ? `?${query.toString()}` : ""}`,
			);
		},
	},
	treatmentSessions: {
		list: (patientId: string, params?: { limit?: number }) => {
			const query = new URLSearchParams(
				Object.entries({
					patientId,
					limit: params?.limit ? String(params.limit) : undefined,
				}).filter(([, value]) => value != null) as [string, string][],
			).toString();

			return request<{ data: TreatmentSessionRecord[] }>(
				`/api/evolution/treatment-sessions${query ? `?${query}` : ""}`,
			);
		},
		upsert: (data: {
			patient_id: string;
			appointment_id: string;
			therapist_id?: string;
			subjective?: string;
			objective?: Record<string, unknown> | string;
			assessment?: string;
			plan?: string;
			observations?: string;
			exercises_performed?: unknown[];
			pain_level_before?: number;
			pain_level_after?: number;
			session_date?: string;
		}) =>
			request<{ data: TreatmentSessionRecord }>(
				"/api/evolution/treatment-sessions",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
	},
};

export const clinicalTestsApi = {
	list: (params?: { ids?: string[] }) => {
		const query = new URLSearchParams();
		if (params?.ids && params.ids.length > 0) {
			query.set("ids", params.ids.join(","));
		}
		return request<{ data: ClinicalTestTemplateRecord[] }>(
			`/api/clinical/test-templates${query.toString() ? `?${query.toString()}` : ""}`,
		);
	},
	get: (id: string) =>
		request<{ data: ClinicalTestTemplateRecord }>(
			`/api/clinical/test-templates/${id}`,
		),
	create: (data: Partial<ClinicalTestTemplateRecord>) =>
		request<{ data: ClinicalTestTemplateRecord }>(
			"/api/clinical/test-templates",
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
	update: (
		id: string,
		data: Partial<ClinicalTestTemplateRecord> & { image_url?: string | null },
	) =>
		request<{ data: ClinicalTestTemplateRecord }>(
			`/api/clinical/test-templates/${id}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/clinical/test-templates/${id}`, {
			method: "DELETE",
		}),
};

export const evolutionVersionsApi = {
	list: (evolutionId: string) =>
		request<{ data: any[] }>(
			`/api/clinical/evolutions/${evolutionId}/versions`,
		),
	create: (
		evolutionId: string,
		data: { content: string; change_reason?: string },
	) =>
		request<{ data: any }>(`/api/clinical/evolutions/${evolutionId}/versions`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	restore: (versionId: string) =>
		request<{ data: any }>(
			`/api/clinical/evolutions/versions/${versionId}/restore`,
			{
				method: "POST",
			},
		),
};

export const sessionsApi = {
	list: (params: {
		patientId: string;
		status?: string;
		appointmentId?: string;
		limit?: number;
		offset?: number;
	}) => {
		const qs = new URLSearchParams(
			Object.fromEntries(
				Object.entries({
					patientId: params.patientId,
					status: params.status,
					appointmentId: params.appointmentId,
					limit: params.limit?.toString(),
					offset: params.offset?.toString(),
				}).filter(([, v]) => v != null) as [string, string][],
			),
		).toString();
		return request<{ data: SessionRecord[]; total: number }>(
			`/api/sessions${qs ? `?${qs}` : ""}`,
		);
	},

	get: (id: string) => request<{ data: SessionRecord }>(`/api/sessions/${id}`),

	create: (data: Omit<SessionRecord, "id" | "created_at" | "updated_at">) =>
		request<{ data: SessionRecord }>("/api/sessions", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	update: (
		id: string,
		data: Partial<Omit<SessionRecord, "id" | "created_at">>,
	) =>
		request<{ data: SessionRecord }>(`/api/sessions/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),

	finalize: (id: string) =>
		request<{ data: SessionRecord }>(`/api/sessions/${id}/finalize`, {
			method: "POST",
		}),

	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

	autosave: (
		data: Partial<SessionRecord> & { patient_id: string; recordId?: string },
	) =>
		request<{ data: SessionRecord & { isNew?: boolean } }>(
			"/api/sessions/autosave",
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
};

const clinPublic = (path: string, opts?: RequestInit) =>
	requestPublic<any>(`/api/clinical${path}`, opts);

export const clinicalApi = {
	painMaps: {
		list: (p?: { patientId?: string; evolutionId?: string }) =>
			clin(
				`/pain-maps?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(p ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		get: (id: string) => clin(`/pain-maps/${id}`),
		create: (d: Partial<PainMap>) =>
			clin("/pain-maps", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<PainMap>) =>
			clin(`/pain-maps/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => clin(`/pain-maps/${id}`, { method: "DELETE" }),
		addPoint: (mapId: string, pt: Partial<PainMapPoint>) =>
			clin(`/pain-maps/${mapId}/points`, {
				method: "POST",
				body: JSON.stringify(pt),
			}),
		deletePoint: (mapId: string, ptId: string) =>
			clin(`/pain-maps/${mapId}/points/${ptId}`, { method: "DELETE" }),
	},
	evolutionTemplates: {
		list: (p?: { ativo?: boolean }) =>
			clin(
				`/evolution-templates${p?.ativo != null ? `?ativo=${p.ativo}` : ""}`,
			),
		get: (id: string) => clin(`/evolution-templates/${id}`),
		create: (d: Partial<EvolutionTemplate>) =>
			clin("/evolution-templates", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<EvolutionTemplate>) =>
			clin(`/evolution-templates/${id}`, {
				method: "PUT",
				body: JSON.stringify(d),
			}),
		delete: (id: string) =>
			clin(`/evolution-templates/${id}`, { method: "DELETE" }),
	},
	conductLibrary: {
		list: (p?: { category?: string }) => {
			const qs = new URLSearchParams(
				Object.fromEntries(
					Object.entries(p ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			).toString();
			return clin(`/conduct-library${qs ? `?${qs}` : ""}`);
		},
		get: (id: string) => clin(`/conduct-library/${id}`),
		create: (d: Partial<ConductLibraryRecord>) =>
			clin("/conduct-library", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<ConductLibraryRecord>) =>
			clin(`/conduct-library/${id}`, {
				method: "PUT",
				body: JSON.stringify(d),
			}),
		delete: (id: string) =>
			clin(`/conduct-library/${id}`, { method: "DELETE" }),
	},
	prescriptions: {
		list: (p?: { patientId?: string; status?: string }) =>
			clin(
				`/prescriptions?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(p ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		get: (id: string) => clin(`/prescriptions/${id}`),
		getByQr: (qr: string) => clin(`/prescriptions/qr/${qr}`),
		create: (d: Partial<ExercisePrescription>) =>
			clin("/prescriptions", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<ExercisePrescription>) =>
			clin(`/prescriptions/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => clin(`/prescriptions/${id}`, { method: "DELETE" }),
	},
	prescribedExercises: {
		list: (params?: { patientId?: string; active?: boolean }) =>
			clin(
				`/prescribed-exercises?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(params ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		create: (data: Partial<PrescribedExercise>) =>
			clin("/prescribed-exercises", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Partial<PrescribedExercise>) =>
			clin(`/prescribed-exercises/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			clin(`/prescribed-exercises/${id}`, { method: "DELETE" }),
	},
	patientObjectives: {
		list: () => clin("/patient-objectives"),
		create: (data: Record<string, unknown>) =>
			clin("/patient-objectives", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Record<string, unknown>) =>
			clin(`/patient-objectives/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			clin(`/patient-objectives/${id}`, { method: "DELETE" }),
	},
	patientObjectiveAssignments: {
		list: (patientId: string) =>
			clin(
				`/patient-objective-assignments?patientId=${encodeURIComponent(patientId)}`,
			),
		create: (data: Record<string, unknown>) =>
			clin("/patient-objective-assignments", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			clin(`/patient-objective-assignments/${id}`, { method: "DELETE" }),
	},
	standardizedTests: {
		list: (patientId: string) =>
			clin(`/standardized-tests?patientId=${encodeURIComponent(patientId)}`),
		create: (data: Partial<StandardizedTestResultRow>) =>
			clin("/standardized-tests", {
				method: "POST",
				body: JSON.stringify(data),
			}),
	},
};

export const clinicalPublicApi = {
	prescriptions: {
		getByQr: (qr: string) => clinPublic(`/prescriptions/qr/${qr}`),
		updateByQr: (qr: string, data: Partial<ExercisePrescription>) =>
			clinPublic(`/prescriptions/qr/${qr}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
	},
};
