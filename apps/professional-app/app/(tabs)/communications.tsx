import { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { router } from "expo-router";

type CommTab = "whatsapp" | "crm" | "messages";

const TABS: { key: CommTab; label: string; icon: string }[] = [
	{ key: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" },
	{ key: "crm", label: "CRM", icon: "funnel-outline" },
	{ key: "messages", label: "Mensagens", icon: "chatbubbles-outline" },
];

export default function CommunicationsScreen() {
	const colors = useColors();
	const { light } = useHaptics();
	const [activeTab, setActiveTab] = useState<CommTab>("whatsapp");

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top", "left", "right"]}
		>
			<View style={styles.header}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>
					Comunicações
				</Text>
			</View>

			<View
				style={[styles.segmentedControl, { backgroundColor: colors.surface }]}
			>
				{TABS.map((tab) => {
					const isActive = activeTab === tab.key;
					return (
						<TouchableOpacity
							key={tab.key}
							style={[
								styles.segment,
								isActive && {
									backgroundColor: colors.primary,
								},
							]}
							onPress={() => {
								light();
								setActiveTab(tab.key);
							}}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel={tab.label}
							accessibilityState={{ selected: isActive }}
						>
							<Ionicons
								name={tab.icon as any}
								size={18}
								color={isActive ? "#fff" : colors.textSecondary}
							/>
							<Text
								style={[
									styles.segmentLabel,
									{ color: isActive ? "#fff" : colors.textSecondary },
								]}
							>
								{tab.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<View style={styles.content}>
				{activeTab === "whatsapp" && <WhatsAppPlaceholder colors={colors} />}
				{activeTab === "crm" && <CRMPlaceholder colors={colors} />}
				{activeTab === "messages" && <MessagesPlaceholder colors={colors} />}
			</View>
		</SafeAreaView>
	);
}

function WhatsAppPlaceholder({ colors }: { colors: any }) {
	return (
		<View style={styles.placeholder}>
			<Ionicons name="logo-whatsapp" size={64} color={colors.primary} />
			<Text style={[styles.placeholderTitle, { color: colors.text }]}>
				WhatsApp Business
			</Text>
			<Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
				Gerencie conversas com pacientes
			</Text>
			<TouchableOpacity
				style={[styles.openButton, { backgroundColor: colors.primary }]}
				onPress={() => router.push("/(tabs)/whatsapp")}
				accessibilityRole="button"
				accessibilityLabel="Abrir WhatsApp"
			>
				<Text style={styles.openButtonText}>Abrir Conversas</Text>
				<Ionicons name="arrow-forward" size={18} color="#fff" />
			</TouchableOpacity>
		</View>
	);
}

function CRMPlaceholder({ colors }: { colors: any }) {
	return (
		<View style={styles.placeholder}>
			<Ionicons name="funnel" size={64} color="#F59E0B" />
			<Text style={[styles.placeholderTitle, { color: colors.text }]}>
				CRM & Leads
			</Text>
			<Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
				Acompanhe leads e pipeline de vendas
			</Text>
			<TouchableOpacity
				style={[styles.openButton, { backgroundColor: "#F59E0B" }]}
				onPress={() => router.push("/(tabs)/crm")}
				accessibilityRole="button"
				accessibilityLabel="Abrir CRM"
			>
				<Text style={styles.openButtonText}>Abrir CRM</Text>
				<Ionicons name="arrow-forward" size={18} color="#fff" />
			</TouchableOpacity>
		</View>
	);
}

function MessagesPlaceholder({ colors }: { colors: any }) {
	return (
		<View style={styles.placeholder}>
			<Ionicons name="chatbubbles" size={64} color="#6366F1" />
			<Text style={[styles.placeholderTitle, { color: colors.text }]}>
				Mensagens Internas
			</Text>
			<Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
				Comunicação entre a equipe da clínica
			</Text>
			<TouchableOpacity
				style={[styles.openButton, { backgroundColor: "#6366F1" }]}
				onPress={() => router.push("/(tabs)/messages")}
				accessibilityRole="button"
				accessibilityLabel="Abrir Mensagens"
			>
				<Text style={styles.openButtonText}>Abrir Mensagens</Text>
				<Ionicons name="arrow-forward" size={18} color="#fff" />
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 12,
		paddingTop: 4,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	segmentedControl: {
		flexDirection: "row",
		marginHorizontal: 20,
		marginBottom: 16,
		borderRadius: 12,
		padding: 4,
		gap: 4,
	},
	segment: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		gap: 6,
	},
	segmentLabel: {
		fontSize: 14,
		fontWeight: "600",
	},
	content: {
		flex: 1,
	},
	placeholder: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 40,
		gap: 12,
	},
	placeholderTitle: {
		fontSize: 22,
		fontWeight: "700",
		marginTop: 8,
	},
	placeholderDesc: {
		fontSize: 15,
		textAlign: "center",
		lineHeight: 22,
	},
	openButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 28,
		borderRadius: 12,
		gap: 8,
		marginTop: 12,
	},
	openButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});
