import { request } from "./base";
import type {
	SessionAttachment,
	SessionTemplate,
	GoalProfileRow,
	DoctorRecord,
	FeriadoRow,
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
