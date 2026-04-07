import React from "react";
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	GestureResponderEvent,
	Image,
	ImageStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Badge, BadgeCounter } from "@/components/ui/Badge";
import { Card } from "@/components";
import { format } from "date-fns";

const PAYMENT_METHOD_ICONS: Record<
	string,
	keyof typeof Ionicons.prototype.props.name
> = {
	credit_card: "card-outline",
	debit_card: "card-outline",
	pix: "qr-code-outline",
	cash: "cash-outline",
	bank_transfer: "swap-horizontal-outline",
	insurance: "shield-checkmark-outline",
};

const STATUS_CONFIG: Record<
	string,
	{
		variant: "success" | "warning" | "destructive" | "outline";
		label: string;
		icon: keyof typeof Ionicons.prototype.props.name;
	}
> = {
	paid: {
		variant: "success",
		label: "Pago",
		icon: "checkmark-circle" as const,
	},
	pending: {
		variant: "warning",
		label: "Pendente",
		icon: "time-outline" as const,
	},
	overdue: {
		variant: "destructive",
		label: "Vencido",
		icon: "alert-circle" as const,
	},
	cancelled: {
		variant: "outline",
		label: "Cancelado",
		icon: "close-circle" as const,
	},
};

interface TransactionCardProps {
	id: string;
	patientName: string;
	patientAvatar?: string;
	amount: number;
	date: string;
	paymentMethod?: string;
	status: string;
	onPress?: () => void;
	onEdit?: (event: GestureResponderEvent) => void;
	onDelete?: (event: GestureResponderEvent) => void;
	onReceipt?: (event: GestureResponderEvent) => void;
	style?: any;
}

export function TransactionCard({
	id,
	patientName,
	patientAvatar,
	amount,
	date,
	paymentMethod,
	status,
	onPress,
	onEdit,
	onDelete,
	onReceipt,
	style,
}: TransactionCardProps) {
	const colors = useColors();
	const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
	const methodIcon = (PAYMENT_METHOD_ICONS[paymentMethod || ""] ||
		"wallet-outline") as keyof typeof Ionicons.prototype.props.name;

	const handlePress = (event: GestureResponderEvent) => {
		if (onPress) onPress();
	};

	const getStatusColor = () => {
		if (statusConfig.variant === "destructive") return colors.error;
		if (statusConfig.variant === "success") return colors.success;
		if (statusConfig.variant === "warning") return colors.warning;
		return colors.text;
	};

	return (
		<TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
			<Card style={{ ...styles.card, ...(style || {}) }} padding="none">
				<View style={styles.cardContent}>
					<View style={styles.mainContent}>
						<View style={styles.avatarContainer}>
							{patientAvatar ? (
								<Image source={{ uri: patientAvatar }} style={styles.avatar} />
							) : (
								<View
									style={[
										styles.avatarPlaceholder,
										{ backgroundColor: colors.primary + "20" },
									]}
								>
									<Text
										style={[styles.avatarInitials, { color: colors.primary }]}
									>
										{patientName.charAt(0).toUpperCase()}
									</Text>
								</View>
							)}
						</View>

						<View style={styles.content}>
							<View style={styles.header}>
								<Text style={[styles.patientName, { color: colors.text }]}>
									{patientName}
								</Text>
								<Badge
									variant={statusConfig.variant}
									icon={
										<Ionicons
											name={statusConfig.icon as any}
											size={12}
											color={getStatusColor()}
										/>
									}
								>
									{statusConfig.label}
								</Badge>
							</View>

							<View style={styles.subheader}>
								<Text style={[styles.date, { color: colors.textSecondary }]}>
									{format(new Date(date), "dd/MM/yyyy")}
								</Text>
								<View
									style={[styles.separator, { backgroundColor: colors.border }]}
								/>
								<View style={styles.method}>
									<Ionicons
										name={methodIcon as any}
										size={14}
										color={colors.textSecondary}
									/>
									<Text
										style={[styles.methodText, { color: colors.textSecondary }]}
									>
										{paymentMethod || "Outro"}
									</Text>
								</View>
							</View>

							<View style={styles.amountContainer}>
								<Text style={[styles.amount, { color: colors.text }]}>
									R${" "}
									{amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
								</Text>
							</View>
						</View>
					</View>

					<View style={[styles.actions, { borderTopColor: colors.border }]}>
						{status === "paid" && onReceipt && (
							<TouchableOpacity
								onPress={(e) => {
									e.stopPropagation();
									onReceipt(e);
								}}
								style={styles.actionButton}
							>
								<Ionicons
									name="document-text-outline"
									size={20}
									color={colors.primary}
								/>
							</TouchableOpacity>
						)}
						{onEdit && (
							<TouchableOpacity
								onPress={(e) => {
									e.stopPropagation();
									onEdit(e);
								}}
								style={styles.actionButton}
							>
								<Ionicons
									name="pencil-outline"
									size={20}
									color={colors.textSecondary}
								/>
							</TouchableOpacity>
						)}
						{onDelete && (
							<TouchableOpacity
								onPress={(e) => {
									e.stopPropagation();
									onDelete(e);
								}}
								style={styles.actionButton}
							>
								<Ionicons name="trash-outline" size={20} color={colors.error} />
							</TouchableOpacity>
						)}
						<View style={[styles.chevron, { borderColor: colors.border }]}>
							<Ionicons
								name="chevron-forward"
								size={20}
								color={colors.textMuted}
							/>
						</View>
					</View>
				</View>
			</Card>
		</TouchableOpacity>
	);
}

interface TransactionCardCompactProps {
	patientName: string;
	amount: number;
	date: string;
	status: string;
	onPress?: () => void;
}

export function TransactionCardCompact({
	patientName,
	amount,
	date,
	status,
	onPress,
}: TransactionCardCompactProps) {
	const colors = useColors();
	const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

	return (
		<TouchableOpacity onPress={onPress} activeOpacity={0.7}>
			<View style={[styles.compactCard, { borderBottomColor: colors.border }]}>
				<View style={styles.compactContent}>
					<View
						style={[
							styles.compactAvatarPlaceholder,
							{ backgroundColor: colors.primary + "20" },
						]}
					>
						<Text
							style={[styles.compactAvatarInitials, { color: colors.primary }]}
						>
							{patientName.charAt(0).toUpperCase()}
						</Text>
					</View>

					<View style={styles.compactText}>
						<Text style={[styles.compactName, { color: colors.text }]}>
							{patientName}
						</Text>
						<Text style={[styles.compactDate, { color: colors.textSecondary }]}>
							{format(new Date(date), "dd/MM/yyyy")}
						</Text>
					</View>
				</View>

				<View style={styles.compactRight}>
					<Text style={[styles.compactAmount, { color: colors.text }]}>
						R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
					</Text>
					<Badge variant={statusConfig.variant} style={styles.compactBadge}>
						{statusConfig.label}
					</Badge>
				</View>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		marginBottom: 12,
	},
	cardContent: {
		padding: 16,
	},
	mainContent: {
		flexDirection: "row",
		marginBottom: 12,
	},
	avatarContainer: {
		marginRight: 12,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
	},
	avatarPlaceholder: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarInitials: {
		fontSize: 20,
		fontWeight: "700",
	},
	content: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 6,
	},
	patientName: {
		fontSize: 16,
		fontWeight: "600",
		flex: 1,
	},
	subheader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	date: {
		fontSize: 13,
	},
	separator: {
		width: 1,
		height: 12,
		marginHorizontal: 8,
	},
	method: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	methodText: {
		fontSize: 13,
	},
	amountContainer: {
		marginTop: 4,
	},
	amount: {
		fontSize: 24,
		fontWeight: "700",
	},
	actions: {
		flexDirection: "row",
		alignItems: "center",
		paddingTop: 12,
		borderTopWidth: 1,
		gap: 8,
	},
	actionButton: {
		padding: 8,
		borderRadius: 8,
	},
	chevron: {
		marginLeft: "auto",
		padding: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
	compactCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	compactContent: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	compactAvatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	compactAvatarInitials: {
		fontSize: 16,
		fontWeight: "700",
	},
	compactText: {
		flex: 1,
	},
	compactName: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 2,
	},
	compactDate: {
		fontSize: 12,
	},
	compactRight: {
		alignItems: "flex-end",
	},
	compactAmount: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 4,
	},
	compactBadge: {
		paddingVertical: 2,
		paddingHorizontal: 8,
	},
});
