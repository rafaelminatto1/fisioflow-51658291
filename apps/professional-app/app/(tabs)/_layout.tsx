import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";

export default function TabsLayout() {
	const colors = useColors();

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
					title: "Painel",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="grid" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="patients"
				options={{
					title: "Pacientes",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="people" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="tarefas"
				options={{
					title: "Tarefas",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="checkmark-circle" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="whatsapp"
				options={{
					title: "WhatsApp",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="logo-whatsapp" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="crm"
				options={{
					title: "CRM",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="funnel" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="agenda"
				options={{
					title: "Agenda",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="calendar" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="financials"
				options={{
					title: "Financeiro",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="cash" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Perfil",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
