import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

interface FeatureUnavailableProps {
	featureName: string;
	description?: string;
	showBackButton?: boolean;
	customMessage?: string;
}

export function FeatureUnavailable({
	featureName,
	description,
	showBackButton = true,
	customMessage,
}: FeatureUnavailableProps) {
	const colors = useColors();
	const router = useRouter();

	const defaultMessage =
		customMessage ||
		`O recurso "${featureName}" requer um build customizado do app e não está disponível no Expo Go.\n\n` +
			"Para testar esta funcionalidade, use um Development Build ou Production Build.";

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top", "left", "right", "bottom"]}
		>
			<View
				style={[styles.iconWrap, { backgroundColor: colors.warning + "20" }]}
			>
				<Ionicons name="construct" size={48} color={colors.warning} />
			</View>

			<Text style={[styles.title, { color: colors.text }]}>
				Recurso Indisponível no Expo Go
			</Text>

			<Text style={[styles.featureName, { color: colors.primary }]}>
				{featureName}
			</Text>

			{description && (
				<Text style={[styles.desc, { color: colors.textSecondary }]}>
					{description}
				</Text>
			)}

			<View
				style={[
					styles.msgBox,
					{ backgroundColor: colors.surface, borderColor: colors.border },
				]}
			>
				<Text style={[styles.msgText, { color: colors.text }]}>
					{defaultMessage}
				</Text>
			</View>

			{showBackButton && (
				<TouchableOpacity
					style={[styles.backBtn, { backgroundColor: colors.primary }]}
					onPress={() => router.back()}
				>
					<Ionicons name="arrow-back" size={20} color="#fff" />
					<Text style={styles.backBtnText}>Voltar</Text>
				</TouchableOpacity>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	iconWrap: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		marginBottom: 8,
		textAlign: "center",
	},
	featureName: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
		textAlign: "center",
	},
	desc: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
	msgBox: {
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 24,
		width: "100%",
	},
	msgText: { fontSize: 14, lineHeight: 22, textAlign: "center" },
	backBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 10,
		gap: 8,
	},
	backBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
