import { request } from "./base";

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
