import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Button } from "@/components";

export type EmptyStateVariant = "default" | "no-results" | "initial" | "error";

interface EmptyStateProps {
	icon?: keyof typeof Ionicons.prototype.props.name;
	title: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	illustration?: "3d" | "flat" | "minimal";
	variant?: EmptyStateVariant;
}

export function EmptyState({
	icon = "cube-outline",
	title,
	description,
	actionLabel,
	onAction,
	illustration = "minimal",
	variant = "default",
}: EmptyStateProps) {
	const colors = useColors();

	const getVariantStyles = () => {
		switch (variant) {
			case "no-results":
				return {
					iconColor: colors.textMuted,
					titleColor: colors.text,
				};
			case "initial":
				return {
					iconColor: colors.primary,
					titleColor: colors.text,
				};
			case "error":
				return {
					iconColor: colors.error,
					titleColor: colors.text,
				};
			default:
				return {
					iconColor: colors.textMuted,
					titleColor: colors.textSecondary,
				};
		}
	};

	const variantStyles = getVariantStyles();

	return (
		<View style={styles.container}>
			<View
				style={[
					styles.iconContainer,
					{
						backgroundColor:
							variant === "error" ? colors.errorLight + "30" : colors.surface,
					},
				]}
			>
				<Ionicons
					name={icon as any}
					size={64}
					color={variantStyles.iconColor}
				/>
			</View>

			<Text style={[styles.title, { color: variantStyles.titleColor }]}>
				{title}
			</Text>

			{description && (
				<Text style={[styles.description, { color: colors.textMuted }]}>
					{description}
				</Text>
			)}

			{actionLabel && onAction && (
				<View style={styles.buttonContainer}>
					<Button
						title={actionLabel}
						onPress={onAction}
						variant="primary"
						size="lg"
					/>
				</View>
			)}
		</View>
	);
}

interface EmptyStateWithIllustrationProps {
	title: string;
	description: string;
	actionLabel?: string;
	onAction?: () => void;
	illustration?: "3d" | "flat" | "minimal";
}

export function EmptyStateWithIllustration({
	title,
	description,
	actionLabel,
	onAction,
	illustration = "minimal",
}: EmptyStateWithIllustrationProps) {
	const colors = useColors();

	return (
		<View style={styles.illustratedContainer}>
			<View style={styles.illustrationContainer}>
				<View
					style={[
						styles.illustrationCircle,
						{ backgroundColor: colors.primary + "10" },
					]}
				>
					<Ionicons name="cube-outline" size={80} color={colors.primary} />
				</View>
				<View
					style={[
						styles.illustrationSmallCircle,
						{ backgroundColor: colors.success + "15" },
					]}
				/>
				<View
					style={[
						styles.illustrationSmallCircle2,
						{ backgroundColor: colors.warning + "15" },
					]}
				/>
			</View>

			<Text style={[styles.illustratedTitle, { color: colors.text }]}>
				{title}
			</Text>

			<Text
				style={[styles.illustratedDescription, { color: colors.textSecondary }]}
			>
				{description}
			</Text>

			{actionLabel && onAction && (
				<View style={styles.illustratedButtonContainer}>
					<Button
						title={actionLabel}
						onPress={onAction}
						variant="primary"
						size="lg"
					/>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 60,
		paddingHorizontal: 32,
	},
	iconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 8,
	},
	description: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
		marginBottom: 24,
	},
	buttonContainer: {
		width: "100%",
		maxWidth: 280,
	},
	illustratedContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 60,
		paddingHorizontal: 32,
	},
	illustrationContainer: {
		position: "relative",
		width: 200,
		height: 200,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 32,
	},
	illustrationCircle: {
		width: 140,
		height: 140,
		borderRadius: 70,
		alignItems: "center",
		justifyContent: "center",
	},
	illustrationSmallCircle: {
		position: "absolute",
		top: 20,
		right: 30,
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	illustrationSmallCircle2: {
		position: "absolute",
		bottom: 30,
		left: 20,
		width: 32,
		height: 32,
		borderRadius: 16,
	},
	illustratedTitle: {
		fontSize: 20,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 12,
	},
	illustratedDescription: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 22,
		marginBottom: 32,
		maxWidth: 320,
	},
	illustratedButtonContainer: {
		width: "100%",
		maxWidth: 280,
	},
});
