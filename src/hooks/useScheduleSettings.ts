/**
 * useScheduleSettings - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	schedulingApi,
	type ScheduleBusinessHour,
	type ScheduleCancellationRule,
	type ScheduleNotificationSetting,
	type ScheduleBlockedTime,
} from "@/lib/api/workers-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./useAuth";

export interface BusinessHour {
	id: string;
	organization_id?: string;
	day_of_week: number;
	is_open: boolean;
	open_time: string;
	close_time: string;
	break_start?: string;
	break_end?: string;
}

export interface CancellationRule {
	id: string;
	organization_id?: string;
	min_hours_before: number;
	allow_patient_cancellation: boolean;
	max_cancellations_month: number;
	charge_late_cancellation: boolean;
	late_cancellation_fee: number;
}

export interface NotificationSettings {
	id: string;
	organization_id?: string;
	send_confirmation_email: boolean;
	send_confirmation_whatsapp: boolean;
	send_reminder_24h: boolean;
	send_reminder_2h: boolean;
	send_cancellation_notice: boolean;
	custom_confirmation_message?: string;
	custom_reminder_message?: string;
}

export interface BlockedTime {
	id: string;
	organization_id?: string;
	therapist_id?: string;
	title: string;
	reason?: string;
	start_date: string;
	end_date: string;
	start_time?: string;
	end_time?: string;
	is_all_day: boolean;
	is_recurring: boolean;
	recurring_days: number[];
	created_by: string;
}

const DAYS_OF_WEEK = [
	{ value: 0, label: "Domingo" },
	{ value: 1, label: "Segunda-feira" },
	{ value: 2, label: "Terça-feira" },
	{ value: 3, label: "Quarta-feira" },
	{ value: 4, label: "Quinta-feira" },
	{ value: 5, label: "Sexta-feira" },
	{ value: 6, label: "Sábado" },
];

export function useScheduleSettings() {
	const { toast } = useToast();
	const { user, profile } = useAuth();
	const queryClient = useQueryClient();

	const organizationId = profile?.organization_id;
	const STALE_TIME_MS = 10 * 60 * 1000;

	const { data: businessHours, isLoading: isLoadingHours } = useQuery({
		queryKey: ["business-hours", organizationId],
		queryFn: async () => {
			const res = await schedulingApi.settings.businessHours.list();
			const data = (res?.data ?? []) as ScheduleBusinessHour[];
			return data
				.map((hour) => ({
					id: String(hour.id),
					day_of_week: Number(hour.day_of_week ?? 0),
					is_open: hour.is_open !== false,
					open_time: String(hour.open_time ?? "07:00"),
					close_time: String(hour.close_time ?? "21:00"),
					break_start: hour.break_start ?? undefined,
					break_end: hour.break_end ?? undefined,
				}))
				.sort((a, b) => a.day_of_week - b.day_of_week) as BusinessHour[];
		},
		enabled: !!organizationId,
		staleTime: STALE_TIME_MS,
		retry: 2,
	});

	const upsertBusinessHours = useMutation({
		mutationFn: async (hours: Partial<BusinessHour>[]) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada.");
			}
			const validHours = hours.filter((h) => h.day_of_week !== undefined);
			const payload = validHours.map((h) => ({
				id: h.id,
				day_of_week: h.day_of_week,
				is_open: h.is_open ?? true,
				open_time: h.open_time ?? "07:00",
				close_time: h.close_time ?? "21:00",
				break_start: h.break_start ?? null,
				break_end: h.break_end ?? null,
			}));

			await schedulingApi.settings.businessHours.upsert(payload);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["business-hours"] });
			toast({
				title: "Horários salvos",
				description: "Horários de funcionamento atualizados.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const { data: cancellationRules, isLoading: isLoadingRules } = useQuery({
		queryKey: ["cancellation-rules", organizationId],
		queryFn: async () => {
			const res = await schedulingApi.settings.cancellationRules.get();
			const row = (res?.data ?? null) as ScheduleCancellationRule | null;
			if (!row) return null;
			return {
				id: String(row.id),
				min_hours_before: Number(row.min_hours_before ?? 24),
				allow_patient_cancellation: row.allow_patient_cancellation !== false,
				max_cancellations_month: Number(row.max_cancellations_month ?? 3),
				charge_late_cancellation: row.charge_late_cancellation === true,
				late_cancellation_fee: Number(row.late_cancellation_fee ?? 0),
			} as CancellationRule;
		},
		enabled: !!organizationId,
		staleTime: STALE_TIME_MS,
		retry: 2,
	});

	const upsertCancellationRules = useMutation({
		mutationFn: async (rules: Partial<CancellationRule>) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada.");
			}
			await schedulingApi.settings.cancellationRules.upsert(rules);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cancellation-rules"] });
			toast({
				title: "Regras salvas",
				description: "Regras de cancelamento atualizadas.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const { data: notificationSettings, isLoading: isLoadingNotifications } =
		useQuery({
			queryKey: ["notification-settings", organizationId],
			queryFn: async () => {
				const res = await schedulingApi.settings.notificationSettings.get();
				const row = (res?.data ?? null) as ScheduleNotificationSetting | null;
				if (!row) return null;
				return {
					id: String(row.id),
					send_confirmation_email: row.send_confirmation_email !== false,
					send_confirmation_whatsapp: row.send_confirmation_whatsapp !== false,
					send_reminder_24h: row.send_reminder_24h !== false,
					send_reminder_2h: row.send_reminder_2h !== false,
					send_cancellation_notice: row.send_cancellation_notice !== false,
					custom_confirmation_message: row.custom_confirmation_message ?? "",
					custom_reminder_message: row.custom_reminder_message ?? "",
				} as NotificationSettings;
			},
			enabled: !!organizationId,
			staleTime: STALE_TIME_MS,
			retry: 2,
		});

	const upsertNotificationSettings = useMutation({
		mutationFn: async (settings: Partial<NotificationSettings>) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada.");
			}
			await schedulingApi.settings.notificationSettings.upsert(settings);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
			toast({
				title: "Configurações salvas",
				description: "Notificações atualizadas.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const { data: blockedTimes, isLoading: isLoadingBlocked } = useQuery({
		queryKey: ["blocked-times", organizationId],
		queryFn: async () => {
			const res = await schedulingApi.settings.blockedTimes.list();
			const data = (res?.data ?? []) as ScheduleBlockedTime[];
			return data
				.map((blocked) => ({
					id: String(blocked.id),
					therapist_id: blocked.therapist_id ?? undefined,
					title: String(blocked.title ?? "Bloqueio"),
					reason: blocked.reason ?? undefined,
					start_date: String(blocked.start_date),
					end_date: String(blocked.end_date),
					start_time: blocked.start_time ?? undefined,
					end_time: blocked.end_time ?? undefined,
					is_all_day: blocked.is_all_day !== false,
					is_recurring: blocked.is_recurring === true,
					recurring_days: Array.isArray(blocked.recurring_days)
						? blocked.recurring_days.map((d) => Number(d))
						: [],
					created_by: String(blocked.created_by ?? user?.uid ?? ""),
				}))
				.sort(
					(a, b) =>
						new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
				) as BlockedTime[];
		},
		enabled: !!organizationId,
		staleTime: STALE_TIME_MS,
		retry: 2,
	});

	const createBlockedTime = useMutation({
		mutationFn: async (blocked: Omit<BlockedTime, "id" | "created_by">) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada.");
			}
			await schedulingApi.settings.blockedTimes.create(blocked);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["blocked-times"] });
			toast({
				title: "Bloqueio criado",
				description: "Horário bloqueado com sucesso.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const deleteBlockedTime = useMutation({
		mutationFn: async (id: string) => {
			if (!organizationId) {
				throw new Error("Organização não encontrada.");
			}
			await schedulingApi.settings.blockedTimes.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["blocked-times"] });
			toast({
				title: "Bloqueio removido",
				description: "O bloqueio foi removido.",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	return {
		businessHours: businessHours || [],
		cancellationRules,
		notificationSettings,
		blockedTimes: blockedTimes || [],
		daysOfWeek: DAYS_OF_WEEK,
		organizationId,

		isLoadingHours: !!organizationId && isLoadingHours,
		isLoadingRules: !!organizationId && isLoadingRules,
		isLoadingNotifications: !!organizationId && isLoadingNotifications,
		isLoadingBlocked: !!organizationId && isLoadingBlocked,

		upsertBusinessHours,
		upsertCancellationRules,
		upsertNotificationSettings,
		createBlockedTime,
		deleteBlockedTime,

		isSavingHours: upsertBusinessHours.isPending,
		isSavingRules: upsertCancellationRules.isPending,
		isSavingNotifications: upsertNotificationSettings.isPending,
		isCreatingBlocked: createBlockedTime.isPending,
		isDeletingBlocked: deleteBlockedTime.isPending,
	};
}
