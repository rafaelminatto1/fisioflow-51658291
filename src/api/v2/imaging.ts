import { request } from "./base";
import { getWorkersApiUrl } from "@/lib/api/config";
import type { DicomStudyRecord } from "@/types/workers";

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

export type { DicomStudyRecord };

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
