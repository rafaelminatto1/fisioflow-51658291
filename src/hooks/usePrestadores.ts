/**
 * usePrestadores - Migrated to Neon/Workers
 */

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { prestadoresApi, type Prestador } from "@/api/v2";
import { PrestadorCreate, PrestadorUpdate } from "@/lib/validations/prestador";
import { fisioLogger as logger } from "@/lib/errors/logger";

export function usePrestadores(eventoId: string) {
	return useQuery<Prestador[]>({
		queryKey: ["prestadores", eventoId],
		queryFn: async () => {
			if (!eventoId) return [];
			const res = await prestadoresApi.list({ eventoId });
			return (res?.data ?? []) as Prestador[];
		},
		enabled: !!eventoId,
	});
}

export function useCreatePrestador() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (prestador: PrestadorCreate) => {
			const res = await prestadoresApi.create(prestador);
			return (res?.data ?? res) as Prestador;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["prestadores", data.evento_id],
			});
			toast.success("Prestador cadastrado com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao adicionar prestador: " + error.message);
		},
	});
}

export function useUpdatePrestador() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
			eventoId: _eventoId,
		}: {
			id: string;
			data: PrestadorUpdate;
			eventoId: string;
		}) => {
			const res = await prestadoresApi.update(id, data);
			return (res?.data ?? res) as Prestador;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["prestadores", variables.eventoId],
			});
			toast.success("Prestador atualizado com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar prestador: " + error.message);
		},
	});
}

export function useDeletePrestador() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id }: { id: string; eventoId: string }) => {
			await prestadoresApi.delete(id);
			return id;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["prestadores", variables.eventoId],
			});
			toast.success("Prestador removido com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao remover prestador: " + error.message);
		},
	});
}

export function useMarcarPagamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, eventoId: _eventoId }: { id: string; eventoId: string }) => {
			const res = await prestadoresApi.toggleStatus(id);
			return (res?.data ?? res) as Prestador;
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["prestadores", variables.eventoId],
			});
			toast.success(
				`Pagamento marcado como ${data.status_pagamento.toLowerCase()}.`,
			);
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar status: " + error.message);
		},
	});
}

export function useRealtimePrestadores(eventoId: string) {
	const queryClient = useQueryClient();
	const lastUpdatedRef = useRef<string | null>(null);

	useEffect(() => {
		if (!eventoId) return;

		let active = true;
		const pollMetrics = async () => {
			try {
				const res = await prestadoresApi.metrics(eventoId);
				const nextUpdated = res?.data?.last_updated_at ?? null;
				if (active && nextUpdated && nextUpdated !== lastUpdatedRef.current) {
					lastUpdatedRef.current = nextUpdated;
					queryClient.invalidateQueries({
						queryKey: ["prestadores", eventoId],
					});
					queryClient.invalidateQueries({ queryKey: ["eventos-stats"] });
				}
			} catch (error) {
				logger.error(
					"Erro ao verificar prestadores realtime",
					error as Error,
					"useRealtimePrestadores",
				);
			}
		};

		pollMetrics();
		const interval = setInterval(pollMetrics, 15000);

		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [eventoId, queryClient]);
}
