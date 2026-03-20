/**
 * useOnlineUsers - Migrated to Realtime WebSocket (Cloudflare Durable Objects)
 */

import { useRealtime } from "@/hooks/useRealtimeContext";

export interface PresenceUser {
	userId: string;
	userName: string;
	role: string;
	joinedAt: Date;
	lastSeen: Date;
}

export function useOnlineUsers(_channelName: string = "online-users") {
	const { onlineUsers, isSubscribed } = useRealtime();

	// Converter o Map do RealtimeContext para a interface PresenceUser esperada pelo componente
	const mappedUsers: PresenceUser[] = Array.from(onlineUsers.values()).map(
		(user) => ({
			userId: user.userId,
			userName: user.name,
			role: user.role || "fisioterapeuta",
			joinedAt: new Date(), // WebSocket não envia tempo de entrada por padrão ainda
			lastSeen: new Date(),
		}),
	);

	return {
		onlineUsers: mappedUsers,
		isConnected: isSubscribed,
		onlineCount: mappedUsers.length,
	};
}

export function usePresence(channelName: string) {
	return useOnlineUsers(channelName);
}

export function useGlobalPresence() {
	return useOnlineUsers("global-online-users");
}
