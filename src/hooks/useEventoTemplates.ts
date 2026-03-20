/**
 * useEventoTemplates - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	checklistApi,
	eventoTemplatesApi,
	eventosApi,
	type EventoTemplateRow,
} from "@/lib/api/workers-client";

export type EventoTemplate = EventoTemplateRow;

export function useEventoTemplates() {
	return useQuery({
		queryKey: ["evento-templates"],
		queryFn: async () => {
			const res = await eventoTemplatesApi.list();
			return (res?.data ?? []) as EventoTemplate[];
		},
	});
}

export function useCreateTemplateFromEvento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			eventoId,
			nome,
		}: {
			eventoId: string;
			nome: string;
		}) => {
			const [eventoRes, checklistRes] = await Promise.all([
				eventosApi.get(eventoId),
				checklistApi.list(eventoId),
			]);

			const evento = eventoRes.data;
			if (!evento) throw new Error("Evento não encontrado");

			const checklistItems = (checklistRes?.data ?? []).map((item) => ({
				titulo: item.titulo,
				tipo: item.tipo,
				quantidade: item.quantidade,
				custo_unitario: item.custo_unitario,
			}));

			const res = await eventoTemplatesApi.create({
				nome,
				descricao: evento.descricao ?? null,
				categoria: evento.categoria ?? null,
				gratuito: evento.gratuito ?? false,
				valor_padrao_prestador: evento.valor_padrao_prestador ?? null,
				checklist_padrao: checklistItems,
			});

			return (res?.data ?? res) as EventoTemplate;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["evento-templates"] });
			toast.success("Template criado com sucesso");
		},
		onError: () => {
			toast.error("Erro ao criar template");
		},
	});
}

export function useCreateEventoFromTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			templateId,
			nomeEvento,
			dataInicio,
			dataFim,
			local,
		}: {
			templateId: string;
			nomeEvento: string;
			dataInicio: string;
			dataFim: string;
			local: string;
		}) => {
			const templateRes = await eventoTemplatesApi.get(templateId);
			const template = templateRes.data;
			if (!template) throw new Error("Template não encontrado");

			const eventoRes = await eventosApi.create({
				nome: nomeEvento,
				descricao: template.descricao ?? undefined,
				categoria: template.categoria ?? undefined,
				local,
				data_inicio: dataInicio,
				data_fim: dataFim,
				gratuito: template.gratuito,
				valor_padrao_prestador: template.valor_padrao_prestador ?? undefined,
			});

			const evento = eventoRes.data;

			const checklistItems = Array.isArray(template.checklist_padrao)
				? template.checklist_padrao
				: [];

			await Promise.all(
				checklistItems.map((item) =>
					checklistApi.create({
						evento_id: evento.id,
						titulo: String(item.titulo ?? ""),
						tipo: String(item.tipo ?? "levar") as
							| "levar"
							| "alugar"
							| "comprar",
						quantidade: Number(item.quantidade ?? 1),
						custo_unitario: Number(item.custo_unitario ?? 0),
					}),
				),
			);

			return evento;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["eventos"] });
			toast.success("Evento criado a partir do template");
		},
		onError: () => {
			toast.error("Erro ao criar evento");
		},
	});
}

export function useDeleteTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (templateId: string) => eventoTemplatesApi.delete(templateId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["evento-templates"] });
			toast.success("Template excluído");
		},
		onError: () => {
			toast.error("Erro ao excluir template");
		},
	});
}
