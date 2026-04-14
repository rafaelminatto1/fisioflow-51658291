import {
	View,
	ScrollView,
	Text,
	StyleSheet,
	TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { router } from "expo-router";
import { useHaptics } from "@/hooks/useHaptics";

interface MenuItem {
	id: string;
	title: string;
	icon: keyof typeof Ionicons.glyphMap;
	route: string;
	description: string;
	color: string;
}

const MENU_ITEMS: MenuItem[] = [
	{
		id: "financials",
		title: "Financeiro",
		icon: "cash-outline",
		route: "/(tabs)/financials",
		description: "Transações, NFS-e e recibos",
		color: "#10B981",
	},
	{
		id: "tarefas",
		title: "Tarefas",
		icon: "checkmark-circle-outline",
		route: "/(tabs)/tarefas",
		description: "Quadro Kanban e responsabilizações",
		color: "#6366F1",
	},
	{
		id: "reports",
		title: "Relatórios",
		icon: "bar-chart-outline",
		route: "/reports",
		description: "Visão geral e métricas clínicas",
		color: "#F59E0B",
	},
	{
		id: "wiki",
		title: "Wiki",
		icon: "book-outline",
		route: "/wiki",
		description: "Base de conhecimento clínica",
		color: "#06B6D4",
	},
	{
		id: "biomechanics",
		title: "Biomecânica",
		icon: "analytics-outline",
		route: "/(app)/biomechanics",
		description: "Análise de movimento com IA Vision",
		color: "#8B5CF6",
	},
	{
		id: "exercises",
		title: "Exercícios",
		icon: "fitness-outline",
		route: "/exercises",
		description: "Biblioteca de exercícios e protocolos",
		color: "#EC4899",
	},
	{
		id: "proms",
		title: "PROMs",
		icon: "clipboard-outline",
		route: "/proms",
		description: "Escalas e testes padronizados",
		color: "#14B8A6",
	},
	{
		id: "settings",
		title: "Configurações",
		icon: "settings-outline",
		route: "/(tabs)/profile",
		description: "Perfil, notificações e LGPD",
		color: "#64748B",
	},
];

export default function MenuScreen() {
	const colors = useColors();
	const { light } = useHaptics();

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top", "left", "right"]}
		>
			<View style={styles.header}>
				<View>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Menu</Text>
					<Text
						style={[styles.headerSubtitle, { color: colors.textSecondary }]}
					>
						Todas as funcionalidades
					</Text>
				</View>
			</View>

			<ScrollView
				style={styles.menuList}
				contentContainerStyle={styles.menuListContent}
				showsVerticalScrollIndicator={false}
			>
				{MENU_ITEMS.map((item) => (
					<TouchableOpacity
						key={item.id}
						style={[
							styles.menuItem,
							{
								backgroundColor: colors.surface,
								borderColor: colors.border + "30",
							},
						]}
						onPress={() => {
							light();
							router.push(item.route as "/reports");
						}}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={item.title}
						accessibilityHint={item.description}
					>
						<View
							style={[
								styles.iconContainer,
								{ backgroundColor: item.color + "15" },
							]}
						>
							<Ionicons name={item.icon} size={24} color={item.color} />
						</View>
						<View style={styles.itemContent}>
							<Text style={[styles.itemTitle, { color: colors.text }]}>
								{item.title}
							</Text>
							<Text
								style={[
									styles.itemDescription,
									{ color: colors.textSecondary },
								]}
							>
								{item.description}
							</Text>
						</View>
						<Ionicons
							name="chevron-forward"
							size={20}
							color={colors.textSecondary}
						/>
					</TouchableOpacity>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		paddingTop: 8,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	headerSubtitle: {
		fontSize: 15,
		marginTop: 2,
	},
	menuList: {
		flex: 1,
	},
	menuListContent: {
		paddingHorizontal: 20,
		paddingBottom: 40,
		gap: 10,
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderRadius: 14,
		borderWidth: 1,
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	itemContent: {
		flex: 1,
		gap: 2,
	},
	itemTitle: {
		fontSize: 16,
		fontWeight: "600",
	},
	itemDescription: {
		fontSize: 13,
		lineHeight: 18,
	},
});
