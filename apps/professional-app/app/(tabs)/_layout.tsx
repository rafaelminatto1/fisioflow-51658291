import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getConversations } from "@/lib/api";
import { fetchConversations } from "@/services/whatsapp-api";

function useUnreadBadge() {
	const { user } = useAuthStore();
	
	// Internal messages unread count
	const { data: internalConversations } = useQuery({
		queryKey: ["conversations"],
		queryFn: () => getConversations(),
		enabled: !!user?.organizationId,
		staleTime: 1000 * 30,
	});
	const internalUnread = internalConversations?.filter((c) => (c.unreadCount ?? 0) > 0).length ?? 0;

	// WhatsApp unread count
	const { data: waResponse } = useQuery({
		queryKey: ["whatsapp-conversations", { status: "all", limit: 100 }],
		queryFn: () => fetchConversations({ status: "all", limit: 100 }),
		enabled: !!user?.organizationId,
		staleTime: 1000 * 30,
	});
	const waUnread = waResponse?.data?.filter((c) => (c.unreadCount ?? 0) > 0).length ?? 0;

	return internalUnread + waUnread;
}

export default function TabsLayout() {
	const colors = useColors();
	const isIPad = Platform.OS === "ios" && Platform.isPad;
	const unreadCount = useUnreadBadge();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textMuted,
				tabBarStyle: {
					backgroundColor: colors.background,
					borderTopColor: colors.border,
				},
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Início",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="home-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="patients"
				options={{
					title: "Pacientes",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="people-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="agenda"
				options={{
					title: "Agenda",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="calendar-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="communications"
				options={{
					title: "Comunicações",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="chatbubbles-outline" size={size} color={color} />
					),
					tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
				}}
			/>
			<Tabs.Screen
				name="menu"
				options={{
					title: "Menu",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="ellipsis-horizontal" size={size} color={color} />
					),
				}}
			/>

			{/* Hidden from tab bar — still accessible via router */}
			<Tabs.Screen name="whatsapp" options={{ href: null }} />
			<Tabs.Screen name="crm" options={{ href: null }} />
			<Tabs.Screen name="messages" options={{ href: null }} />
			<Tabs.Screen name="financials" options={{ href: null }} />
			<Tabs.Screen name="tarefas" options={{ href: null }} />
			<Tabs.Screen name="profile" options={{ href: null }} />
		</Tabs>
	);
}
