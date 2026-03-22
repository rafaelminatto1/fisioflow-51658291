import { request } from "./base";
import type {
	ExerciseSessionRow,
	ExerciseSessionStats,
	TelemedicineRoomRecord,
} from "@/types/workers";

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
