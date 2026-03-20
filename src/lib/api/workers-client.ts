/**
 * Cliente HTTP para a API Cloudflare Workers (Hono + Neon)
 *
 * URL base: api-pro.moocafisio.com.br (prod)
 *
 * Inclui automaticamente o token JWT do Neon Auth.
 */
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { getWorkersApiUrl } from "./config";

async function getAuthHeader(): Promise<Record<string, string>> {
	try {
		const token = await getNeonAccessToken();
		if (token) {
			return { Authorization: `Bearer ${token}` };
		}
	} catch (e) {
		console.warn("[API Client] Could not retrieve auth token:", e);
	}
	return {};
}

export async function request<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const authHeaders = await getAuthHeader();
	const url = `${getWorkersApiUrl()}${path}`;

	const res = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...authHeaders,
			...options.headers,
		},
	});

	if (res.status === 401) {
		const refreshedToken = await getNeonAccessToken({
			forceSessionReload: true,
		});
		const retry = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${refreshedToken}`,
				...options.headers,
			},
		});

		if (!retry.ok) {
			const retryBody = await retry
				.json()
				.catch(() => ({ error: retry.statusText }));
			throw new Error(retryBody?.error ?? `HTTP ${retry.status}`);
		}

		return retry.json() as Promise<T>;
	}

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(body?.error ?? `HTTP ${res.status}`);
	}

	return res.json() as Promise<T>;
}

export async function requestPublic<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const url = `${getWorkersApiUrl()}${path}`;

	const res = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(body?.error ?? `HTTP ${res.status}`);
	}

	return res.json() as Promise<T>;
}

function withQuery(
	path: string,
	params?: Record<string, string | number | boolean | null | undefined>,
): string {
	const qs = new URLSearchParams(
		Object.entries(params ?? {})
			.filter(([, value]) => value != null && String(value) !== "")
			.map(([key, value]) => [key, String(value)]),
	).toString();

	return qs ? `${path}?${qs}` : path;
}

// Proxies for the new modularized APIs
export { financialApi, recibosApi } from "@/api/v2/financial";
export {
	examsApi,
	medicalRequestsApi,
	goalsApi,
	evolutionApi,
	evolutionVersionsApi,
	clinicalTestsApi,
	sessionsApi,
} from "@/api/v2/clinical";
export { marketingApi, communicationsApi } from "@/api/v2/marketing";
export {
	integrationsApi,
	securityApi,
	projectsApi,
	organizationsApi,
	organizationMembersApi,
	invitationsApi,
	healthApi,
	profileApi,
} from "@/api/v2/system";
export { aiApi, analyticsApi, innovationsApi } from "@/api/v2/insights";
export { knowledgeApi, wikiApi } from "@/api/v2/knowledge";
export {
	exercisesApi,
	exerciseTemplatesApi,
	protocolsApi,
	templatesApi,
} from "@/api/v2/exercises";
export { documentsApi, documentTemplatesApi } from "@/api/v2/documents";
export { gamificationApi } from "@/api/v2/gamification";

// APIs already modularized or pending
export { appointmentsApi } from "@/api/v2/appointments";
export { patientsApi } from "@/api/v2/patients";

// Remaining APIs still in this file (to be modularized)
import type {
	SessionAttachment,
	SessionTemplate,
	GoalProfileRow,
	DoctorRecord,
	FeriadoRow,
	AutomationLogEntry,
	PushSubscription,
	WhatsAppMessage,
	PendingConfirmation,
	WhatsAppTemplateRecord,
	WhatsAppWebhookLog,
	Lead,
	LeadHistorico,
	CrmTarefa,
	CrmCampanha,
	PainMap,
	PainMapPoint,
	EvolutionTemplate,
	ConductLibraryRecord,
	ExercisePrescription,
	PrescribedExercise,
	StandardizedTestResultRow,
	EvaluationFormRow,
	EvaluationFormFieldRow,
	Notification,
	GamificationNotification,
	NotificationPreferences,
	AssetAnnotationVersionRecord,
	Evento,
	EventoTemplateRow,
	ChecklistItem,
	Sala,
	Servico,
	Contratado,
	EventoContratado,
	Participante,
	Prestador,
	PrestadoresMetrics,
	AuditLog,
	PrecadastroToken,
	Precadastro,
	MedicalReportTemplateRecord,
	MedicalReportRecord,
	ConvenioReportRecord,
	PublicBookingProfile,
	PublicBookingRequestResult,
	ExerciseSessionRow,
	ExerciseSessionStats,
	TelemedicineRoomRecord,
} from "@/types/workers";

export const sessionAttachmentsApi = {
	list: (sessionId: string) =>
		request<{ data: SessionAttachment[] }>(
			`/api/sessions/${sessionId}/attachments`,
		),

	create: (
		sessionId: string,
		data: Omit<
			SessionAttachment,
			"id" | "session_id" | "patient_id" | "uploaded_by" | "uploaded_at"
		>,
	) =>
		request<{ data: SessionAttachment }>(
			`/api/sessions/${sessionId}/attachments`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),

	delete: (sessionId: string, attachmentId: string) =>
		request<{ ok: boolean }>(
			`/api/sessions/${sessionId}/attachments/${attachmentId}`,
			{ method: "DELETE" },
		),
};

export const sessionTemplatesApi = {
	list: () => request<{ data: SessionTemplate[] }>("/api/sessions/templates"),

	create: (data: Partial<SessionTemplate>) =>
		request<{ data: SessionTemplate }>("/api/sessions/templates", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	update: (id: string, data: Partial<SessionTemplate>) =>
		request<{ data: SessionTemplate }>(`/api/sessions/templates/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),

	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/sessions/templates/${id}`, {
			method: "DELETE",
		}),
};

export const goalProfilesApi = {
	list: () => request<{ data: GoalProfileRow[] }>("/api/goal-profiles"),

	get: (id: string) =>
		request<{ data: GoalProfileRow }>(`/api/goal-profiles/${id}`),

	create: (data: Partial<GoalProfileRow> & { id: string; name: string }) =>
		request<{ data: GoalProfileRow }>("/api/goal-profiles", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	update: (id: string, updates: Partial<GoalProfileRow>) =>
		request<{ data: GoalProfileRow }>(`/api/goal-profiles/${id}`, {
			method: "PUT",
			body: JSON.stringify(updates),
		}),

	publish: (id: string) =>
		request<{ data: GoalProfileRow }>(`/api/goal-profiles/${id}/publish`, {
			method: "POST",
		}),

	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/goal-profiles/${id}`, { method: "DELETE" }),
};

export const doctorsApi = {
	list: (params?: { searchTerm?: string; limit?: number }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, v]) => v != null && String(v) !== "")
				.map(([k, v]) => [k === "searchTerm" ? "search" : k, String(v)]),
		).toString();
		return request<{ data: DoctorRecord[]; total?: number }>(
			`/api/doctors${qs ? `?${qs}` : ""}`,
		);
	},
	search: (params: { searchTerm: string; limit?: number }) =>
		doctorsApi.list(params),
	get: (id: string) =>
		request<{ data: DoctorRecord }>(`/api/doctors/${encodeURIComponent(id)}`),
	create: (data: Record<string, unknown>) =>
		request<{ data: DoctorRecord }>("/api/doctors", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: DoctorRecord }>(`/api/doctors/${encodeURIComponent(id)}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/doctors/${encodeURIComponent(id)}`, {
			method: "DELETE",
		}),
};

export const feriadosApi = {
	list: (params?: { year?: number }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, v]) => v != null)
				.map(([k, v]) => [k, String(v)]),
		).toString();
		return request<{ data: FeriadoRow[] }>(
			`/api/feriados${qs ? `?${qs}` : ""}`,
		);
	},
	create: (data: Partial<FeriadoRow>) =>
		request<{ data: FeriadoRow }>("/api/feriados", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Partial<FeriadoRow>) =>
		request<{ data: FeriadoRow }>(`/api/feriados/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/feriados/${id}`, {
			method: "DELETE",
		}),
};

export const notificationsApi = {
	list: () => request<{ data: Notification[] }>("/api/notifications"),
	create: (d: Partial<Notification>) =>
		request<{ data: Notification }>("/api/notifications", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	markRead: (id: string) =>
		request<{ ok: boolean }>(`/api/notifications/${id}/read`, {
			method: "PUT",
		}),
	markAllRead: () =>
		request<{ ok: boolean }>("/api/notifications/read-all", { method: "PUT" }),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/notifications/${id}`, { method: "DELETE" }),
};

export const gamificationNotificationsApi = {
	list: (params: { patientId: string; limit?: number }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, value]) => value != null)
				.map(([key, value]) => [
					key === "patientId" ? "patientId" : key,
					String(value),
				]),
		).toString();
		return request<{ data: GamificationNotification[] }>(
			`/api/gamification-notifications?${qs}`,
		);
	},
	markRead: (id: string) =>
		request<{ ok: boolean }>(`/api/gamification-notifications/${id}/read`, {
			method: "PUT",
		}),
	markAllRead: (patientId: string) =>
		request<{ ok: boolean }>("/api/gamification-notifications/read-all", {
			method: "PUT",
			body: JSON.stringify({ patientId }),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/gamification-notifications/${id}`, {
			method: "DELETE",
		}),
};

export const notificationPreferencesApi = {
	get: () =>
		request<{ data: NotificationPreferences | null }>(
			"/api/notification-preferences",
		),
	update: (data: Partial<NotificationPreferences>) =>
		request<{ data: NotificationPreferences }>(
			"/api/notification-preferences",
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
};

export const automationApi = {
	logs: (params?: { limit?: number }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, v]) => v != null)
				.map(([k, v]) => [k, String(v)]),
		).toString();
		return request<{ data: AutomationLogEntry[] }>(
			`/api/automation/logs${qs ? `?${qs}` : ""}`,
		);
	},
};

export const pushSubscriptionsApi = {
	list: (params?: { userId?: string; activeOnly?: boolean }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, v]) => v != null)
				.map(([k, v]) => [k, String(v)]),
		).toString();
		return request<{ data: PushSubscription[] }>(
			`/api/push-subscriptions${qs ? `?${qs}` : ""}`,
		);
	},
	upsert: (data: {
		endpoint: string;
		userId?: string;
		organizationId?: string;
		p256dh?: string;
		auth?: string;
		deviceInfo?: Record<string, unknown>;
		active?: boolean;
	}) =>
		request<{ data: PushSubscription }>("/api/push-subscriptions", {
			method: "POST",
			body: JSON.stringify({
				endpoint: data.endpoint,
				p256dh: data.p256dh,
				auth: data.auth,
				device_info: data.deviceInfo,
				organization_id: data.organizationId,
				active: data.active ?? true,
				user_id: data.userId,
			}),
		}),
	deactivate: (endpoint: string, userId?: string) =>
		request<{ data: PushSubscription | null }>(
			"/api/push-subscriptions/deactivate",
			{
				method: "PUT",
				body: JSON.stringify({ endpoint, userId }),
			},
		),
};

export const whatsappApi = {
	listMessages: (params?: {
		appointmentId?: string;
		patientId?: string;
		limit?: number;
	}) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, v]) => v != null)
				.map(([k, v]) => [
					k === "appointmentId" ? "appointmentId" : k,
					String(v),
				]),
		).toString();
		return request<{ data: WhatsAppMessage[] }>(
			`/api/whatsapp/messages${qs ? `?${qs}` : ""}`,
		);
	},
	createMessage: (data: {
		appointment_id?: string;
		patient_id?: string;
		message_type?: string;
		message_content: string;
		from_phone?: string;
		to_phone?: string;
		status?: string;
		metadata?: Record<string, unknown>;
	}) =>
		request<{ data: WhatsAppMessage }>("/api/whatsapp/messages", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	pendingConfirmations: (params?: { limit?: number }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, v]) => v != null)
				.map(([k, v]) => [k, String(v)]),
		).toString();
		return request<{ data: PendingConfirmation[] }>(
			`/api/whatsapp/pending-confirmations${qs ? `?${qs}` : ""}`,
		);
	},
	getConfig: () =>
		request<{ data: Record<string, unknown> }>("/api/whatsapp/config"),
	listTemplates: () =>
		request<{ data: WhatsAppTemplateRecord[] }>("/api/whatsapp/templates"),
	updateTemplate: (id: string, data: { content?: string; status?: string }) =>
		request<{ data: WhatsAppTemplateRecord }>(`/api/whatsapp/templates/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	listWebhookLogs: (params?: { limit?: number }) => {
		const qs = new URLSearchParams(
			Object.fromEntries(
				Object.entries(params ?? {})
					.filter(([, v]) => v != null)
					.map(([k, v]) => [k, String(v)]),
			),
		).toString();
		return request<{ data: WhatsAppWebhookLog[] }>(
			`/api/whatsapp/webhook-logs${qs ? `?${qs}` : ""}`,
		);
	},
};

const crm = (path: string, opts?: RequestInit) =>
	request<any>(`/api/crm${path}`, opts);
export const crmApi = {
	leads: {
		list: (p?: { estagio?: string }) =>
			crm(
				`/leads?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(p ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		get: (id: string) => crm(`/leads/${id}`),
		create: (d: Partial<Lead>) =>
			crm("/leads", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<Lead>) =>
			crm(`/leads/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => crm(`/leads/${id}`),
		historico: (id: string) => crm(`/leads/${id}/historico`),
		addHistorico: (id: string, d: Partial<LeadHistorico>) =>
			crm(`/leads/${id}/historico`, {
				method: "POST",
				body: JSON.stringify(d),
			}),
	},
	tarefas: {
		list: (p?: { status?: string; leadId?: string }) =>
			crm(
				`/tarefas?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(p ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		create: (d: Partial<CrmTarefa>) =>
			crm("/tarefas", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<CrmTarefa>) =>
			crm(`/tarefas/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => crm(`/tarefas/${id}`, { method: "DELETE" }),
	},
	campanhas: {
		list: (p?: {
			status?: string;
			tipo?: string;
			limit?: number;
			offset?: number;
		}) =>
			crm(
				`/campanhas?${new URLSearchParams(
					Object.fromEntries(
						Object.entries(p ?? {})
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					),
				)}`,
			),
		create: (d: Partial<CrmCampanha> & { patient_ids?: string[] }) =>
			crm("/campanhas", { method: "POST", body: JSON.stringify(d) }),
		update: (id: string, d: Partial<CrmCampanha>) =>
			crm(`/campanhas/${id}`, { method: "PUT", body: JSON.stringify(d) }),
		delete: (id: string) => crm(`/campanhas/${id}`, { method: "DELETE" }),
	},
};

const clin = (path: string, opts?: RequestInit) =>
	request<any>(`/api/clinical${path}`, opts);
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

const evalForms = (path: string, opts?: RequestInit) =>
	request<any>(`/api/evaluation-forms${path}`, opts);
export const evaluationFormsApi = {
	list: (p?: { tipo?: string; ativo?: boolean; favorite?: boolean }) => {
		const qs = new URLSearchParams(
			Object.fromEntries(
				Object.entries(p ?? {})
					.filter(([, v]) => v != null)
					.map(([k, v]) => [k, String(v)]),
			),
		).toString();
		return evalForms(qs ? `?${qs}` : "");
	},
	get: (id: string) => evalForms(`/${id}`),
	create: (d: Partial<EvaluationFormRow>) =>
		evalForms("", { method: "POST", body: JSON.stringify(d) }),
	update: (id: string, d: Partial<EvaluationFormRow>) =>
		evalForms(`/${id}`, { method: "PUT", body: JSON.stringify(d) }),
	delete: (id: string) => evalForms(`/${id}`, { method: "DELETE" }),
	duplicate: (id: string) => evalForms(`/${id}/duplicate`, { method: "POST" }),
	addField: (formId: string, d: Partial<EvaluationFormFieldRow>) =>
		evalForms(`/${formId}/fields`, { method: "POST", body: JSON.stringify(d) }),
	updateField: (fieldId: string, d: Partial<EvaluationFormFieldRow>) =>
		evalForms(`/fields/${fieldId}`, { method: "PUT", body: JSON.stringify(d) }),
	deleteField: (fieldId: string) =>
		evalForms(`/fields/${fieldId}`, { method: "DELETE" }),
	responses: {
		list: (formId: string, params?: { patientId?: string }) => {
			const qs = new URLSearchParams(
				Object.fromEntries(
					Object.entries(params ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			).toString();
			return evalForms(`/${formId}/responses${qs ? `?${qs}` : ""}`);
		},
		create: (
			formId: string,
			d: {
				patient_id: string;
				appointment_id?: string | null;
				responses: Record<string, unknown>;
			},
		) =>
			evalForms(`/${formId}/responses`, {
				method: "POST",
				body: JSON.stringify(d),
			}),
	},
};

export const mediaApi = {
	getUploadUrl: (data: {
		filename: string;
		contentType: string;
		folder?: string;
	}) =>
		request<{
			data: {
				uploadUrl: string;
				publicUrl: string;
				key: string;
				expiresIn: number;
			};
		}>("/api/media/upload-url", { method: "POST", body: JSON.stringify(data) }),
	annotations: {
		list: (assetId: string) =>
			request<{ data: AssetAnnotationVersionRecord[] }>(
				`/api/media/annotations?assetId=${encodeURIComponent(assetId)}`,
			),
		create: (data: {
			asset_id: string;
			version: number;
			data: Record<string, unknown>[];
		}) =>
			request<{ data: AssetAnnotationVersionRecord }>(
				"/api/media/annotations",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
	},
};

export const eventosApi = {
	list: (p?: {
		status?: string;
		categoria?: string;
		limit?: number;
		offset?: number;
	}) =>
		request<{ data: Evento[] }>(
			`/api/activities?${new URLSearchParams(
				Object.fromEntries(
					Object.entries(p ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			)}`,
		),
	get: (id: string) => request<{ data: Evento }>(`/api/activities/${id}`),
	create: (d: Partial<Evento>) =>
		request<{ data: Evento }>("/api/activities", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	update: (id: string, d: Partial<Evento>) =>
		request<{ data: Evento }>(`/api/activities/${id}`, {
			method: "PUT",
			body: JSON.stringify(d),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/activities/${id}`, { method: "DELETE" }),
};

export const eventoTemplatesApi = {
	list: () => request<{ data: EventoTemplateRow[] }>("/api/activity-templates"),
	get: (id: string) =>
		request<{ data: EventoTemplateRow }>(`/api/activity-templates/${id}`),
	create: (data: Partial<EventoTemplateRow>) =>
		request<{ data: EventoTemplateRow }>("/api/activity-templates", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/activity-templates/${id}`, {
			method: "DELETE",
		}),
};

export const checklistApi = {
	list: (eventoId: string) =>
		request<{ data: ChecklistItem[] }>(
			`/api/checklist?eventoId=${encodeURIComponent(eventoId)}`,
		),
	create: (d: Partial<ChecklistItem>) =>
		request<{ data: ChecklistItem }>("/api/checklist", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	update: (id: string, d: Partial<ChecklistItem>) =>
		request<{ data: ChecklistItem }>(`/api/checklist/${id}`, {
			method: "PUT",
			body: JSON.stringify(d),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/checklist/${id}`, { method: "DELETE" }),
};

export const salasApi = {
	list: () => request<{ data: Sala[] }>("/api/salas"),
	create: (d: Partial<Sala>) =>
		request<{ data: Sala }>("/api/salas", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	update: (id: string, d: Partial<Sala>) =>
		request<{ data: Sala }>(`/api/salas/${id}`, {
			method: "PUT",
			body: JSON.stringify(d),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/salas/${id}`, { method: "DELETE" }),
};

export const servicosApi = {
	list: () => request<{ data: Servico[] }>("/api/servicos"),
	create: (d: Partial<Servico>) =>
		request<{ data: Servico }>("/api/servicos", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	update: (id: string, d: Partial<Servico>) =>
		request<{ data: Servico }>(`/api/servicos/${id}`, {
			method: "PUT",
			body: JSON.stringify(d),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/servicos/${id}`, { method: "DELETE" }),
};

export const contratadosApi = {
	list: () => request<{ data: Contratado[] }>("/api/contratados"),
	create: (d: Partial<Contratado>) =>
		request<{ data: Contratado }>("/api/contratados", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	update: (id: string, d: Partial<Contratado>) =>
		request<{ data: Contratado }>(`/api/contratados/${id}`, {
			method: "PUT",
			body: JSON.stringify(d),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/contratados/${id}`, { method: "DELETE" }),
};

export const eventoContratadosApi = {
	list: (p?: { eventoId?: string; contratadoId?: string }) =>
		request<{ data: EventoContratado[] }>(
			`/api/activity-contractors?${new URLSearchParams(
				Object.fromEntries(
					Object.entries(p ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			)}`,
		),
	create: (d: Partial<EventoContratado>) =>
		request<{ data: EventoContratado }>("/api/activity-contractors", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	update: (id: string, d: Partial<EventoContratado>) =>
		request<{ data: EventoContratado }>(`/api/activity-contractors/${id}`, {
			method: "PUT",
			body: JSON.stringify(d),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/activity-contractors/${id}`, {
			method: "DELETE",
		}),
};

export const participantesApi = {
	list: (p?: { eventoId?: string; limit?: number; offset?: number }) =>
		request<{ data: Participante[] }>(
			`/api/participantes?${new URLSearchParams(
				Object.fromEntries(
					Object.entries(p ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			)}`,
		),
	create: (d: Partial<Participante>) =>
		request<{ data: Participante }>("/api/participantes", {
			method: "POST",
			body: JSON.stringify(d),
		}),
	update: (id: string, d: Partial<Participante>) =>
		request<{ data: Participante }>(`/api/participantes/${id}`, {
			method: "PUT",
			body: JSON.stringify(d),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/participantes/${id}`, { method: "DELETE" }),
};

const PRESTADORES_BASE = "/api/prestadores";
export const prestadoresApi = {
	list: (params: { eventoId: string }) =>
		request<{ data: Prestador[] }>(
			`${PRESTADORES_BASE}?eventoId=${encodeURIComponent(params.eventoId)}`,
		),
	metrics: (eventoId: string) =>
		request<{ data: PrestadoresMetrics }>(
			`${PRESTADORES_BASE}/metrics?eventoId=${encodeURIComponent(eventoId)}`,
		),
	create: (data: Partial<Prestador> & { evento_id: string }) =>
		request<{ data: Prestador }>(PRESTADORES_BASE, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Partial<Prestador>) =>
		request<{ data: Prestador }>(`${PRESTADORES_BASE}/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`${PRESTADORES_BASE}/${id}`, {
			method: "DELETE",
		}),
	toggleStatus: (id: string, status?: "PENDENTE" | "PAGO") =>
		request<{ data: Prestador }>(`${PRESTADORES_BASE}/${id}/status`, {
			method: "PUT",
			body: JSON.stringify({ status }),
		}),
};

export const auditLogsApi = {
	list: (params?: { entityType?: string; entityId?: string; limit?: number }) =>
		request<{ data: AuditLog[] }>(withQuery("/api/audit-logs", params)),
	create: (d: Partial<AuditLog>) =>
		request<{ data: AuditLog }>("/api/audit-logs", {
			method: "POST",
			body: JSON.stringify(d),
		}),
};

export const auditApi = auditLogsApi;

export const precadastroApi = {
	public: {
		getToken: (token: string) =>
			requestPublic<{ data: PrecadastroToken }>(
				`/api/precadastro/public/${encodeURIComponent(token)}`,
			),
		submit: (
			token: string,
			data: {
				nome: string;
				email?: string;
				telefone?: string;
				data_nascimento?: string;
				endereco?: string;
				cpf?: string;
				convenio?: string;
				queixa_principal?: string;
				observacoes?: string;
			},
		) =>
			requestPublic<{ data: Precadastro }>(
				`/api/precadastro/public/${encodeURIComponent(token)}/submissions`,
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
	},
	tokens: {
		list: () =>
			request<{ data: PrecadastroToken[] }>("/api/precadastro/tokens"),
		create: (data: Partial<PrecadastroToken>) =>
			request<{ data: PrecadastroToken }>("/api/precadastro/tokens", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Partial<PrecadastroToken>) =>
			request<{ data: PrecadastroToken }>(`/api/precadastro/tokens/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
	},
	submissions: {
		list: () =>
			request<{ data: Precadastro[] }>("/api/precadastro/submissions"),
		update: (id: string, data: Partial<Precadastro>) =>
			request<{ data: Precadastro }>(`/api/precadastro/submissions/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
	},
};

export const reportsApi = {
	medicalTemplates: {
		list: () =>
			request<{ data: MedicalReportTemplateRecord[] }>(
				"/api/reports/medical-templates",
			),
		create: (data: Partial<MedicalReportTemplateRecord>) =>
			request<{ data: MedicalReportTemplateRecord }>(
				"/api/reports/medical-templates",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
		update: (id: string, data: Partial<MedicalReportTemplateRecord>) =>
			request<{ data: MedicalReportTemplateRecord }>(
				`/api/reports/medical-templates/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
		delete: (id: string) =>
			request<{ ok: boolean }>(`/api/reports/medical-templates/${id}`, {
				method: "DELETE",
			}),
	},
	medical: {
		list: () =>
			request<{ data: MedicalReportRecord[] }>("/api/reports/medical"),
		create: (data: Partial<MedicalReportRecord> & Record<string, unknown>) =>
			request<{ data: MedicalReportRecord }>("/api/reports/medical", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (
			id: string,
			data: Partial<MedicalReportRecord> & Record<string, unknown>,
		) =>
			request<{ data: MedicalReportRecord }>(`/api/reports/medical/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ ok: boolean }>(`/api/reports/medical/${id}`, {
				method: "DELETE",
			}),
	},
	convenio: {
		list: () =>
			request<{ data: ConvenioReportRecord[] }>("/api/reports/convenio"),
		create: (data: Partial<ConvenioReportRecord> & Record<string, unknown>) =>
			request<{ data: ConvenioReportRecord }>("/api/reports/convenio", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (
			id: string,
			data: Partial<ConvenioReportRecord> & Record<string, unknown>,
		) =>
			request<{ data: ConvenioReportRecord }>(`/api/reports/convenio/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ ok: boolean }>(`/api/reports/convenio/${id}`, {
				method: "DELETE",
			}),
	},
};

export const publicBookingApi = {
	getProfile: (slug: string) =>
		requestPublic<{ data: PublicBookingProfile }>(
			`/api/public/booking/${encodeURIComponent(slug)}`,
		),
	create: (data: {
		slug: string;
		date: string;
		time: string;
		patient: {
			name: string;
			email?: string;
			phone: string;
			notes?: string;
		};
	}) =>
		requestPublic<{ data: PublicBookingRequestResult; success: boolean }>(
			"/api/public/booking",
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
};

export const exerciseSessionsApi = {
	list: (params: {
		patientId?: string;
		exerciseId?: string;
		limit?: number;
	}) => {
		const qs = new URLSearchParams();
		if (params.patientId) qs.set("patientId", params.patientId);
		if (params.exerciseId) qs.set("exerciseId", params.exerciseId);
		if (params.limit) qs.set("limit", String(params.limit));
		return request<{ data: ExerciseSessionRow[] }>(
			`/api/exercise-sessions?${qs}`,
		);
	},
	create: (data: Omit<ExerciseSessionRow, "id" | "created_at">) =>
		request<{ data: ExerciseSessionRow }>("/api/exercise-sessions", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	stats: (patientId: string) =>
		request<{ data: ExerciseSessionStats }>(
			`/api/exercise-sessions/stats/${encodeURIComponent(patientId)}`,
		),
};

export const telemedicineApi = {
	rooms: {
		list: () =>
			request<{ data: TelemedicineRoomRecord[] }>("/api/telemedicine/rooms"),
		get: (id: string) =>
			request<{ data: TelemedicineRoomRecord }>(
				`/api/telemedicine/rooms/${id}`,
			),
		create: (data: Partial<TelemedicineRoomRecord>) =>
			request<{ data: TelemedicineRoomRecord }>("/api/telemedicine/rooms", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		start: (id: string) =>
			request<{ data: TelemedicineRoomRecord }>(
				`/api/telemedicine/rooms/${id}/start`,
				{
					method: "POST",
				},
			),
		update: (id: string, data: Partial<TelemedicineRoomRecord>) =>
			request<{ data: TelemedicineRoomRecord }>(
				`/api/telemedicine/rooms/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
	},
};

export interface ScheduleBusinessHour {
	id: string;
	organization_id?: string;
	day_of_week: number;
	is_open?: boolean;
	open_time?: string | null;
	close_time?: string | null;
	break_start?: string | null;
	break_end?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface ScheduleCancellationRule {
	id: string;
	organization_id?: string;
	min_hours_before?: number;
	allow_patient_cancellation?: boolean;
	max_cancellations_month?: number;
	charge_late_cancellation?: boolean;
	late_cancellation_fee?: number;
	created_at?: string;
	updated_at?: string;
}

export interface ScheduleNotificationSetting {
	id: string;
	organization_id?: string;
	send_confirmation_email?: boolean;
	send_confirmation_whatsapp?: boolean;
	send_reminder_24h?: boolean;
	send_reminder_2h?: boolean;
	send_cancellation_notice?: boolean;
	custom_confirmation_message?: string | null;
	custom_reminder_message?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface ScheduleBlockedTime {
	id: string;
	organization_id?: string;
	therapist_id?: string | null;
	title?: string;
	reason?: string | null;
	start_date: string;
	end_date: string;
	start_time?: string | null;
	end_time?: string | null;
	is_all_day?: boolean;
	is_recurring?: boolean;
	recurring_days?: number[];
	created_by?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface ScheduleCapacityConfig {
	id: string;
	organization_id?: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	max_patients: number;
	created_at?: string;
	updated_at?: string;
}

export interface WaitlistEntry {
	id: string;
	patient_id: string;
	organization_id?: string;
	preferred_days?: string[];
	preferred_periods?: string[];
	preferred_therapist_id?: string | null;
	priority?: "normal" | "high" | "urgent" | string;
	status?: "waiting" | "offered" | "scheduled" | "removed" | string;
	notes?: string | null;
	refusal_count?: number;
	offered_slot?: string | null;
	offered_at?: string | null;
	offer_expires_at?: string | null;
	created_at: string;
	updated_at?: string;
}

export interface RecurringSeries {
	id: string;
	patient_id?: string;
	therapist_id?: string;
	recurrence_type?: string;
	recurrence_interval?: number;
	recurrence_days_of_week?: number[] | null;
	appointment_date?: string;
	appointment_time?: string;
	duration?: number;
	appointment_type?: string;
	notes?: string | null;
	auto_confirm?: boolean;
	is_active?: boolean;
	canceled_at?: string | null;
	created_at?: string;
	updated_at?: string;
}

export type { DicomStudyRecord } from "@/types/workers";

export const activityLabApi = {
	patients: {
		list: (params?: { search?: string; limit?: number }) =>
			request<{ data: Array<Record<string, unknown>> }>(
				withQuery("/api/activity-lab/patients", params),
			),
		get: (id: string) =>
			request<{ data: Record<string, unknown> | null }>(
				`/api/activity-lab/patients/${encodeURIComponent(id)}`,
			),
	},
	sessions: {
		listByPatient: (patientId: string) =>
			request<{ data: Array<Record<string, unknown>> }>(
				`/api/activity-lab/patients/${encodeURIComponent(patientId)}/sessions`,
			),
		get: (id: string) =>
			request<{ data: Record<string, unknown> | null }>(
				`/api/activity-lab/sessions/${encodeURIComponent(id)}`,
			),
	},
	clinic: {
		get: () =>
			request<{ data: Record<string, unknown> | null }>(
				"/api/activity-lab/clinic/profile",
			),
	},
};

export const dicomApi = {
	studies: (params?: Record<string, string | number | boolean | undefined>) =>
		request<{ data: Record<string, unknown>[] }>(
			withQuery("/api/dicom/studies", params),
		),
	series: (studyUid: string) =>
		request<{ data: Record<string, unknown>[] }>(
			`/api/dicom/studies/${encodeURIComponent(studyUid)}/series`,
		),
	instances: (studyUid: string, seriesUid: string) =>
		request<{ data: Array<Record<string, { Value?: string[] }>> }>(
			`/api/dicom/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances`,
		),
	uploadInstances: (payloads: Array<{ body: string; fileName: string }>) =>
		Promise.all(
			payloads.map((payload) =>
				request<{ data: Record<string, unknown> }>("/api/dicom/instances", {
					method: "POST",
					body: JSON.stringify(payload),
				}),
			),
		),
	config: () => request<{ data: Record<string, unknown> }>("/api/dicom/config"),
	getWadoUrl: () => `${getWorkersApiUrl()}/api/dicom/wado`,
};

export const documentSignaturesApi = {
	list: (documentId?: string) =>
		request<{ data: Record<string, unknown>[] }>(
			withQuery("/api/document-signatures", { documentId }),
		),
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>("/api/document-signatures", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	verify: (documentId: string, hash: string) =>
		request<{
			data: { valid: boolean; signature: Record<string, unknown> | null };
		}>(withQuery("/api/document-signatures/verify", { documentId, hash })),
};

export const exercisePlansApi = {
	list: (params?: { patientId?: string }) =>
		request<{ data: Array<Record<string, unknown>> }>(
			withQuery("/api/exercise-plans", params),
		),
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>("/api/exercise-plans", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/exercise-plans/${encodeURIComponent(id)}`,
			{
				method: "PATCH",
				body: JSON.stringify(data),
			},
		),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/exercise-plans/${encodeURIComponent(id)}`, {
			method: "DELETE",
		}),
	addItem: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/exercise-plans/${encodeURIComponent(id)}/items`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
};

export const exerciseVideosApi = {
	list: (params?: {
		category?: string;
		difficulty?: string;
		bodyPart?: string;
		equipment?: string;
		search?: string;
	}) =>
		request<{ data: Array<Record<string, unknown>> }>(
			withQuery("/api/exercise-videos", params),
		),
	get: (id: string) =>
		request<{ data: Record<string, unknown> }>(
			`/api/exercise-videos/${encodeURIComponent(id)}`,
		),
	byExercise: (exerciseId: string) =>
		request<{ data: Array<Record<string, unknown>> }>(
			`/api/exercise-videos/by-exercise/${encodeURIComponent(exerciseId)}`,
		),
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>("/api/exercise-videos", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/exercise-videos/${encodeURIComponent(id)}`,
			{
				method: "PUT",
				body: JSON.stringify(data),
			},
		),
	delete: (id: string) =>
		request<{ data: Record<string, unknown> }>(
			`/api/exercise-videos/${encodeURIComponent(id)}`,
			{
				method: "DELETE",
			},
		),
};

export const satisfactionSurveysApi = {
	list: (params?: {
		patientId?: string;
		therapistId?: string;
		startDate?: string;
		endDate?: string;
		responded?: boolean;
	}) =>
		request<{ data: Array<Record<string, unknown>> }>(
			withQuery("/api/satisfaction-surveys", params),
		),
	stats: () =>
		request<{ data: Record<string, unknown> }>(
			"/api/satisfaction-surveys/stats",
		),
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>("/api/satisfaction-surveys", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/satisfaction-surveys/${encodeURIComponent(id)}`,
			{
				method: "PATCH",
				body: JSON.stringify(data),
			},
		),
	delete: (id: string) =>
		request<{ ok: boolean }>(
			`/api/satisfaction-surveys/${encodeURIComponent(id)}`,
			{
				method: "DELETE",
			},
		),
};

export const schedulingApi = {
	capacity: {
		list: () =>
			request<{ data: ScheduleCapacityConfig[] }>(
				"/api/scheduling/capacity-config",
			),
		create: (data: Record<string, unknown> | Array<Record<string, unknown>>) =>
			request<{ data: ScheduleCapacityConfig[] }>(
				"/api/scheduling/capacity-config",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
		update: (id: string, data: Record<string, unknown>) =>
			request<{ data: ScheduleCapacityConfig }>(
				`/api/scheduling/capacity-config/${encodeURIComponent(id)}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
		delete: (id: string) =>
			request<{ ok?: boolean; success?: boolean }>(
				`/api/scheduling/capacity-config/${encodeURIComponent(id)}`,
				{
					method: "DELETE",
				},
			),
	},
	settings: {
		businessHours: {
			list: () =>
				request<{ data: ScheduleBusinessHour[] }>(
					"/api/scheduling/settings/business-hours",
				),
			upsert: (data: Record<string, unknown>[]) =>
				request<{ data: ScheduleBusinessHour[] }>(
					"/api/scheduling/settings/business-hours",
					{
						method: "PUT",
						body: JSON.stringify(data),
					},
				),
		},
		cancellationRules: {
			get: () =>
				request<{ data: ScheduleCancellationRule | null }>(
					"/api/scheduling/settings/cancellation-rules",
				),
			upsert: (data: Record<string, unknown>) =>
				request<{ data: ScheduleCancellationRule }>(
					"/api/scheduling/settings/cancellation-rules",
					{
						method: "PUT",
						body: JSON.stringify(data),
					},
				),
		},
		notificationSettings: {
			get: () =>
				request<{ data: ScheduleNotificationSetting | null }>(
					"/api/scheduling/settings/notification-settings",
				),
			upsert: (data: Record<string, unknown>) =>
				request<{ data: ScheduleNotificationSetting }>(
					"/api/scheduling/settings/notification-settings",
					{
						method: "PUT",
						body: JSON.stringify(data),
					},
				),
		},
		blockedTimes: {
			list: () =>
				request<{ data: ScheduleBlockedTime[] }>(
					"/api/scheduling/settings/blocked-times",
				),
			create: (data: Record<string, unknown>) =>
				request<{ data: ScheduleBlockedTime }>(
					"/api/scheduling/settings/blocked-times",
					{
						method: "POST",
						body: JSON.stringify(data),
					},
				),
			delete: (id: string) =>
				request<{ ok?: boolean; success?: boolean }>(
					`/api/scheduling/settings/blocked-times/${encodeURIComponent(id)}`,
					{
						method: "DELETE",
					},
				),
		},
	},
	blockedTimes: {
		list: () =>
			request<{ data: ScheduleBlockedTime[] }>(
				"/api/scheduling/settings/blocked-times",
			),
		create: (data: Record<string, unknown>) =>
			request<{ data: ScheduleBlockedTime }>(
				"/api/scheduling/settings/blocked-times",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
		delete: (id: string) =>
			request<{ ok?: boolean; success?: boolean }>(
				`/api/scheduling/settings/blocked-times/${encodeURIComponent(id)}`,
				{
					method: "DELETE",
				},
			),
	},
	waitlist: {
		list: (params?: { status?: string; priority?: string }) =>
			request<{ data: WaitlistEntry[] }>(
				withQuery("/api/scheduling/waitlist", params),
			),
		create: (data: Record<string, unknown>) =>
			request<{ data: WaitlistEntry }>("/api/scheduling/waitlist", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Record<string, unknown>) =>
			request<{ data: WaitlistEntry }>(
				`/api/scheduling/waitlist/${encodeURIComponent(id)}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
		delete: (id: string) =>
			request<{ ok?: boolean; success?: boolean }>(
				`/api/scheduling/waitlist/${encodeURIComponent(id)}`,
				{
					method: "DELETE",
				},
			),
	},
	waitlistOffers: {
		list: (waitlistId?: string) =>
			request<{ data: Array<Record<string, unknown>> }>(
				withQuery("/api/scheduling/waitlist-offers", { waitlistId }),
			),
		create: (data: Record<string, unknown>) =>
			request<{ data: Record<string, unknown> }>(
				"/api/scheduling/waitlist-offers",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
		respond: (id: string, data: Record<string, unknown>) =>
			request<{ data: Record<string, unknown> }>(
				`/api/scheduling/waitlist-offers/${encodeURIComponent(id)}/respond`,
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
	},
	recurringSeries: {
		list: (params?: { patientId?: string; isActive?: boolean }) =>
			request<{ data: RecurringSeries[] }>(
				withQuery("/api/scheduling/recurring-series", params),
			),
		create: (data: Record<string, unknown>) =>
			request<{ data: RecurringSeries }>("/api/scheduling/recurring-series", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Record<string, unknown>) =>
			request<{ data: RecurringSeries }>(
				`/api/scheduling/recurring-series/${encodeURIComponent(id)}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
		delete: (id: string) =>
			request<{ ok?: boolean; success?: boolean }>(
				`/api/scheduling/recurring-series/${encodeURIComponent(id)}`,
				{
					method: "DELETE",
				},
			),
		occurrences: (id: string) =>
			request<{ data: Array<Record<string, unknown>> }>(
				`/api/scheduling/recurring-series/${encodeURIComponent(id)}/occurrences`,
			),
	},
};

export const timeEntriesApi = {
	list: (params?: {
		userId?: string;
		startDate?: string;
		endDate?: string;
		patientId?: string;
		limit?: number;
	}) =>
		request<{ data: Array<Record<string, any>> }>(
			withQuery("/api/time-entries", params),
		),
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, any> }>("/api/time-entries", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, any> }>(
			`/api/time-entries/${encodeURIComponent(id)}`,
			{
				method: "PATCH",
				body: JSON.stringify(data),
			},
		),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/time-entries/${encodeURIComponent(id)}`, {
			method: "DELETE",
		}),
	stats: (params?: { userId?: string; startDate?: string; endDate?: string }) =>
		request<{ data: Record<string, any> }>(
			withQuery("/api/time-entries/stats", params),
		),
	getTimerDraft: (userId: string) =>
		request<{ data: Record<string, any> | null }>(
			`/api/time-entries/timer-draft/${encodeURIComponent(userId)}`,
		),
	saveTimerDraft: (userId: string, timer: Record<string, unknown>) =>
		request<{ ok: boolean }>(
			`/api/time-entries/timer-draft/${encodeURIComponent(userId)}`,
			{
				method: "PUT",
				body: JSON.stringify({ timer }),
			},
		),
	clearTimerDraft: (userId: string) =>
		request<{ ok: boolean }>(
			`/api/time-entries/timer-draft/${encodeURIComponent(userId)}`,
			{
				method: "DELETE",
			},
		),
};

export const treatmentCyclesApi = {
	list: (patientId?: string) =>
		request<{ data: Array<Record<string, unknown>> }>(
			withQuery("/api/treatment-cycles", { patientId }),
		),
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>("/api/treatment-cycles", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/treatment-cycles/${encodeURIComponent(id)}`,
			{
				method: "PATCH",
				body: JSON.stringify(data),
			},
		),
	delete: (id: string) =>
		request<{ ok: boolean }>(
			`/api/treatment-cycles/${encodeURIComponent(id)}`,
			{
				method: "DELETE",
			},
		),
};

export const wearablesApi = {
	list: (params?: {
		patientId?: string;
		dataType?: string;
		source?: string;
		limit?: number;
	}) =>
		request<{ data: Array<Record<string, unknown>> }>(
			withQuery("/api/wearables", params),
		),
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>("/api/wearables", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	bulk: (entries: Array<Record<string, unknown>>) =>
		request<{ data: Array<Record<string, unknown>> }>("/api/wearables/bulk", {
			method: "POST",
			body: JSON.stringify({ entries }),
		}),
};

export const tarefasApi = {
	list: (params?: { projectId?: string }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {})
				.filter(([, value]) => value != null)
				.map(([key, value]) => [key, String(value)]),
		).toString();
		return request<{ data: Record<string, unknown>[] }>(
			`/api/tarefas${qs ? `?${qs}` : ""}`,
		);
	},
	create: (data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>("/api/tarefas", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/tarefas/${encodeURIComponent(id)}`,
			{
				method: "PATCH",
				body: JSON.stringify(data),
			},
		),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/tarefas/${encodeURIComponent(id)}`, {
			method: "DELETE",
		}),
	bulk: (
		updates: Array<{ id: string; status?: string; order_index?: number }>,
	) =>
		request<{ ok: boolean }>("/api/tarefas/bulk", {
			method: "POST",
			body: JSON.stringify({ updates }),
		}),
};

export const boardsApi = {
	list: (archived = false) =>
		request<{ data: Record<string, unknown>[] }>(
			`/api/boards?archived=${archived}`,
		),

	get: (id: string) =>
		request<{ data: Record<string, unknown> }>(`/api/boards/${id}`),

	create: (data: {
		name: string;
		description?: string;
		background_color?: string;
		background_image?: string;
		icon?: string;
	}) =>
		request<{ data: Record<string, unknown> }>("/api/boards", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	update: (id: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(`/api/boards/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),

	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/boards/${id}`, { method: "DELETE" }),

	listTarefas: (boardId: string) =>
		request<{ data: Record<string, unknown>[] }>(
			`/api/boards/${boardId}/tarefas`,
		),

	listColumns: (boardId: string) =>
		request<{ data: Record<string, unknown>[] }>(
			`/api/boards/${boardId}/columns`,
		),

	createColumn: (
		boardId: string,
		data: { name: string; color?: string; wip_limit?: number },
	) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/${boardId}/columns`,
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),

	updateColumn: (colId: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(`/api/boards/columns/${colId}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),

	deleteColumn: (colId: string) =>
		request<{ ok: boolean }>(`/api/boards/columns/${colId}`, {
			method: "DELETE",
		}),

	reorderColumns: (updates: Array<{ id: string; order_index: number }>) =>
		request<{ ok: boolean }>("/api/boards/columns/reorder", {
			method: "POST",
			body: JSON.stringify({ updates }),
		}),
};

export type {
	PatientLifecycleEvent,
	PatientOutcomeMeasure,
	PatientSessionMetrics,
	PatientPrediction,
	PatientRiskScore,
	PatientInsight,
	PatientGoalTracking,
	ClinicalBenchmark,
} from "@/types/patientAnalytics";

export type {
	ClinicalTestTemplateRecord,
	PatientChallengeRow,
	WeeklyChallengeRow,
	GamificationProfileRow,
	DailyQuestRow,
	AchievementRow,
	AchievementLogRow,
	XpTransactionRow,
	GamificationLeaderboardRow,
	ShopItemRow,
	UserInventoryRow,
	GamificationSettingRow,
	GamificationStats,
	AtRiskPatient,
	PopularAchievement,
	QuestDefinitionRow,
} from "@/types/workers";

export const commissionsApi = {
	summary: (month: string) =>
		request<{ data: unknown[]; period: { start: string; end: string } }>(
			`/api/commissions/summary?month=${month}`,
		),

	config: (therapistId?: string) =>
		request<{ data: unknown[] }>(
			`/api/commissions/config${therapistId ? `?therapistId=${therapistId}` : ""}`,
		),

	therapistHistory: (therapistId: string) =>
		request<{ data: unknown[] }>(`/api/commissions/therapist/${therapistId}`),

	setRate: (data: {
		therapist_id: string;
		commission_rate: number;
		notes?: string;
	}) =>
		request<{ data: unknown }>("/api/commissions/config", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	payout: (data: Record<string, unknown>) =>
		request<{ data: unknown }>("/api/commissions/payout", {
			method: "POST",
			body: JSON.stringify(data),
		}),
};

export const nfseApi = {
	list: (params?: { patientId?: string; month?: string; status?: string }) => {
		const qs = new URLSearchParams(
			Object.entries(params ?? {}).filter(([, v]) => v != null) as [
				string,
				string,
			][],
		).toString();
		return request<{ data: unknown[] }>(`/api/nfse${qs ? `?${qs}` : ""}`);
	},

	get: (id: string) => request<{ data: unknown }>(`/api/nfse/${id}`),

	config: () => request<{ data: unknown }>("/api/nfse/config"),

	saveConfig: (data: Record<string, unknown>) =>
		request<{ data: unknown }>("/api/nfse/config", {
			method: "PUT",
			body: JSON.stringify(data),
		}),

	generate: (data: Record<string, unknown>) =>
		request<{ data: unknown }>("/api/nfse/generate", {
			method: "POST",
			body: JSON.stringify(data),
		}),

	send: (id: string) =>
		request<{ data: unknown }>(`/api/nfse/send/${id}`, {
			method: "POST",
			body: JSON.stringify({}),
		}),

	cancel: (id: string) =>
		request<{ data: unknown }>(`/api/nfse/${id}`, { method: "DELETE" }),
};
