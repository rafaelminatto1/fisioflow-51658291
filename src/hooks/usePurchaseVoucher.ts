/**
 * usePurchaseVoucher - Migrated to Neon/Workers
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { financialApi } from "@/api/v2";

interface VoucherCheckoutData {
	sessionId: string;
	url?: string;
	error?: string;
}

interface VoucherPaymentVerifyData {
	success?: boolean;
	userVoucherId?: string;
	error?: string;
}

export function usePurchaseVoucher() {
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (voucherId: string) => {
			const result = await financialApi.vouchers.checkout(voucherId);
			const data = (result?.data ?? result) as VoucherCheckoutData;

			if (data.error) {
				throw new Error(data.error);
			}

			return data;
		},
		onSuccess: (data: VoucherCheckoutData) => {
			if (data.url) {
				window.open(data.url, "_blank");
				toast({
					title: "Redirecionando para pagamento",
					description: "Aguarde enquanto você é redirecionado para o checkout.",
				});
			}
		},
		onError: (error: Error | unknown) => {
			const errorMessage =
				error instanceof Error ? error.message : "Erro ao processar pagamento";
			toast({
				title: "Erro ao processar pagamento",
				description: errorMessage,
				variant: "destructive",
			});
		},
	});
}

export function useVerifyVoucherPayment() {
	const { toast } = useToast();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (sessionId: string) => {
			const result = await financialApi.vouchers.verifyCheckout(sessionId);
			const data = (result?.data ?? result) as VoucherPaymentVerifyData;

			if (data.error) {
				throw new Error(data.error);
			}

			return data;
		},
		onSuccess: (data: VoucherPaymentVerifyData) => {
			queryClient.invalidateQueries({ queryKey: ["user-vouchers"] });

			if (data.success) {
				toast({
					title: "Voucher ativado!",
					description: "Seu voucher foi ativado com sucesso.",
				});
			}
		},
		onError: (error: Error | unknown) => {
			const errorMessage =
				error instanceof Error ? error.message : "Erro ao verificar pagamento";
			toast({
				title: "Erro ao verificar pagamento",
				description: errorMessage,
				variant: "destructive",
			});
		},
	});
}
