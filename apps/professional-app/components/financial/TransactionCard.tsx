import React from "react";
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	GestureResponderEvent,
	Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Badge } from "@/components/ui/Badge";
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

	const getStatusColor = () => {
		if (statusConfig.variant === "destructive") return colors.error;
		if (statusConfig.variant === "success") return colors.success;
		if (statusConfig.variant === "warning") return colors.warning;
		return colors.text;
	};

	return (
		<TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
			<Card style={[styles.card, style]} padding="none">
				<View style={styles.cardContent}>
					<View style={styles.topRow}>
						<View style={styles.patientInfo}>
							<View style={styles.avatarContainer}>
								{patientAvatar ? (
									<Image source={{ uri: patientAvatar }} style={styles.avatar} />
								) : (
									<View
										style={[
											styles.avatarPlaceholder,
											{ backgroundColor: colors.primary + "15" },
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
							<View style={styles.nameContainer}>
								<Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
									{patientName}
								</Text>
								<Text style={[styles.date, { color: colors.textSecondary }]}>
									{format(new Date(date), "dd/MM/yyyy")}
								</Text>
							</View>
						</View>
						
						<View style={styles.statusContainer}>
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
					</View>

					<View style={styles.middleRow}>
						<View style={styles.methodContainer}>
							<Ionicons
								name={methodIcon as any}
								size={14}
								color={colors.textSecondary}
							/>
							<Text style={[styles.methodText, { color: colors.textSecondary }]}>
								{paymentMethod || "Outro"}
							</Text>
						</View>
						<Text style={[styles.amount, { color: colors.text }]}>
							R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						</Text>
					</View>

					<View style={[styles.actionsRow, { borderTopColor: colors.border + "50" }]}>
						<View style={styles.mainActions}>
							{status === "paid" && onReceipt && (
								<TouchableOpacity
									onPress={(e) => {
										e.stopPropagation();
										onReceipt(e);
									}}
									style={[styles.actionBtn, { backgroundColor: colors.primary + "10" }]}
								>
									<Ionicons name="document-text" size={18} color={colors.primary} />
									<Text style={[styles.actionBtnText, { color: colors.primary }]}>Recibo</Text>
								</TouchableOpacity>
							)}
							{onEdit && (
								<TouchableOpacity
									onPress={(e) => {
										e.stopPropagation();
										onEdit(e);
									}}
									style={[styles.actionBtn, { backgroundColor: colors.surface }]}
								>
									<Ionicons name="pencil" size={18} color={colors.textSecondary} />
									<Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Editar</Text>
								</TouchableOpacity>
							)}
						</View>
						
						{onDelete && (
							<TouchableOpacity
								onPress={(e) => {
									e.stopPropagation();
									onDelete(e);
								}}
								style={styles.deleteBtn}
							>
								<Ionicons name="trash-outline" size={18} color={colors.error} />
							</TouchableOpacity>
						)}
					</View>
				</View>
			</Card>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 12,
	},
	card: {
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#f1f5f9",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 8,
		elevation: 2,
	},
	cardContent: {
		padding: 14,
	},
	topRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 12,
	},
	patientInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		marginRight: 12,
	},
	avatarContainer: {
		marginRight: 10,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
	},
	avatarPlaceholder: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarInitials: {
		fontSize: 14,
		fontWeight: "700",
	},
	nameContainer: {
		flex: 1,
	},
	patientName: {
		fontSize: 15,
		fontWeight: "700",
		marginBottom: 2,
	},
	date: {
		fontSize: 12,
		fontWeight: "500",
	},
	statusContainer: {
		alignItems: "flex-end",
	},
	middleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 14,
	},
	methodContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "#f8fafc",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	methodText: {
		fontSize: 12,
		fontWeight: "600",
	},
	amount: {
		fontSize: 18,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	actionsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 12,
		borderTopWidth: 1,
	},
	mainActions: {
		flexDirection: "row",
		gap: 8,
	},
	actionBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.03)",
	},
	actionBtnText: {
		fontSize: 12,
		fontWeight: "700",
	},
	deleteBtn: {
		padding: 8,
		borderRadius: 8,
	},
});
