/**
 * useExportPrestadores - Migrated to Neon/Workers
 */

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { prestadoresApi, type Prestador } from "@/api/v2";

export function useExportPrestadores() {
	return useMutation({
		mutationFn: async (eventoId: string) => {
			const res = await prestadoresApi.list({ eventoId });
			const prestadores = (res?.data ?? []) as Prestador[];

			const headers = [
				"Nome",
				"Contato",
				"CPF/CNPJ",
				"Valor Acordado",
				"Status Pagamento",
			];
			const csvContent = [
				headers.join(","),
				...prestadores.map((p) =>
					[
						`"${p.nome}"`,
						`"${p.contato || ""}"`,
						`"${p.cpf_cnpj || ""}"`,
						Number(p.valor_acordado ?? 0).toFixed(2),
						p.status_pagamento,
					].join(","),
				),
			].join("\n");

			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute(
				"download",
				`prestadores_${eventoId}_${Date.now()}.csv`,
			);
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			return prestadores;
		},
		onSuccess: () => {
			toast.success("CSV de prestadores baixado com sucesso.");
		},
		onError: (error: Error) => {
			toast.error("Erro ao exportar prestadores: " + error.message);
		},
	});
}
