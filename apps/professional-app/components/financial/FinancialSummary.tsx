import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";
import { Badge } from "@/components/ui/Badge";

interface FinancialSummaryCardProps {
	title: string;
	amount: number;
	subtitle?: string;
	trend?: {
		value: number;
		label: string;
		positive?: boolean;
	};
	icon: keyof typeof Ionicons.prototype.props.name;
	variant?: "success" | "warning" | "primary" | "info";
	onPress?: () => void;
}

export function FinancialSummaryCard({
	title,
	amount,
	subtitle,
	trend,
	icon,
	variant = "primary",
	onPress,
}: FinancialSummaryCardProps) {
	const colors = useColors();

	const getVariantStyles = () => {
		switch (variant) {
			case "success":
				return {
					backgroundColor: colors.success + "10",
					iconColor: colors.success,
					borderColor: colors.success + "20",
				};
			case "warning":
				return {
					backgroundColor: colors.warning + "10",
					iconColor: colors.warning,
					borderColor: colors.warning + "20",
				};
			case "info":
				return {
					backgroundColor: colors.info + "10",
					iconColor: colors.info,
					borderColor: colors.info + "20",
				};
			default:
				return {
					backgroundColor: colors.primary + "10",
					iconColor: colors.primary,
					borderColor: colors.primary + "20",
				};
		}
	};

	const variantStyles = getVariantStyles();

	return (
		<TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
			<Card
				style={{
					...styles.card,
					backgroundColor: variantStyles.backgroundColor,
					borderColor: variantStyles.borderColor,
				}}
				padding="md"
			>
				<View style={styles.content}>
					<View
						style={[
							styles.iconContainer,
							{ backgroundColor: variantStyles.backgroundColor },
						]}
					>
						<Ionicons
							name={icon as any}
							size={24}
							color={variantStyles.iconColor}
						/>
					</View>

					<View style={styles.textContainer}>
						<Text style={[styles.title, { color: colors.textSecondary }]}>
							{title}
						</Text>
						<Text style={[styles.amount, { color: colors.text }]}>
							R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						</Text>
						{subtitle && (
							<Text style={[styles.subtitle, { color: colors.textMuted }]}>
								{subtitle}
							</Text>
						)}
					</View>

					{trend && (
						<View style={styles.trendContainer}>
							<Ionicons
								name={
									trend.positive !== false ? "trending-up" : "trending-down"
								}
								size={16}
								color={trend.positive !== false ? colors.success : colors.error}
							/>
							<Text
								style={[
									styles.trendValue,
									{
										color:
											trend.positive !== false ? colors.success : colors.error,
									},
								]}
							>
								{Math.abs(trend.value).toFixed(1)}%
							</Text>
							<Text
								style={[styles.trendLabel, { color: colors.textSecondary }]}
							>
								{trend.label}
							</Text>
						</View>
					)}
				</View>
			</Card>
		</TouchableOpacity>
	);
}

interface FinancialSummaryGridProps {
	cards: Array<{
		title: string;
		amount: number;
		subtitle?: string;
		trend?: {
			value: number;
			label: string;
			positive?: boolean;
		};
		icon: keyof typeof Ionicons.prototype.props.name;
		variant?: "success" | "warning" | "primary" | "info";
		onPress?: () => void;
	}>;
}

export function FinancialSummaryGrid({ cards }: FinancialSummaryGridProps) {
	const colors = useColors();

	return (
		<View style={styles.grid}>
			{cards.map((card, index) => (
				<FinancialSummaryCard key={index} {...card} />
			))}
		</View>
	);
}

interface StatCardProps {
	label: string;
	value: string | number;
	icon?: keyof typeof Ionicons.prototype.props.name;
	color?: "success" | "warning" | "error" | "primary";
}

export function StatCard({
	label,
	value,
	icon,
	color = "primary",
}: StatCardProps) {
	const colors = useColors();

	const getColor = () => {
		switch (color) {
			case "success":
				return colors.success;
			case "warning":
				return colors.warning;
			case "error":
				return colors.error;
			default:
				return colors.primary;
		}
	};

	return (
		<View style={styles.statCard}>
			{icon && (
				<Ionicons
					name={icon as any}
					size={16}
					color={getColor()}
					style={styles.statIcon}
				/>
			)}
			<Text style={[styles.statLabel, { color: colors.textSecondary }]}>
				{label}
			</Text>
			<Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderRadius: 16,
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	textContainer: {
		flex: 1,
	},
	title: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 4,
	},
	amount: {
		fontSize: 24,
		fontWeight: "700",
		marginBottom: 2,
	},
	subtitle: {
		fontSize: 12,
	},
	trendContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	trendValue: {
		fontSize: 14,
		fontWeight: "700",
	},
	trendLabel: {
		fontSize: 12,
	},
	grid: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 24,
	},
	gridCard: {
		flex: 1,
	},
	statCard: {
		alignItems: "center",
		flex: 1,
	},
	statIcon: {
		marginBottom: 6,
	},
	statLabel: {
		fontSize: 12,
		marginBottom: 4,
		textAlign: "center",
	},
	statValue: {
		fontSize: 16,
		fontWeight: "700",
		textAlign: "center",
	},
});
