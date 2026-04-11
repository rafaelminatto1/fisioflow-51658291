import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, BadgeCounter } from "@/components/ui/Badge";

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
	role = "Profissional",
	onAvatarPress,
	onSettingsPress,
	stats,
}: ProfileHeaderProps) {
	const colors = useColors();

	return (
		<SafeAreaView edges={["top"]} style={styles.container}>
			<View style={styles.content}>
				<View style={styles.headerTop}>
					<Text style={[styles.greeting, { color: colors.textSecondary }]}>
						Bem-vindo(a)
					</Text>
					<TouchableOpacity
						onPress={onSettingsPress}
						style={[styles.settingsButton, { backgroundColor: colors.surface }]}
						activeOpacity={0.7}
					>
						<Ionicons name="settings-outline" size={24} color={colors.text} />
					</TouchableOpacity>
				</View>

				<View style={styles.profileInfo}>
					<TouchableOpacity
						onPress={onAvatarPress}
						style={styles.avatarContainer}
						activeOpacity={0.7}
					>
						<Avatar
							source={avatar ? { uri: avatar as string } : undefined}
							fallback={name || "Usuário"}
							size="xl"
						/>
						<View
							style={[styles.cameraIcon, { backgroundColor: colors.primary }]}
						>
							<Ionicons name="camera-outline" size={16} color="#fff" />
						</View>
					</TouchableOpacity>

					<View style={styles.textContainer}>
						<Text style={[styles.name, { color: colors.text }]}>{name}</Text>
						{role && (
							<Badge variant="outline" style={styles.roleBadge}>
								{role}
							</Badge>
						)}
						{email && (
							<Text style={[styles.email, { color: colors.textSecondary }]}>
								{email}
							</Text>
						)}
					</View>
				</View>

				{stats && (
					<View
						style={[styles.statsContainer, { backgroundColor: colors.surface }]}
					>
						<StatCard
							label="Pacientes"
							value={stats.patients}
							icon="people"
							color="primary"
						/>
						<View
							style={[styles.statDivider, { backgroundColor: colors.border }]}
						/>
						<StatCard
							label="Agendamentos"
							value={stats.appointments}
							icon="calendar"
							color="success"
						/>
						<View
							style={[styles.statDivider, { backgroundColor: colors.border }]}
						/>
						<StatCard
							label="Concluídos"
							value={stats.completed}
							icon="checkmark-circle"
							color="info"
						/>
					</View>
				)}
			</View>
		</SafeAreaView>
	);
}

interface StatCardProps {
	label: string;
	value: number;
	icon?: keyof typeof Ionicons.prototype.props.name;
	color?: "primary" | "success" | "info" | "warning";
}

function StatCard({ label, value, icon, color = "primary" }: StatCardProps) {
	const colors = useColors();

	const getColor = () => {
		switch (color) {
			case "success":
				return colors.success;
			case "info":
				return colors.info;
			case "warning":
				return colors.warning;
			default:
				return colors.primary;
		}
	};

	return (
		<View style={styles.statCard}>
			{icon && (
				<View style={[styles.statIcon, { backgroundColor: getColor() + "15" }]}>
					<Ionicons name={icon as any} size={16} color={getColor()} />
				</View>
			)}
			<Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
			<Text style={[styles.statLabel, { color: colors.textMuted }]}>
				{label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: "transparent",
	},
	content: {
		padding: 16,
	},
	headerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 24,
	},
	greeting: {
		fontSize: 14,
		fontWeight: "500",
	},
	settingsButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	profileInfo: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 24,
	},
	avatarContainer: {
		position: "relative",
		marginRight: 16,
	},
	cameraIcon: {
		position: "absolute",
		bottom: 0,
		right: 0,
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "#fff",
	},
	textContainer: {
		flex: 1,
	},
	name: {
		fontSize: 24,
		fontWeight: "700",
		marginBottom: 4,
	},
	roleBadge: {
		alignSelf: "flex-start",
		marginBottom: 4,
	},
	email: {
		fontSize: 14,
	},
	statsContainer: {
		flexDirection: "row",
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
	},
	statCard: {
		flex: 1,
		alignItems: "center",
	},
	statIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	statValue: {
		fontSize: 20,
		fontWeight: "700",
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 12,
	},
	statDivider: {
		width: 1,
		height: 40,
	},
});
