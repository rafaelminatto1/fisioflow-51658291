/**
 * useRecibos - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { recibosApi, type Recibo } from "@/api/v2";

export function useRecibos() {
	return useQuery({
		queryKey: ["recibos"],
		queryFn: async () => {
			try {
				const res = await recibosApi.list();
				return res?.data ?? [];
			} catch (error) {
				console.error("[useRecibos] Failed to load receipts:", error);
				return [];
			}
		},
		retry: false,
	});
}

export function useCreateRecibo() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			recibo: Omit<
				Recibo,
				"id" | "numero_recibo" | "created_at" | "updated_at"
			>,
		) => {
			const res = await recibosApi.create({
				...recibo,
				assinado: recibo.assinado ?? true,
			});
			return (res?.data ?? res) as Recibo;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recibos"] });
			queryClient.invalidateQueries({ queryKey: ["financial-command-center"] });
			toast.success("Recibo emitido com sucesso.");
		},
		onError: () => toast.error("Erro ao emitir recibo."),
	});
}

// Helper para converter número em extenso
export function valorPorExtenso(valor: number): string {
	const unidades = [
		"",
		"um",
		"dois",
		"três",
		"quatro",
		"cinco",
		"seis",
		"sete",
		"oito",
		"nove",
	];
	const dezADezenove = [
		"dez",
		"onze",
		"doze",
		"treze",
		"quatorze",
		"quinze",
		"dezesseis",
		"dezessete",
		"dezoito",
		"dezenove",
	];
	const dezenas = [
		"",
		"",
		"vinte",
		"trinta",
		"quarenta",
		"cinquenta",
		"sessenta",
		"setenta",
		"oitenta",
		"noventa",
	];
	const centenas = [
		"",
		"cento",
		"duzentos",
		"trezentos",
		"quatrocentos",
		"quinhentos",
		"seiscentos",
		"setecentos",
		"oitocentos",
		"novecentos",
	];

	if (valor === 0) return "zero reais";
	if (valor === 100) return "cem reais";

	const inteiro = Math.floor(valor);
	const centavos = Math.round((valor - inteiro) * 100);

	let resultado = "";

	if (inteiro >= 1000) {
		const milhares = Math.floor(inteiro / 1000);
		resultado += milhares === 1 ? "mil" : `${unidades[milhares]} mil`;
		const restoMilhares = inteiro % 1000;
		if (restoMilhares > 0) resultado += " e ";
	}

	const resto = inteiro % 1000;
	if (resto >= 100) {
		resultado += centenas[Math.floor(resto / 100)];
		if (resto % 100 > 0) resultado += " e ";
	}

	const dezena = resto % 100;
	if (dezena >= 10 && dezena <= 19) {
		resultado += dezADezenove[dezena - 10];
	} else {
		if (dezena >= 20) {
			resultado += dezenas[Math.floor(dezena / 10)];
			if (dezena % 10 > 0) resultado += " e ";
		}
		if (dezena % 10 > 0 || (dezena < 10 && dezena > 0)) {
			resultado += unidades[dezena % 10];
		}
	}

	resultado += inteiro === 1 ? " real" : " reais";

	if (centavos > 0) {
		resultado += ` e ${centavos} centavo${centavos > 1 ? "s" : ""}`;
	}

	return resultado;
}
