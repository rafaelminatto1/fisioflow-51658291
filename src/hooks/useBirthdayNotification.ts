import { useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
	patientsApi,
	marketingApi,
	type PatientRow,
} from "@/api/v2";
import { organizationMembersApi } from "@/api/v2/system";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Cake, Sparkles, UserCheck } from "lucide-react";
import React from "react";

/**
 * Hook para gerenciar notificações e automação de aniversários
 */
export function useBirthdayNotification() {
	const { profile } = useAuth();
	const organizationId = profile?.organization_id;

	const { data: patients = [] } = useQuery({
		queryKey: ["patients-birthdays-today"],
		queryFn: async () => {
			const res = await patientsApi.list({ status: "ativo", limit: 1000 });
			const today = new Date();
			const month = today.getUTCMonth() + 1;
			const day = today.getUTCDate();

			return (res?.data ?? []).filter((p: PatientRow) => {
				if (!p.birth_date) return false;
				const bDay = new Date(p.birth_date);
				return bDay.getUTCMonth() + 1 === month && bDay.getUTCDate() === day;
			});
		},
	});

	const { data: staff = [] } = useQuery({
		queryKey: ["staff-birthdays-today", organizationId],
		queryFn: async () => {
			if (!organizationId) return [];
			const res = await organizationMembersApi.list({ organizationId });
			const today = new Date();
			const month = today.getUTCMonth() + 1;
			const day = today.getUTCDate();

			return (res.data ?? [])
				.filter((m) => {
					if (!m.user?.birth_date) return false;
					const bDay = new Date(m.user.birth_date);
					return bDay.getUTCMonth() + 1 === month && bDay.getUTCDate() === day;
				})
				.map((m) => ({
					id: m.id,
					name: m.user?.full_name || "Profissional",
					role: m.role,
					isStaff: true,
				}));
		},
		enabled: !!organizationId,
	});

	const sendMessageMutation = useMutation({
		mutationFn: async ({
			patientId,
			phone,
		}: {
			patientId: string;
			phone: string;
		}) => {
			return marketingApi.campaigns.sendQuickMessage({
				patientId,
				type: "birthday_discount",
				template: `Parabéns! Hoje é seu dia especial e a FisioFlow tem um presente: use o cupom NIVER10 para 10% de desconto na sua próxima sessão!`,
			});
		},
		onSuccess: () => {
			toast.success(`Mensagem de parabéns enviada!`);
		},
	});

	// Notificar o profissional quando houver aniversariantes
	useEffect(() => {
		const total = patients.length + staff.length;
		if (total > 0) {
			const patientNames = patients.map((p) => p.name || p.full_name);
			const staffNames = staff.map((s) => `${s.name} (Equipe)`);
			const allNames = [...patientNames, ...staffNames].join(", ");

			toast(`Aniversariantes de Hoje! 🎉`, {
				description: `${allNames} estão fazendo aniversário hoje.`,
				icon: React.createElement(Cake, { className: "h-5 w-5 text-pink-500" }),
				duration: 10000,
			});
		}
	}, [patients.length, staff.length]);

	return {
		birthdaysToday: patients,
		staffBirthdaysToday: staff,
		sendBirthdayMessage: (patientId: string, phone: string) =>
			sendMessageMutation.mutate({ patientId, phone }),
		isSending: sendMessageMutation.isPending,
	};
}
