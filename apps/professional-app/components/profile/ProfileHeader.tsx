import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColorScheme";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

const { width } = Dimensions.get("window");

interface ProfileHeaderProps {
	name?: string;
	email?: string;
	avatar?: string | number;
	role?: string;
	onAvatarPress?: () => void;
	onSettingsPress?: () => void;
	stats?: {
		patients: number;
		appointments: number;
		completed: number;
	};
}

export function ProfileHeader({
	name,
	email,
	avatar,
	role = "Fisioterapeuta",
	onAvatarPress,
	onSettingsPress,
	stats,
}: ProfileHeaderProps) {
	const colors = useColors();

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				{/* Professional Identity Card */}
				<View style={[styles.idCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					<View style={styles.idCardContent}>
						<TouchableOpacity
							onPress={onAvatarPress}
							style={styles.avatarWrapper}
							activeOpacity={0.8}
						>
							<View style={[styles.avatarBorder, { borderColor: colors.primary + "30" }]}>
								<Avatar
									source={avatar ? { uri: avatar as string } : undefined}
									fallback={name || "FF"}
									size="xl"
								/>
							</View>
							<View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
								<Ionicons name="camera" size={14} color="#fff" />
							</View>
						</TouchableOpacity>

						<View style={styles.infoWrapper}>
							<Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
								{name}
							</Text>
							<View style={styles.roleRow}>
								<View style={[styles.roleDot, { backgroundColor: colors.success }]} />
								<Text style={[styles.roleText, { color: colors.textSecondary }]}>
									{role}
								</Text>
							</View>
							<Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
								{email}
							</Text>
						</View>
					</View>

					{/* Action buttons inside card */}
					<View style={[styles.cardFooter, { borderTopColor: colors.border + "50" }]}>
						<TouchableOpacity style={styles.cardAction} onPress={onAvatarPress}>
							<Ionicons name="create-outline" size={16} color={colors.primary} />
							<Text style={[styles.cardActionText, { color: colors.primary }]}>Editar Perfil</Text>
						</TouchableOpacity>
						<View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
						<TouchableOpacity style={styles.cardAction} onPress={() => {}}>
							<Ionicons name="share-outline" size={16} color={colors.primary} />
							<Text style={[styles.cardActionText, { color: colors.primary }]}>Compartilhar</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Quick Stats Grid */}
				{stats && (
					<View style={styles.statsGrid}>
						<StatItem
							label="Pacientes"
							value={stats.patients}
							icon="people"
							color={colors.primary}
						/>
						<StatItem
							label="Agenda Hoje"
							value={stats.appointments}
							icon="calendar"
							color={colors.info}
						/>
						<StatItem
							label="Concluídos"
							value={stats.completed}
							icon="checkmark-done"
							color={colors.success}
						/>
					</View>
				)}
			</View>
		</View>
	);
}

function StatItem({ label, value, icon, color }: { label: string; value: number; icon: any; color: string }) {
	const colors = useColors();
	return (
		<View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
			<View style={[styles.statIconCircle, { backgroundColor: color + "10" }]}>
				<Ionicons name={icon} size={18} color={color} />
			</View>
			<Text style={[styles.statNumber, { color: colors.text }]}>{value}</Text>
			<Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "relative",
		paddingBottom: 10,
	},
	content: {
		paddingHorizontal: 20,
		paddingTop: 10,
	},
	topBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
	},
	topTitle: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.8,
	},
	settingsButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.2)",
		alignItems: "center",
		justifyContent: "center",
	},
	idCard: {
		borderRadius: 24,
		padding: 20,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.05,
		shadowRadius: 20,
		elevation: 5,
		marginBottom: 20,
	},
	idCardContent: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
	},
	avatarWrapper: {
		position: "relative",
	},
	avatarBorder: {
		padding: 4,
		borderRadius: 50,
		borderWidth: 2,
	},
	editBadge: {
		position: "absolute",
		bottom: 0,
		right: 0,
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 3,
		borderColor: "#fff",
	},
	infoWrapper: {
		flex: 1,
		marginLeft: 16,
	},
	name: {
		fontSize: 22,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	roleRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	roleDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 6,
	},
	roleText: {
		fontSize: 13,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	email: {
		fontSize: 13,
		opacity: 0.8,
	},
	cardFooter: {
		flexDirection: "row",
		borderTopWidth: 1,
		paddingTop: 16,
		marginHorizontal: -4,
	},
	cardAction: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
	cardActionText: {
		fontSize: 13,
		fontWeight: "700",
	},
	actionDivider: {
		width: 1,
		height: 20,
	},
	statsGrid: {
		flexDirection: "row",
		gap: 12,
	},
	statBox: {
		flex: 1,
		borderRadius: 20,
		padding: 16,
		alignItems: "center",
		borderWidth: 1,
	},
	statIconCircle: {
		width: 36,
		height: 36,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	statNumber: {
		fontSize: 18,
		fontWeight: "800",
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 10,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		textAlign: "center",
	},
});
