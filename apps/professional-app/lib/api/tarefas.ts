import { fetchApi } from "./client";
import type { ApiResponse, ApiTarefa } from "@/types/api";

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
