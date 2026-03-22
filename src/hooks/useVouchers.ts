/**
 * useVouchers - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
	financialApi,
	type UserVoucherRecord,
	type VoucherRecord,
} from "@/api/v2";

export type Voucher = VoucherRecord;
export type UserVoucher = UserVoucherRecord;

export function useVouchers() {
	return useQuery({
		queryKey: ["vouchers"],
		queryFn: async () => {
			const res = await financialApi.vouchers.list({ ativo: true });
			return (res?.data ?? []) as Voucher[];
		},
	});
}

export function useUserVouchers() {
	const { user } = useAuth();

	return useQuery({
		queryKey: ["user-vouchers"],
		queryFn: async () => {
			const res = await financialApi.userVouchers.list();
			return (res?.data ?? []) as UserVoucher[];
		},
		enabled: !!user,
	});
}

export function useCreateVoucher() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			voucher: Omit<
				Voucher,
				"id" | "organization_id" | "created_at" | "updated_at"
			>,
		) => {
			const res = await financialApi.vouchers.create(voucher);
			return (res?.data ?? res) as Voucher;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vouchers"] });
			queryClient.invalidateQueries({ queryKey: ["all-vouchers"] });
			toast.success("Voucher criado com sucesso");
		},
		onError: (error: Error) => {
			toast.error(`Erro ao criar voucher: ${error.message}`);
		},
	});
}

export function useUpdateVoucher() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<Voucher> & { id: string }) => {
			const res = await financialApi.vouchers.update(id, updates);
			return (res?.data ?? res) as Voucher;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vouchers"] });
			queryClient.invalidateQueries({ queryKey: ["all-vouchers"] });
			toast.success("Voucher atualizado com sucesso");
		},
		onError: (error: Error) => {
			toast.error(`Erro ao atualizar voucher: ${error.message}`);
		},
	});
}

export function useDecrementVoucherSession() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userVoucherId: string) => {
			const res = await financialApi.userVouchers.consume(userVoucherId);
			return (res?.data ?? res) as UserVoucher;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user-vouchers"] });
			toast.success("Sessão descontada do voucher");
		},
		onError: (error: Error) => {
			toast.error(`Erro ao descontar sessão: ${error.message}`);
		},
	});
}

export function useDeleteVoucher() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => financialApi.vouchers.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vouchers"] });
			queryClient.invalidateQueries({ queryKey: ["all-vouchers"] });
			toast.success("Voucher excluído com sucesso");
		},
		onError: (error: Error) => {
			toast.error(`Erro ao excluir voucher: ${error.message}`);
		},
	});
}

export function useAllVouchers() {
	return useQuery({
		queryKey: ["all-vouchers"],
		queryFn: async () => {
			const res = await financialApi.vouchers.list({ all: true });
			return (res?.data ?? []) as Voucher[];
		},
	});
}
