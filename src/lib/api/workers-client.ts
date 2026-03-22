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
	clinicalApi,
	clinicalPublicApi,
} from "@/api/v2/clinical";
export { marketingApi, communicationsApi } from "@/api/v2/marketing";
export {
	notificationsApi,
	gamificationNotificationsApi,
	notificationPreferencesApi,
	automationApi,
	pushSubscriptionsApi,
	whatsappApi,
	crmApi,
} from "@/api/v2/communications";
export {
	evaluationFormsApi,
	mediaApi,
	auditLogsApi,
	auditApi,
	precadastroApi,
	reportsApi,
	publicBookingApi,
} from "@/api/v2/operations";
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
export {
	exerciseSessionsApi,
	telemedicineApi,
	documentSignaturesApi,
	exercisePlansApi,
	exerciseVideosApi,
} from "@/api/v2/rehab";
export { documentsApi, documentTemplatesApi } from "@/api/v2/documents";
export { gamificationApi } from "@/api/v2/gamification";
export {
	activityLabApi,
	dicomApi,
	type DicomStudyRecord,
} from "@/api/v2/imaging";
export {
	eventosApi,
	eventoTemplatesApi,
	checklistApi,
	salasApi,
	servicosApi,
	contratadosApi,
	eventoContratadosApi,
	participantesApi,
	prestadoresApi,
	type Evento,
	type EventoTemplateRow,
	type ChecklistItem,
	type Sala,
	type Servico,
	type Contratado,
	type EventoContratado,
	type Participante,
	type Prestador,
	type PrestadoresMetrics,
} from "@/api/v2/events";
export { tarefasApi, boardsApi } from "@/api/v2/boards";
export {
	timeEntriesApi,
	treatmentCyclesApi,
	wearablesApi,
} from "@/api/v2/tracking";

// APIs already modularized or pending
export { appointmentsApi } from "@/api/v2/appointments";
export { patientsApi } from "@/api/v2/patients";
export {
	schedulingApi,
	type ScheduleBusinessHour,
	type ScheduleCancellationRule,
	type ScheduleNotificationSetting,
	type ScheduleBlockedTime,
	type ScheduleCapacityConfig,
	type WaitlistEntry,
	type RecurringSeries,
} from "@/api/v2/scheduling";

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
