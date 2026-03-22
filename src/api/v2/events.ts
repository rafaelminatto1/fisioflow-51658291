import { request } from "./base";
import type {
	ChecklistItem,
	Contratado,
	Evento,
	EventoContratado,
	EventoTemplateRow,
	Participante,
	Prestador,
	PrestadoresMetrics,
	Sala,
	Servico,
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

const PRESTADORES_BASE = "/api/prestadores";

export type {
	ChecklistItem,
	Contratado,
	Evento,
	EventoContratado,
	EventoTemplateRow,
	Participante,
	Prestador,
	PrestadoresMetrics,
	Sala,
	Servico,
};

export const eventosApi = {
	list: (p?: {
		status?: string;
		categoria?: string;
		limit?: number;
		offset?: number;
	}) =>
		request<{ data: Evento[] }>(withQuery("/api/activities", p)),
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
			withQuery("/api/activity-contractors", p),
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
		request<{ data: Participante[] }>(withQuery("/api/participantes", p)),
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
