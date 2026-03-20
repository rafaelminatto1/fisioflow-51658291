/**
 * useSessionPackages - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financialApi, type PatientPackageRow } from "@/lib/api/workers-client";
import { useToast } from "@/hooks/use-toast";

export interface SessionPackage {
	id: string;
	organization_id: string;
	patient_id: string;
	package_name: string;
	total_sessions: number;
	used_sessions: number;
	remaining_sessions: number;
	total_value: number;
	discount_value: number;
	final_value: number;
	value_per_session: number;
	payment_status: string;
	payment_method?: string;
	paid_at?: string;
	status: "ativo" | "consumido" | "expirado" | "cancelado";
	valid_until?: string;
	notes?: string;
	created_by: string;
	created_at: string;
	updated_at: string;
}

const mapStatus = (
	status?: string | null,
	validUntil?: string | null,
): SessionPackage["status"] => {
	if (status === "cancelled") return "cancelado";
	if (status === "depleted") return "consumido";
	if (validUntil && new Date(validUntil) < new Date()) return "expirado";
	return "ativo";
};

const mapPaymentStatus = (pkg: PatientPackageRow): string => {
	if (pkg.payment_method) return "pago";
	return "pendente";
};

const mapPatientPackageToSessionPackage = (
	pkg: PatientPackageRow,
): SessionPackage => {
	const totalValue = Number(pkg.price ?? 0);
	const totalSessions = Number(pkg.total_sessions ?? 0);
	return {
		id: pkg.id,
		organization_id: "",
		patient_id: pkg.patient_id,
		package_name: pkg.name,
		total_sessions: totalSessions,
		used_sessions: Number(pkg.used_sessions ?? 0),
		remaining_sessions: Number(pkg.remaining_sessions ?? 0),
		total_value: totalValue,
		discount_value: 0,
		final_value: totalValue,
		value_per_session:
			totalSessions > 0 ? Number((totalValue / totalSessions).toFixed(2)) : 0,
		payment_status: mapPaymentStatus(pkg),
		payment_method: pkg.payment_method ?? undefined,
		paid_at: pkg.purchased_at ?? undefined,
		status: mapStatus(pkg.status, pkg.expires_at),
		valid_until: pkg.expires_at ?? undefined,
		notes: undefined,
		created_by: "",
		created_at: pkg.created_at,
		updated_at: pkg.last_used_at ?? pkg.created_at,
	};
};

export const useSessionPackages = (patientId?: string) => {
	return useQuery({
		queryKey: ["session-packages", patientId],
		queryFn: async () => {
			const res = await financialApi.patientPackages.list(
				patientId ? { patientId, limit: 200 } : { limit: 200 },
			);
			return ((res?.data ?? []) as PatientPackageRow[]).map(
				mapPatientPackageToSessionPackage,
			);
		},
	});
};

export const useCreatePackage = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (
			packageData: Omit<
				SessionPackage,
				| "id"
				| "created_at"
				| "updated_at"
				| "remaining_sessions"
				| "value_per_session"
				| "used_sessions"
			>,
		) => {
			const res = await financialApi.patientPackages.create({
				patient_id: packageData.patient_id,
				name: packageData.package_name,
				custom_sessions: packageData.total_sessions,
				custom_price: packageData.final_value,
				payment_method: packageData.payment_method,
				validity_days: packageData.valid_until
					? Math.max(
							1,
							Math.ceil(
								(new Date(packageData.valid_until).getTime() - Date.now()) /
									(1000 * 60 * 60 * 24),
							),
						)
					: undefined,
			});

			return mapPatientPackageToSessionPackage(
				(res?.data ?? res) as PatientPackageRow,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session-packages"] });
			toast({ title: "Pacote criado com sucesso" });
		},
		onError: () => {
			toast({ title: "Erro ao criar pacote", variant: "destructive" });
		},
	});
};

export const useUsePackageSession = () => {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (packageId: string) => {
			const res = await financialApi.patientPackages.consume(packageId);
			return mapPatientPackageToSessionPackage(
				(res?.data ?? res) as PatientPackageRow,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session-packages"] });
			queryClient.invalidateQueries({ queryKey: ["patient-packages"] });
			toast({ title: "Sessão debitada do pacote" });
		},
		onError: (error: Error) => {
			toast({
				title: "Erro ao debitar sessão",
				description: error.message,
				variant: "destructive",
			});
		},
	});
};
