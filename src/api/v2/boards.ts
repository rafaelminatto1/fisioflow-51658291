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

// ============================================================
// BOARD LABELS API
// ============================================================
export const boardLabelsApi = {
	list: (boardId: string) =>
		request<{ data: Record<string, unknown>[] }>(
			`/api/boards/${boardId}/labels`,
		),
	create: (
		boardId: string,
		data: { name: string; color: string; description?: string },
	) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/${boardId}/labels`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	update: (labelId: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/labels/${labelId}`,
			{ method: "PATCH", body: JSON.stringify(data) },
		),
	delete: (labelId: string) =>
		request<{ ok: boolean }>(`/api/boards/labels/${labelId}`, {
			method: "DELETE",
		}),
	reorder: (updates: Array<{ id: string; order_index: number }>) =>
		request<{ ok: boolean }>("/api/boards/labels/reorder", {
			method: "POST",
			body: JSON.stringify({ updates }),
		}),
};

// ============================================================
// BOARD CHECKLIST TEMPLATES API
// ============================================================
export const boardChecklistTemplatesApi = {
	list: (boardId: string) =>
		request<{ data: Record<string, unknown>[] }>(
			`/api/boards/${boardId}/checklist-templates`,
		),
	create: (
		boardId: string,
		data: {
			name: string;
			description?: string;
			items: unknown[];
			category?: string;
		},
	) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/${boardId}/checklist-templates`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	update: (templateId: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/checklist-templates/${templateId}`,
			{ method: "PATCH", body: JSON.stringify(data) },
		),
	delete: (templateId: string) =>
		request<{ ok: boolean }>(
			`/api/boards/checklist-templates/${templateId}`,
			{ method: "DELETE" },
		),
	use: (templateId: string) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/checklist-templates/${templateId}/use`,
			{ method: "POST" },
		),
};

// ============================================================
// BOARD AUTOMATIONS API
// ============================================================
export const boardAutomationsApi = {
	list: (boardId: string) =>
		request<{ data: Record<string, unknown>[] }>(
			`/api/boards/${boardId}/automations`,
		),
	create: (boardId: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/${boardId}/automations`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	update: (automationId: string, data: Record<string, unknown>) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/automations/${automationId}`,
			{ method: "PATCH", body: JSON.stringify(data) },
		),
	delete: (automationId: string) =>
		request<{ ok: boolean }>(
			`/api/boards/automations/${automationId}`,
			{ method: "DELETE" },
		),
	toggle: (automationId: string, isActive: boolean) =>
		request<{ data: Record<string, unknown> }>(
			`/api/boards/automations/${automationId}`,
			{ method: "PATCH", body: JSON.stringify({ is_active: isActive }) },
		),
};
