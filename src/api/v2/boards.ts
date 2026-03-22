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

export const tarefasApi = {
	list: (params?: { projectId?: string }) =>
		request<{ data: Record<string, unknown>[] }>(
			withQuery("/api/tarefas", params),
		),
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
