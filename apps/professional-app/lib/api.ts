/**
 * API Client for Professional App
 * Re-architected to use Cloudflare Workers and Neon DB
 *
 * @module lib/api
 */

import { config } from "./config";
import { getToken } from "./token-storage";
import {
	ApiPatient,
	ApiAppointment,
	ApiExercise,
	ApiEvolution,
	ApiConversation,
	ApiMessage,
	ApiTarefa,
	ApiPartnership,
	ApiDashboardStats,
	ApiResponse,
} from "@/types/api";

export * from "@/types/api";

class ApiError extends Error {
	constructor(
		public endpoint: string,
		public status: number,
		public message: string,
	) {
		super(`API Error [${endpoint}]: ${status} - ${message}`);
		this.name = "ApiError";
	}
}

function normalizeExerciseDifficulty(
	difficulty?: string,
): ApiExercise["difficulty"] {
	switch (difficulty) {
		case "iniciante":
			return "easy";
		case "intermediario":
			return "medium";
		case "avancado":
			return "hard";
		default:
			return difficulty;
	}
}

function normalizeAppointment(apiAppointment: ApiAppointment): ApiAppointment {
	return {
		...apiAppointment,
		patientId: apiAppointment.patientId ?? apiAppointment.patient_id,
		therapistId: apiAppointment.therapistId ?? apiAppointment.therapist_id,
		organizationId:
			apiAppointment.organizationId ?? apiAppointment.organization_id,
		startTime: apiAppointment.startTime ?? apiAppointment.start_time,
		endTime: apiAppointment.endTime ?? apiAppointment.end_time,
		isGroup: apiAppointment.isGroup ?? apiAppointment.is_group,
		additionalNames:
			apiAppointment.additionalNames ?? apiAppointment.additional_names,
		isUnlimited: apiAppointment.isUnlimited ?? apiAppointment.is_unlimited,
	};
}

function normalizeAppointmentPayload(
	data: Partial<ApiAppointment>,
): Record<string, unknown> {
	return cleanRequestData({
		...data,
		patient_id: data.patient_id ?? data.patientId,
		therapist_id: data.therapist_id ?? data.therapistId,
		organization_id: data.organization_id ?? data.organizationId,
		start_time: data.start_time ?? data.startTime,
		end_time: data.end_time ?? data.endTime,
		is_group: data.is_group ?? (data as any).isGroup,
		additional_names: data.additional_names ?? (data as any).additionalNames,
		is_unlimited: data.is_unlimited ?? (data as any).isUnlimited,
	});
}

function normalizeExercise(apiExercise: any): ApiExercise {
	return {
		...apiExercise,
		category:
			apiExercise.category ??
			apiExercise.categoryName ??
			apiExercise.categoryId ??
			"Geral",
		difficulty: normalizeExerciseDifficulty(apiExercise.difficulty),
		image_url: apiExercise.image_url ?? apiExercise.imageUrl,
		imageUrl: apiExercise.imageUrl ?? apiExercise.image_url,
		video_url: apiExercise.video_url ?? apiExercise.videoUrl,
		videoUrl: apiExercise.videoUrl ?? apiExercise.video_url,
		created_at: apiExercise.created_at ?? apiExercise.createdAt,
		createdAt: apiExercise.createdAt ?? apiExercise.created_at,
		updated_at: apiExercise.updated_at ?? apiExercise.updatedAt,
		updatedAt: apiExercise.updatedAt ?? apiExercise.updated_at,
		instructions: Array.isArray(apiExercise.instructions)
			? apiExercise.instructions
			: [],
		embeddingSketch: apiExercise.embeddingSketch ?? apiExercise.embedding_sketch,
		referencePose: apiExercise.referencePose ?? apiExercise.reference_pose,
	};
}

function normalizeEvolution(apiEvolution: any): ApiEvolution {
	const normalized: ApiEvolution = {
		...apiEvolution,
		id: String(apiEvolution.id),
		patient_id: String(apiEvolution.patient_id ?? apiEvolution.patientId ?? ""),
		therapist_id: String(
			apiEvolution.therapist_id ??
				apiEvolution.therapistId ??
				apiEvolution.created_by ??
				"",
		),
		appointment_id: apiEvolution.appointment_id ?? apiEvolution.appointmentId,
		date:
			apiEvolution.date ??
			apiEvolution.session_date ??
			apiEvolution.record_date ??
			apiEvolution.created_at ??
			new Date().toISOString(),
		subjective: apiEvolution.subjective ?? apiEvolution.chief_complaint ?? "",
		objective:
			typeof apiEvolution.objective === "string"
				? apiEvolution.objective
				: apiEvolution.objective
					? JSON.stringify(apiEvolution.objective)
					: "",
		assessment: apiEvolution.assessment ?? apiEvolution.medical_history ?? "",
		plan: apiEvolution.plan ?? apiEvolution.lifestyle_habits ?? "",
		pain_level:
			apiEvolution.pain_level ??
			apiEvolution.painLevel ??
			apiEvolution.pain_level_after ??
			apiEvolution.pain_level_before ??
			0,
		attachments: Array.isArray(apiEvolution.attachments)
			? apiEvolution.attachments
			: [],
		observations: apiEvolution.observations,
		exercises_performed: Array.isArray(apiEvolution.exercises_performed)
			? apiEvolution.exercises_performed
			: [],
		pain_level_before: apiEvolution.pain_level_before,
		pain_level_after: apiEvolution.pain_level_after,
		created_at:
			apiEvolution.created_at ?? apiEvolution.date ?? new Date().toISOString(),
		updated_at:
			apiEvolution.updated_at ??
			apiEvolution.created_at ??
			new Date().toISOString(),
	};

	return normalized;
}

function normalizeConversation(rawConversation: any): ApiConversation {
	const participantId =
		rawConversation.participantId ??
		rawConversation.participant_id ??
		rawConversation.participantIds?.find(
			(id: unknown) => typeof id === "string" && id !== rawConversation.id,
		) ??
		rawConversation.id;

	const participantName =
		rawConversation.participantName ??
		rawConversation.participant_name ??
		rawConversation.participantNames?.[participantId] ??
		rawConversation.participant_short_name ??
		"Usuário";

	const lastMessage =
		typeof rawConversation.lastMessage === "string"
			? rawConversation.lastMessage
			: (rawConversation.lastMessage?.content ??
				rawConversation.last_message_content ??
				"");

	const lastMessageAt =
		rawConversation.lastMessageAt ??
		rawConversation.last_message_at ??
		rawConversation.lastMessage?.createdAt ??
		rawConversation.lastMessage?.created_at ??
		rawConversation.updatedAt ??
		rawConversation.updated_at;

	const unreadCount =
		typeof rawConversation.unreadCount === "number"
			? rawConversation.unreadCount
			: (rawConversation.unreadCount?.[participantId] ??
				rawConversation.unread_count ??
				0);

	return {
		...rawConversation,
		id: String(rawConversation.id ?? participantId),
		participantId: String(participantId),
		participantName: String(participantName),
		lastMessage,
		lastMessageAt,
		unreadCount: Number(unreadCount),
		updatedAt:
			rawConversation.updatedAt ?? rawConversation.updated_at ?? lastMessageAt,
	};
}

function normalizeMessage(rawMessage: any): ApiMessage {
	return {
		...rawMessage,
		id: String(rawMessage.id),
		sender_id: String(rawMessage.sender_id ?? rawMessage.senderId ?? ""),
		senderId: String(rawMessage.senderId ?? rawMessage.sender_id ?? ""),
		recipient_id: String(
			rawMessage.recipient_id ?? rawMessage.recipientId ?? "",
		),
		recipientId: String(
			rawMessage.recipientId ?? rawMessage.recipient_id ?? "",
		),
		attachment_url:
			rawMessage.attachment_url ?? rawMessage.attachmentUrl ?? null,
		attachmentUrl:
			rawMessage.attachmentUrl ?? rawMessage.attachment_url ?? null,
		attachment_name:
			rawMessage.attachment_name ?? rawMessage.attachmentName ?? null,
		attachmentName:
			rawMessage.attachmentName ?? rawMessage.attachment_name ?? null,
		read_at: rawMessage.read_at ?? rawMessage.readAt ?? null,
		readAt: rawMessage.readAt ?? rawMessage.read_at ?? null,
		created_at:
			rawMessage.created_at ?? rawMessage.createdAt ?? new Date().toISOString(),
		createdAt:
			rawMessage.createdAt ?? rawMessage.created_at ?? new Date().toISOString(),
	};
}

function normalizeChecklist(rawChecklist: any) {
	return {
		id: String(rawChecklist.id),
		title: String(rawChecklist.title ?? ""),
		items: Array.isArray(rawChecklist.items)
			? rawChecklist.items.map((item: any) => ({
					id: String(item.id),
					text: String(item.text ?? ""),
					completed: Boolean(item.completed),
				}))
			: [],
	};
}

function normalizeTarefa(rawTarefa: any): ApiTarefa {
	return {
		...rawTarefa,
		id: String(rawTarefa.id),
		tags: Array.isArray(rawTarefa.tags) ? rawTarefa.tags : [],
		checklists: Array.isArray(rawTarefa.checklists)
			? rawTarefa.checklists.map(normalizeChecklist)
			: [],
		attachments: Array.isArray(rawTarefa.attachments)
			? rawTarefa.attachments
			: [],
		references: Array.isArray(rawTarefa.references)
			? rawTarefa.references
			: Array.isArray(rawTarefa.task_references)
				? rawTarefa.task_references
				: [],
		dependencies: Array.isArray(rawTarefa.dependencies)
			? rawTarefa.dependencies
			: [],
	};
}

function normalizeLead(rawLead: any): ApiLead {
	return {
		...rawLead,
		id: String(rawLead.id),
		created_at: rawLead.created_at ?? new Date().toISOString(),
		updated_at: rawLead.updated_at ?? new Date().toISOString(),
	};
}

// ============================================================
// AUTH TOKEN
// ============================================================

async function getAuthToken(): Promise<string> {
	const token = await getToken();
	if (!token) {
		throw new Error("User not authenticated");
	}
	return token;
}

// ============================================================
// FETCH HELPERS
// ============================================================

function cleanRequestData(data: any): any {
	if (Array.isArray(data)) {
		return data.map((item) => cleanRequestData(item));
	}
	if (typeof data !== "object" || data === null) {
		return data;
	}
	const cleaned: Record<string, any> = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== undefined) {
			cleaned[key] =
				typeof value === "object" && value !== null
					? cleanRequestData(value)
					: value;
		}
	}
	return cleaned;
}

interface FetchOptions extends RequestInit {
	data?: any;
	params?: Record<string, string | number | boolean | undefined>;
	timeout?: number;
	skipAuth?: boolean;
}

export async function fetchApi<T>(
	endpoint: string,
	options: FetchOptions = {},
): Promise<T> {
	const token = options.skipAuth ? null : await getAuthToken();
	const { data, params, timeout = 10000, ...fetchInit } = options;

	let baseUrl = config.apiUrl;
	if (baseUrl.endsWith("/") && endpoint.startsWith("/")) {
		baseUrl = baseUrl.slice(0, -1);
	} else if (!baseUrl.endsWith("/") && !endpoint.startsWith("/")) {
		baseUrl = baseUrl + "/";
	}

	if (baseUrl.endsWith("/api") && endpoint.startsWith("/api")) {
		baseUrl = baseUrl.slice(0, -4);
	}

	let url = `${baseUrl}${endpoint}`;

	if (params) {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined) {
				searchParams.append(key, String(value));
			}
		});
		const queryString = searchParams.toString();
		if (queryString) {
			url += `?${queryString}`;
		}
	}

	const method = fetchInit.method || (data ? "POST" : "GET");
	const headers: HeadersInit = {
		"Content-Type": "application/json",
	};

	if (token) {
		(headers as any)["Authorization"] = `Bearer ${token.trim()}`;
	}

	if (fetchInit.headers) {
		Object.assign(headers, fetchInit.headers);
	}

	const body = data ? JSON.stringify(cleanRequestData(data)) : undefined;

	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...fetchInit,
			method,
			headers,
			body,
			signal: controller.signal,
		});
		clearTimeout(id);

		if (!response.ok) {
			let errorMessage = `HTTP ${response.status}`;
			try {
				const errorJson = await response.json();
				errorMessage = errorJson.error || errorJson.message || errorMessage;
			} catch {
				// Silently fail json parse
			}
			throw new ApiError(endpoint, response.status, errorMessage);
		}

		return (await response.json()) as T;
	} catch (error: any) {
		clearTimeout(id);
		if (error.name === "AbortError") {
			throw new Error("Tempo de conexão esgotado (timeout)");
		}
		throw error;
	}
}

// ============================================================
// DASHBOARD API
// ============================================================
export async function getDashboardStats(
	organizationId?: string,
): Promise<ApiDashboardStats> {
	try {
		const response = await fetchApi<ApiResponse<ApiDashboardStats>>(
			"/api/insights/dashboard",
			{
				params: { organizationId },
			},
		);
		return (
			response.data || {
				activePatients: 0,
				todayAppointments: 0,
				pendingAppointments: 0,
				completedAppointments: 0,
			}
		);
	} catch (error) {
		console.error("[getDashboardStats] Error:", error);
		return {
			activePatients: 0,
			todayAppointments: 0,
			pendingAppointments: 0,
			completedAppointments: 0,
		};
	}
}

// ============================================================
// PATIENTS API
// ============================================================

export async function getPatients(
	organizationId?: string,
	options?: { status?: string; search?: string; limit?: number },
): Promise<ApiPatient[]> {
	const response = await fetchApi<ApiResponse<ApiPatient[]>>("/api/patients", {
		params: {
			organizationId,
			status: options?.status,
			search: options?.search,
			limit: options?.limit || 100,
		},
	});
	return response.data || [];
}

export async function getPatientById(id: string): Promise<ApiPatient> {
	const response = await fetchApi<ApiResponse<ApiPatient>>(
		`/api/patients/${encodeURIComponent(id)}`,
	);
	if (!response.data) throw new Error("Paciente não encontrado");
	return response.data;
}

export async function createPatient(
	data: Partial<ApiPatient>,
): Promise<ApiPatient> {
	const response = await fetchApi<ApiResponse<ApiPatient>>("/api/patients", {
		method: "POST",
		data,
	});
	if (response.error) throw new Error(response.error);
	return response.data;
}

export async function updatePatient(
	id: string,
	data: Partial<ApiPatient>,
): Promise<ApiPatient> {
	const response = await fetchApi<ApiResponse<ApiPatient>>(
		`/api/patients/${encodeURIComponent(id)}`,
		{
			method: "PUT",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	return response.data;
}

export async function deletePatient(id: string): Promise<{ success: boolean }> {
	return fetchApi<{ success: boolean }>(
		`/api/patients/${encodeURIComponent(id)}`,
		{ method: "DELETE" },
	);
}

// ============================================================
// APPOINTMENTS API
// ============================================================

export async function getAppointments(
	organizationId?: string,
	options?: {
		dateFrom?: string;
		dateTo?: string;
		therapistId?: string;
		status?: string;
		patientId?: string;
		limit?: number;
	},
): Promise<ApiAppointment[]> {
	const response = await fetchApi<ApiResponse<ApiAppointment[]>>(
		"/api/appointments",
		{
			params: {
				organizationId,
				dateFrom: options?.dateFrom,
				dateTo: options?.dateTo,
				therapistId: options?.therapistId,
				status: options?.status,
				patientId: options?.patientId,
				limit: options?.limit || 100,
			},
		},
	);
	return (response.data || []).map(normalizeAppointment);
}

export async function getAppointmentById(id: string): Promise<ApiAppointment> {
	const response = await fetchApi<ApiResponse<ApiAppointment>>(
		`/api/appointments/${encodeURIComponent(id)}`,
	);
	if (!response.data) throw new Error("Agendamento não encontrado");
	return normalizeAppointment(response.data);
}

export async function createAppointment(
	data: Partial<ApiAppointment>,
): Promise<ApiAppointment> {
	const response = await fetchApi<ApiResponse<ApiAppointment>>(
		"/api/appointments",
		{
			method: "POST",
			data: normalizeAppointmentPayload(data),
		},
	);
	if (response.error) throw new Error(response.error);
	return normalizeAppointment(response.data);
}

export async function updateAppointment(
	id: string,
	data: Partial<ApiAppointment>,
): Promise<ApiAppointment> {
	const response = await fetchApi<ApiResponse<ApiAppointment>>(
		`/api/appointments/${encodeURIComponent(id)}`,
		{
			method: "PATCH",
			data: normalizeAppointmentPayload(data),
		},
	);
	if (response.error) throw new Error(response.error);
	return normalizeAppointment(response.data);
}

export async function cancelAppointment(
	id: string,
	reason?: string,
): Promise<{ success: boolean }> {
	return fetchApi<{ success: boolean }>(
		`/api/appointments/${encodeURIComponent(id)}/cancel`,
		{
			method: "POST",
			data: { reason },
		},
	);
}

// ============================================================
// EXERCISES API
// ============================================================

export async function getExercises(options?: {
	category?: string;
	difficulty?: string;
	search?: string;
	bodyPart?: string;
	equipment?: string;
	page?: number;
	limit?: number;
	favorites?: string;
}): Promise<{
	data: ApiExercise[];
	meta: { total: number; pages: number; page: number; limit: number };
}> {
	const response = await fetchApi<
		ApiResponse<{ data: ApiExercise[]; meta: any }>
	>("/api/exercises", {
		params: {
			category: options?.category,
			difficulty: options?.difficulty,
			bodyPart: options?.bodyPart,
			equipment: options?.equipment,
			q: options?.search,
			page: options?.page,
			limit: options?.limit || 100,
			favorites: options?.favorites,
		},
	});

	const data = (response.data?.data || []).map(normalizeExercise);
	const meta = response.data?.meta || {
		total: data.length,
		pages: 1,
		page: options?.page || 1,
		limit: options?.limit || 100,
	};

	return { data, meta };
}

export async function getExerciseById(id: string): Promise<ApiExercise> {
	const response = await fetchApi<ApiResponse<ApiExercise>>(
		`/api/exercises/${encodeURIComponent(id)}`,
	);
	if (!response.data) throw new Error("Exercício não encontrado");
	return normalizeExercise(response.data);
}

export async function createExercise(
	data: Partial<ApiExercise>,
): Promise<ApiExercise> {
	const response = await fetchApi<ApiResponse<ApiExercise>>("/api/exercises", {
		method: "POST",
		data: cleanRequestData({
			...data,
			imageUrl: data.imageUrl ?? data.image_url,
			videoUrl: data.videoUrl ?? data.video_url,
		}),
	});
	if (response.error) throw new Error(response.error);
	return normalizeExercise(response.data);
}

export async function updateExercise(
	id: string,
	data: Partial<ApiExercise>,
): Promise<ApiExercise> {
	const response = await fetchApi<ApiResponse<ApiExercise>>(
		`/api/exercises/${encodeURIComponent(id)}`,
		{
			method: "PUT",
			data: cleanRequestData({
				...data,
				imageUrl: data.imageUrl ?? data.image_url,
				videoUrl: data.videoUrl ?? data.video_url,
			}),
		},
	);
	if (response.error) throw new Error(response.error);
	return normalizeExercise(response.data);
}

export async function deleteExercise(id: string): Promise<{ ok: boolean }> {
	return fetchApi<{ ok: boolean }>(`/api/exercises/${encodeURIComponent(id)}`, {
		method: "DELETE",
	});
}

export async function favoriteExercise(id: string): Promise<{ ok: boolean }> {
	return fetchApi<{ ok: boolean }>(
		`/api/exercises/${encodeURIComponent(id)}/favorite`,
		{
			method: "POST",
		},
	);
}

export async function unfavoriteExercise(id: string): Promise<{ ok: boolean }> {
	return fetchApi<{ ok: boolean }>(
		`/api/exercises/${encodeURIComponent(id)}/favorite`,
		{
			method: "DELETE",
		},
	);
}

export async function getMyFavoriteExercises(): Promise<ApiExercise[]> {
	const response = await fetchApi<ApiResponse<ApiExercise[]>>(
		"/api/exercises/favorites/me",
	);
	return (response.data || []).map(normalizeExercise);
}

// ============================================================
// EVOLUTIONS API
// ============================================================

export async function getEvolutions(
	patientId: string,
): Promise<ApiEvolution[]> {
	const response = await fetchApi<ApiResponse<ApiEvolution[]>>(
		"/api/evolution/treatment-sessions",
		{
			params: { patientId, limit: 100 },
		},
	);
	return (response.data || []).map(normalizeEvolution);
}

export async function getEvolutionById(
	id: string,
): Promise<ApiEvolution | null> {
	try {
		const response = await fetchApi<ApiResponse<ApiEvolution>>(
			`/api/evolution/treatment-sessions/${encodeURIComponent(id)}`,
		);
		if (!response.data) return null;
		return normalizeEvolution(response.data);
	} catch {
		return null;
	}
}

export async function createEvolution(
	data: Partial<ApiEvolution>,
): Promise<ApiEvolution> {
	if (!data.patient_id) {
		throw new Error("patient_id é obrigatório");
	}

	// Sempre usa treatment-sessions — appointment_id é opcional no worker
	const response = await fetchApi<ApiResponse<ApiEvolution>>(
		"/api/evolution/treatment-sessions",
		{
			method: "POST",
			data: {
				patient_id: data.patient_id,
				therapist_id: data.therapist_id,
				appointment_id: data.appointment_id ?? null,
				session_date: data.date,
				subjective: data.subjective,
				objective: data.objective,
				assessment: data.assessment,
				plan: data.plan,
				exercises_performed: data.exercises_performed ?? [],
				pain_level_before: data.pain_level_before ?? data.pain_level ?? 0,
				pain_level_after: data.pain_level_after ?? data.pain_level ?? 0,
				attachments: data.attachments ?? [],
			},
		},
	);

	if (response.error) throw new Error(response.error);
	return normalizeEvolution(response.data);
}

export async function updateEvolution(
	id: string,
	data: Partial<ApiEvolution>,
): Promise<ApiEvolution> {
	// Usa PATCH /treatment-sessions/:id diretamente pelo ID
	const response = await fetchApi<ApiResponse<ApiEvolution>>(
		`/api/evolution/treatment-sessions/${encodeURIComponent(id)}`,
		{
			method: "PATCH",
			data: {
				subjective: data.subjective,
				objective: data.objective,
				assessment: data.assessment,
				plan: data.plan,
				observations: data.observations,
				pain_level_before: data.pain_level_before ?? data.pain_level,
				pain_level_after: data.pain_level_after ?? data.pain_level,
				session_date: data.date,
				attachments: data.attachments ?? [],
			},
		},
	);

	if (response.error) throw new Error(response.error);
	return normalizeEvolution(response.data);
}

export async function deleteEvolution(id: string): Promise<{ ok: boolean }> {
	const response = await fetchApi<{ ok?: boolean }>(
		`/api/evolution/treatment-sessions/${encodeURIComponent(id)}`,
		{ method: "DELETE" },
	);
	return { ok: Boolean(response.ok) };
}

export async function duplicateEvolution(id: string): Promise<ApiEvolution> {
	const source = await getEvolutionById(id);
	if (!source || !source.patient_id) {
		throw new Error("Evolução original não encontrada");
	}

	return createEvolution({
		patient_id: source.patient_id,
		date: new Date().toISOString(),
		subjective: source.subjective,
		objective: source.objective,
		assessment: source.assessment,
		plan: source.plan,
		pain_level_before: source.pain_level_before,
		pain_level_after: source.pain_level_after,
		pain_level: source.pain_level,
		attachments: source.attachments ?? [],
		exercises_performed: source.exercises_performed ?? [],
	});
}

// ============================================================
// TAREFAS API
// ============================================================

export async function getTarefas(params?: any): Promise<ApiTarefa[]> {
	const response = await fetchApi<ApiResponse<ApiTarefa[]>>("/api/tarefas", {
		params,
	});
	return (response.data || []).map(normalizeTarefa);
}

export async function createTarefa(
	data: Partial<ApiTarefa>,
): Promise<ApiTarefa> {
	const response = await fetchApi<ApiResponse<ApiTarefa>>("/api/tarefas", {
		method: "POST",
		data,
	});
	if (response.error) throw new Error(response.error);
	return normalizeTarefa(response.data);
}

export async function updateTarefa(
	id: string,
	data: Partial<ApiTarefa>,
): Promise<ApiTarefa> {
	const response = await fetchApi<ApiResponse<ApiTarefa>>(
		`/api/tarefas/${encodeURIComponent(id)}`,
		{
			method: "PATCH",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	return normalizeTarefa(response.data);
}

export async function deleteTarefa(id: string): Promise<{ ok?: boolean }> {
	return fetchApi<{ ok?: boolean }>(`/api/tarefas/${encodeURIComponent(id)}`, {
		method: "DELETE",
	});
}

export async function bulkUpdateTarefas(
	updates: Array<{ id: string; data: Partial<ApiTarefa> }>,
): Promise<{ ok?: boolean }> {
	const payload = updates.map(({ id, data }) => ({
		id,
		status: data.status,
		order_index: data.order_index,
	}));

	return fetchApi<{ ok?: boolean }>("/api/tarefas/bulk", {
		method: "POST",
		data: { updates: payload },
	});
}

// ============================================================
// MESSAGING API
// ============================================================

export async function getConversations(): Promise<ApiConversation[]> {
	const response = await fetchApi<ApiResponse<ApiConversation[]>>(
		"/api/messaging/conversations",
	);
	return (response.data || []).map(normalizeConversation);
}

export async function getConversationMessages(
	participantId: string,
): Promise<ApiMessage[]> {
	const response = await fetchApi<ApiResponse<ApiMessage[]>>(
		`/api/messaging/conversations/${encodeURIComponent(participantId)}/messages`,
	);
	return (response.data || []).map(normalizeMessage);
}

export async function sendMessage(
	participantId: string,
	content: string,
): Promise<ApiMessage> {
	const response = await fetchApi<ApiResponse<ApiMessage>>(
		"/api/messaging/messages",
		{
			method: "POST",
			data: { recipientId: participantId, content },
		},
	);
	return normalizeMessage(response.data);
}

export async function markAsRead(
	participantId: string,
): Promise<{ success?: boolean }> {
	return fetchApi<{ success?: boolean }>(
		`/api/messaging/conversations/${encodeURIComponent(participantId)}/read`,
		{ method: "POST" },
	);
}

export async function getPartnerships(options?: {
	activeOnly?: boolean;
}): Promise<ApiPartnership[]> {
	const response = await fetchApi<ApiResponse<ApiPartnership[]>>(
		"/api/contratados",
		{
			params: options?.activeOnly ? { active: true } : undefined,
		},
	);
	return response.data || [];
}

export async function getPartnershipById(
	id: string,
): Promise<ApiPartnership | null> {
	const response = await fetchApi<ApiResponse<ApiPartnership>>(
		`/api/contratados/${encodeURIComponent(id)}`,
	);
	return response.data ?? null;
}

export async function createPartnership(
	data: Partial<ApiPartnership>,
): Promise<ApiPartnership> {
	const response = await fetchApi<ApiResponse<ApiPartnership>>(
		"/api/contratados",
		{
			method: "POST",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	if (!response.data) throw new Error("Resposta inválida ao criar parceria");
	return response.data;
}

export async function updatePartnership(
	id: string,
	data: Partial<ApiPartnership>,
): Promise<ApiPartnership> {
	const response = await fetchApi<ApiResponse<ApiPartnership>>(
		`/api/contratados/${encodeURIComponent(id)}`,
		{
			method: "PUT",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	if (!response.data)
		throw new Error("Resposta inválida ao atualizar parceria");
	return response.data;
}

export async function deletePartnership(id: string): Promise<{ ok: boolean }> {
	await fetchApi(`/api/contratados/${encodeURIComponent(id)}`, {
		method: "DELETE",
	});
	return { ok: true };
}

// ============================================================
// CRM API
// ============================================================

export interface ApiLead {
	id: string;
	organization_id?: string;
	nome: string;
	full_name?: string;
	email?: string | null;
	phone?: string | null;
	telefone?: string | null;
	interesse?: string | null;
	estagio:
		| "aguardando"
		| "contatado"
		| "interessado"
		| "agendado"
		| "convertido"
		| "perdido";
	status?: string | null;
	origem?: string | null;
	source?: string | null;
	notes?: string | null;
	assigned_to?: string | null;
	created_at: string;
	updated_at: string;
	[key: string]: unknown;
}

export interface ApiLeadHistory {
	id: string;
	lead_id: string;
	action: string;
	description?: string | null;
	created_by?: string | null;
	created_at: string;
	[key: string]: unknown;
}

export interface ApiTelemedicineRoom {
	id: string;
	organization_id?: string;
	patient_id: string;
	patient_name?: string | null;
	room_name: string;
	livekit_token?: string | null;
	status: "waiting" | "active" | "ended";
	started_at?: string | null;
	ended_at?: string | null;
	created_at: string;
	[key: string]: unknown;
}

export async function getLeads(params?: any): Promise<ApiLead[]> {
	const response = await fetchApi<ApiResponse<ApiLead[]>>("/api/crm/leads", {
		params,
	});
	return (response.data || []).map(normalizeLead);
}

export async function getLeadById(id: string): Promise<ApiLead> {
	const response = await fetchApi<ApiResponse<ApiLead>>(
		`/api/crm/leads/${encodeURIComponent(id)}`,
	);
	if (response.error) throw new Error(response.error);
	return normalizeLead(response.data);
}

export async function createLead(data: Partial<ApiLead>): Promise<ApiLead> {
	const response = await fetchApi<ApiResponse<ApiLead>>("/api/crm/leads", {
		method: "POST",
		data,
	});
	if (response.error) throw new Error(response.error);
	return normalizeLead(response.data);
}

export async function updateLead(
	id: string,
	data: Partial<ApiLead>,
): Promise<ApiLead> {
	const response = await fetchApi<ApiResponse<ApiLead>>(
		`/api/crm/leads/${encodeURIComponent(id)}`,
		{
			method: "PUT",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	return normalizeLead(response.data);
}

export async function deleteLead(id: string): Promise<{ ok: boolean }> {
	const response = await fetchApi<{ ok: boolean }>(
		`/api/crm/leads/${encodeURIComponent(id)}`,
		{
			method: "DELETE",
		},
	);
	return { ok: response.ok };
}

export async function getLeadHistory(
	leadId: string,
): Promise<ApiLeadHistory[]> {
	const response = await fetchApi<ApiResponse<ApiLeadHistory[]>>(
		`/api/crm/leads/${encodeURIComponent(leadId)}/historico`,
	);
	return response.data || [];
}

export async function createLeadHistory(
	leadId: string,
	data: Partial<ApiLeadHistory>,
): Promise<ApiLeadHistory> {
	const response = await fetchApi<ApiResponse<ApiLeadHistory>>(
		`/api/crm/leads/${encodeURIComponent(leadId)}/historico`,
		{
			method: "POST",
			data,
		},
	);
	if (response.error) throw new Error(response.error);
	return response.data;
}

// ============================================================
// GAMIFICATION API (PRO)
// ============================================================

export interface ApiLeaderboardEntry {
	id: string;
	patient_id: string;
	full_name: string;
	level: number;
	total_points: number;
	current_streak: number;
}

export async function getLeaderboard(params?: {
	period?: "weekly" | "monthly" | "all";
	limit?: number;
}): Promise<ApiLeaderboardEntry[]> {
	const response = await fetchApi<ApiResponse<ApiLeaderboardEntry[]>>(
		"/api/gamification/leaderboard",
		{
			params,
		},
	);
	return response.data || [];
}

// ============================================================
// TELEMEDICINE API
// ============================================================

export async function getTelemedicineRooms(): Promise<ApiTelemedicineRoom[]> {
	const response = await fetchApi<ApiResponse<ApiTelemedicineRoom[]>>(
		"/api/telemedicine/rooms",
	);
	return response.data || [];
}

export async function createTelemedicineRoom(
	patientId: string,
): Promise<ApiTelemedicineRoom> {
	const response = await fetchApi<ApiResponse<ApiTelemedicineRoom>>(
		"/api/telemedicine/rooms",
		{
			method: "POST",
			data: { patient_id: patientId },
		},
	);
	if (response.error) throw new Error(response.error);
	return response.data;
}

export async function startTelemedicineRoom(
	id: string,
): Promise<ApiTelemedicineRoom> {
	const response = await fetchApi<ApiResponse<ApiTelemedicineRoom>>(
		`/api/telemedicine/rooms/${encodeURIComponent(id)}/start`,
		{
			method: "POST",
		},
	);
	if (response.error) throw new Error(response.error);
	return response.data;
}

// ============================================================
// PATIENT FINANCIAL RECORDS API
// ============================================================

export interface ApiFinancialRecord {
	id: string;
	organization_id: string;
	patient_id: string;
	appointment_id?: string;
	session_date: string;
	session_value: number;
	discount_value: number;
	discount_type?: "percentage" | "fixed" | "partnership";
	partnership_id?: string;
	partnership?: {
		name: string;
		discount_type: string;
		discount_value: number;
	};
	final_value: number;
	payment_method?: string;
	payment_status: string;
	paid_amount: number;
	paid_date?: string;
	notes?: string;
	is_barter: boolean;
	barter_notes?: string;
	created_by?: string;
	created_at: string;
	updated_at: string;
	patient_name?: string;
}

function mapDbRecordToApiRecord(dbRecord: any): ApiFinancialRecord {
	return {
		id: dbRecord.id,
		organization_id: dbRecord.organization_id,
		patient_id: dbRecord.patient_id,
		appointment_id: dbRecord.appointment_id,
		session_date:
			dbRecord.data_vencimento || dbRecord.created_at?.split("T")[0],
		session_value: Number(dbRecord.valor),
		discount_value: 0,
		discount_type: undefined,
		partnership_id: undefined,
		final_value: Number(dbRecord.valor),
		payment_method: dbRecord.forma_pagamento,
		payment_status: dbRecord.status === "concluido" ? "paid" : "pending",
		paid_amount: dbRecord.status === "concluido" ? Number(dbRecord.valor) : 0,
		paid_date: dbRecord.pago_em,
		notes: dbRecord.observacoes,
		is_barter: false,
		barter_notes: undefined,
		created_by: undefined,
		created_at: dbRecord.created_at,
		updated_at: dbRecord.updated_at,
		patient_name: dbRecord.patient_name,
	};
}

export interface ApiFinancialSummary {
	total_sessions: number;
	paid_sessions: number;
	pending_sessions: number;
	total_value: number;
	total_paid: number;
	total_pending: number;
	average_session_value: number;
}

export async function getPatientFinancialRecords(
	patientId: string,
	options?: { status?: string },
): Promise<ApiFinancialRecord[]> {
	const response = await fetchApi<ApiResponse<any[]>>(
		`/api/financial/contas?patientId=${patientId}${options?.status ? `&status=${options.status === "paid" ? "concluido" : "pendente"}` : ""}`,
	);
	return (response.data || []).map(mapDbRecordToApiRecord);
}

export async function getPatientFinancialSummary(
	patientId: string,
): Promise<ApiFinancialSummary> {
	const records = await getPatientFinancialRecords(patientId);

	const paidRecords = records.filter((r) => r.payment_status === "paid");
	const pendingRecords = records.filter((r) => r.payment_status === "pending");

	return {
		total_sessions: records.length,
		paid_sessions: paidRecords.length,
		pending_sessions: pendingRecords.length,
		total_value: records.reduce((sum, r) => sum + r.session_value, 0),
		total_paid: paidRecords.reduce((sum, r) => sum + r.final_value, 0),
		total_pending: pendingRecords.reduce((sum, r) => sum + r.final_value, 0),
		average_session_value:
			records.length > 0
				? records.reduce((sum, r) => sum + r.session_value, 0) / records.length
				: 0,
	};
}

export async function getAllFinancialRecords(options?: {
	startDate?: string;
	endDate?: string;
}): Promise<(ApiFinancialRecord & { patient_name: string })[]> {
	const params: string[] = [];
	if (options?.startDate) params.push(`dateFrom=${options.startDate}`);
	if (options?.endDate) params.push(`dateTo=${options.endDate}`);

	const queryString = params.length > 0 ? `?${params.join("&")}` : "";
	const response = await fetchApi<ApiResponse<any[]>>(
		`/api/financial/contas${queryString}`,
	);
	return (response.data || []).map(
		mapDbRecordToApiRecord,
	) as (ApiFinancialRecord & { patient_name: string })[];
}

export async function createFinancialRecord(data: {
	patient_id: string;
	session_date: string;
	session_value: number;
	payment_method?: string;
	notes?: string;
}): Promise<ApiFinancialRecord> {
	const response = await fetchApi<ApiResponse<any>>("/api/financial/contas", {
		method: "POST",
		data: {
			tipo: "receita",
			valor: data.session_value,
			status: "pendente",
			descricao: `Sessão em ${data.session_date}`,
			patient_id: data.patient_id,
			forma_pagamento: data.payment_method,
			observacoes: data.notes,
			data_vencimento: data.session_date.split("T")[0],
		},
	});
	if (response.error) throw new Error(response.error);
	return mapDbRecordToApiRecord(response.data);
}

export async function updateFinancialRecord(
	recordId: string,
	data: Partial<ApiFinancialRecord>,
): Promise<ApiFinancialRecord> {
	const updateData: any = {};

	if (data.payment_status !== undefined)
		updateData.status =
			data.payment_status === "paid" ? "concluido" : "pendente";
	if (data.payment_method !== undefined)
		updateData.forma_pagamento = data.payment_method;
	if (data.final_value !== undefined) updateData.valor = data.final_value;
	if (data.notes !== undefined) updateData.observacoes = data.notes;

	const response = await fetchApi<ApiResponse<any>>(
		`/api/financial/contas/${recordId}`,
		{
			method: "PUT",
			data: updateData,
		},
	);
	if (response.error) throw new Error(response.error);
	return mapDbRecordToApiRecord(response.data);
}

export async function deleteFinancialRecord(recordId: string): Promise<void> {
	await fetchApi<{ success: boolean }>(`/api/financial/contas/${recordId}`, {
		method: "DELETE",
	});
}

export async function markFinancialRecordAsPaid(
	recordId: string,
	paymentMethod: string,
	paidDate?: string,
): Promise<ApiFinancialRecord> {
	const response = await fetchApi<ApiResponse<any>>(
		`/api/financial/contas/${recordId}`,
		{
			method: "PUT",
			data: {
				status: "concluido",
				forma_pagamento: paymentMethod,
				pago_em: paidDate || new Date().toISOString().split("T")[0],
			},
		},
	);
	if (response.error) throw new Error(response.error);
	return mapDbRecordToApiRecord(response.data);
}

// ============================================================
// PROMS — ESCALAS CLÍNICAS VALIDADAS
// ============================================================

export interface ApiStandardizedTestResult {
	id: string;
	organization_id?: string;
	patient_id: string;
	scale_name: string;
	score: number;
	interpretation?: string | null;
	responses?: Record<string, unknown> | null;
	applied_at: string;
	applied_by?: string | null;
	session_id?: string | null;
	notes?: string | null;
	created_at?: string;
	updated_at?: string;
}

export async function getPatientStandardizedTests(
	patientId: string,
	options?: { scale?: string; limit?: number },
): Promise<ApiStandardizedTestResult[]> {
	const response = await fetchApi<ApiResponse<ApiStandardizedTestResult[]>>(
		"/api/standardized-tests",
		{ params: { patientId, scale: options?.scale, limit: options?.limit } },
	);
	return response.data || [];
}

export async function createStandardizedTestResult(
	data: Omit<ApiStandardizedTestResult, "id" | "created_at" | "updated_at">,
): Promise<ApiStandardizedTestResult> {
	const response = await fetchApi<ApiResponse<ApiStandardizedTestResult>>(
		"/api/standardized-tests",
		{ method: "POST", data },
	);
	if (response.error) throw new Error(response.error);
	return response.data;
}

// ============================================================
// HEP COMPLIANCE
// ============================================================

export interface ApiHEPComplianceData {
	planId: string;
	patientId: string;
	planName: string;
	totalDays: number;
	completedDays: number;
	rate: number;
	byExercise: Record<
		string,
		{ completed: number; total: number; rate: number }
	>;
	last14Days: Array<{ date: string; completed: boolean }>;
}

export async function getHEPCompliance(
	planId: string,
): Promise<ApiHEPComplianceData> {
	const response = await fetchApi<ApiResponse<ApiHEPComplianceData>>(
		`/api/exercise-plans/${encodeURIComponent(planId)}/compliance`,
	);
	if (!response.data) throw new Error("Dados de compliance não encontrados");
	return response.data;
}

export async function getPatientExercisePlans(
	patientId: string,
): Promise<Array<{ id: string; name: string; created_at: string }>> {
	const response = await fetchApi<
		ApiResponse<Array<{ id: string; name: string; created_at: string }>>
	>("/api/exercise-plans", { params: { patientId } });
	return response.data || [];
}

// ============================================================
// NFS-e — NOTA FISCAL DE SERVIÇO ELETRÔNICA
// ============================================================

export interface ApiNFSeRecord {
	id: string;
	patient_id?: string;
	appointment_id?: string;
	numero_nfse?: string;
	numero_rps: string;
	serie_rps: string;
	data_emissao: string;
	valor_servico: number;
	aliquota_iss: number;
	valor_iss?: number;
	status: "rascunho" | "enviado" | "autorizado" | "cancelado" | "erro";
	codigo_verificacao?: string;
	link_nfse?: string;
	tomador_nome?: string;
	created_at: string;
}

export async function getNFSeList(params?: {
	patientId?: string;
	month?: string;
	status?: string;
}): Promise<ApiNFSeRecord[]> {
	const response = await fetchApi<ApiResponse<ApiNFSeRecord[]>>("/api/nfse", {
		params: params as any,
	});
	return response.data || [];
}

export async function generateNFSe(data: {
	patient_id?: string;
	appointment_id?: string;
	valor_servico: number;
	discriminacao?: string;
	tomador_nome?: string;
	tomador_cpf_cnpj?: string;
}): Promise<ApiNFSeRecord> {
	const response = await fetchApi<ApiResponse<ApiNFSeRecord>>("/api/nfse", {
		method: "POST",
		data,
	});
	if (response.error) throw new Error(response.error);
	return response.data;
}

export async function cancelNFSe(id: string): Promise<void> {
	await fetchApi<{ success: boolean }>(
		`/api/nfse/${encodeURIComponent(id)}/cancel`,
		{
			method: "POST",
		},
	);
}

// ============================================================
// WIKI — BASE DE CONHECIMENTO
// ============================================================

export interface ApiWikiPage {
	id: string;
	organization_id?: string;
	title: string;
	content?: string;
	category_id?: string | null;
	category?: string | null;
	tags?: string[];
	author_id?: string;
	status: "published" | "draft" | "archived";
	view_count?: number;
	created_at: string;
	updated_at: string;
}

export async function getWikiPages(params?: {
	search?: string;
	category?: string;
	limit?: number;
}): Promise<ApiWikiPage[]> {
	const response = await fetchApi<ApiResponse<ApiWikiPage[]>>("/api/wiki", {
		params: params as any,
	});
	return response.data || [];
}

export async function getWikiPageById(id: string): Promise<ApiWikiPage> {
	const response = await fetchApi<ApiResponse<ApiWikiPage>>(
		`/api/wiki/${encodeURIComponent(id)}`,
	);
	if (!response.data) throw new Error("Página não encontrada");
	return response.data;
}

// ============================================================
// PATIENT DUPLICATE CHECK API
// ============================================================

export async function checkPatientNameDuplicate(
	name: string,
	organizationId?: string,
): Promise<{ duplicateExists: boolean }> {
	if (!name || name.trim().length < 3) {
		return { duplicateExists: false };
	}

	const response = await fetchApi<ApiResponse<{ duplicateExists: boolean }>>(
		"/api/patients/check-duplicate",
		{
			method: "POST",
			data: { name: name.trim(), organizationId },
		},
	);

	return { duplicateExists: response.data?.duplicateExists || false };
}

export { reportsApi } from "./api/reports";
export type { PdfReportRequest, PdfReportResponse } from "./api/reports";
