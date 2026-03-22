import { request } from "./base";

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
