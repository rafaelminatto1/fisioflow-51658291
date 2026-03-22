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

// Proxies for the new modularized APIs
export { financialApi, recibosApi } from "@/api/v2/financial";
export { commissionsApi, nfseApi } from "@/api/v2/billing";
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
export { satisfactionSurveysApi } from "@/api/v2/feedback";
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
	sessionAttachmentsApi,
	sessionTemplatesApi,
	goalProfilesApi,
	doctorsApi,
	feriadosApi,
} from "@/api/v2/admin";
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
