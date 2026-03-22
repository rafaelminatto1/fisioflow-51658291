/**
 * useParticipantes - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { participantesApi, type Participante } from "@/api/v2";
import {
	ParticipanteCreate,
	ParticipanteUpdate,
} from "@/lib/validations/participante";

export type { Participante };

export function useParticipantes(eventoId: string) {
	return useQuery({
		queryKey: ["participantes", eventoId],
		queryFn: async () => {
			const res = await participantesApi.list({ eventoId, limit: 500 });
			return (res?.data ?? []) as Participante[];
		},
		enabled: !!eventoId,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
	});
}

export function useCreateParticipante() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (participante: ParticipanteCreate) => {
			const res = await participantesApi.create(
				participante as Partial<Participante>,
			);
			return (res?.data ?? res) as Participante;
		},
		onSuccess: (created) => {
			queryClient.invalidateQueries({
				queryKey: ["participantes", created.evento_id],
			});
			queryClient.invalidateQueries({ queryKey: ["eventos-stats"] });
			toast.success("Participante adicionado com sucesso.");
		},
		onError: (error: Error) =>
			toast.error(`Erro ao adicionar participante: ${error.message}`),
	});
}

export function useUpdateParticipante() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
			eventoId,
		}: {
			id: string;
			data: ParticipanteUpdate;
			eventoId: string;
		}) => {
			const res = await participantesApi.update(
				id,
				data as Partial<Participante>,
			);
			return { ...(res?.data ?? res), evento_id: eventoId } as Participante;
		},
		onSuccess: (updated) => {
			queryClient.invalidateQueries({
				queryKey: ["participantes", updated.evento_id],
			});
			queryClient.invalidateQueries({ queryKey: ["eventos-stats"] });
			toast.success("Participante atualizado com sucesso.");
		},
		onError: (error: Error) =>
			toast.error(`Erro ao atualizar participante: ${error.message}`),
	});
}

export function useDeleteParticipante() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
			await participantesApi.delete(id);
			return eventoId;
		},
		onSuccess: (eventoId) => {
			queryClient.invalidateQueries({ queryKey: ["participantes", eventoId] });
			queryClient.invalidateQueries({ queryKey: ["eventos-stats"] });
			toast.success("Participante removido com sucesso.");
		},
		onError: (error: Error) =>
			toast.error(`Erro ao remover participante: ${error.message}`),
	});
}

export function useExportParticipantes() {
	return useMutation({
		mutationFn: async (eventoId: string) => {
			const res = await participantesApi.list({ eventoId, limit: 5000 });
			const data = (res?.data ?? []) as Participante[];

			const headers = [
				"Nome",
				"Contato",
				"Instagram",
				"Segue Perfil",
				"Observações",
			];
			const csvContent = [
				headers.join(","),
				...data.map((p) =>
					[
						p.nome ?? "",
						p.contato ?? "",
						p.instagram ?? "",
						p.segue_perfil ? "Sim" : "Não",
						p.observacoes ?? "",
					].join(","),
				),
			].join("\n");

			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute(
				"download",
				`participantes_${eventoId}_${Date.now()}.csv`,
			);
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			return data;
		},
		onSuccess: () =>
			toast.success("CSV de participantes exportado com sucesso."),
		onError: (error: Error) =>
			toast.error(`Erro ao exportar participantes: ${error.message}`),
	});
}
