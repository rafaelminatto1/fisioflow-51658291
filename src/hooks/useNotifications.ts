/**
 * useNotifications - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type Notification } from "@/lib/api/workers-client";
import { toast } from "sonner";

export type { Notification };

export const useNotifications = (limitValue = 50) => {
	const queryClient = useQueryClient();

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["notifications", limitValue],
		queryFn: async () => {
			const res = await notificationsApi.list({ limit: limitValue });
			return (res?.data ?? []) as Notification[];
		},
		staleTime: 30000,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});

	const notifications = data ?? [];
	const unreadCount = notifications.filter((n) => !n.is_read).length;

	const markAsReadMutation = useMutation({
		mutationFn: (id: string) => notificationsApi.markRead(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});

	const markAllAsReadMutation = useMutation({
		mutationFn: () => notificationsApi.markAllRead(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			toast.success("Todas notificações marcadas como lidas");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => notificationsApi.delete(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});

	return {
		notifications,
		unreadCount,
		isLoading,
		refetch,
		markAsRead: markAsReadMutation.mutate,
		markAllAsRead: markAllAsReadMutation.mutate,
		deleteNotification: deleteMutation.mutate,
		isMarkingAsRead: markAsReadMutation.isPending,
		isMarkingAllAsRead: markAllAsReadMutation.isPending,
	};
};

export const createNotification = async (params: {
	userId: string;
	type: Notification["type"];
	title: string;
	message: string;
	link?: string;
	metadata?: Record<string, unknown>;
}) => {
	return notificationsApi.create({
		user_id: params.userId,
		type: params.type,
		title: params.title,
		message: params.message,
		link: params.link,
		metadata: params.metadata ?? {},
	});
};
