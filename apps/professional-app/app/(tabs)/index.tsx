import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl,
	TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { format, addHours, isBefore } from "date-fns";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { Card, Skeleton, SummaryCardSkeleton } from "@/components";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useHaptics } from "@/hooks/useHaptics";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useProtocols } from "@/hooks/useProtocols";
import { useExercisesLibrary } from "@/hooks/useExercises";
import { formatAppointmentTime } from "@/components/calendar/utils";

function DashboardSkeleton() {
	return (
		<>
			<View style={styles.statsGrid}>
				{[1, 2, 3, 4].map((i) => (
					<SummaryCardSkeleton key={i} />
				))}
			</View>
			<View style={{ gap: 12, marginBottom: 24 }}>
				<Skeleton width="100%" height={72} variant="rectangular" />
				<View style={{ flexDirection: "row", gap: 10 }}>
					{[1, 2, 3].map((i) => (
						<View key={i} style={{ flex: 1 }}>
							<Skeleton height={110} variant="rectangular" />
						</View>
					))}
				</View>
			</View>
			<View style={styles.sectionHeader}>
				<Skeleton width={160} height={24} variant="text" />
				<Skeleton width={80} height={16} variant="text" />
			</View>
			<View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} width={160} height={120} variant="rectangular" />
				))}
			</View>
			<View style={styles.sectionHeader}>
				<Skeleton width={160} height={24} variant="text" />
				<Skeleton width={80} height={16} variant="text" />
			</View>
			{[1, 2, 3].map((i) => (
				<Card key={i} style={styles.patientListItem}>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 14,
						}}
					>
						<Skeleton width={48} height={48} variant="circular" />
						<View style={{ flex: 1, gap: 6 }}>
							<Skeleton width="60%" height={16} variant="text" />
							<Skeleton width="40%" height={12} variant="text" />
						</View>
					</View>
				</Card>
			))}
		</>
	);
}

export default function DashboardScreen() {
	const colors = useColors();
	const { user } = useAuthStore();
	const { light } = useHaptics();
	const [refreshing, setRefreshing] = useState(false);

	const {
		data: stats,
		refetch: refetchStats,
		isLoading: isLoadingStats,
		error: statsError,
	} = useDashboardStats();
	const {
		data: appointments,
		refetch: refetchAppointments,
		isLoading: isLoadingAppointments,
		error: appointmentsError,
	} = useAppointments();
	const {
		data: recentPatients,
		isLoading: isLoadingPatients,
		error: patientsError,
	} = usePatients({ limit: 5 });
	const { protocols } = useProtocols();
	const { data: exercises } = useExercisesLibrary();

	if (statsError) console.error("[Dashboard] Stats error:", statsError);
	if (appointmentsError)
		console.error("[Dashboard] Appointments error:", appointmentsError);
	if (patientsError)
		console.error("[Dashboard] Patients error:", patientsError);

	const onRefresh = async () => {
		setRefreshing(true);
		light();
		await Promise.all([refetchStats(), refetchAppointments()]);
		setRefreshing(false);
	};

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Bom dia";
		if (hour < 18) return "Boa tarde";
		return "Boa noite";
	};

	const statCards = [
		{
			label: "Pacientes Ativos",
			value: stats?.activePatients ?? "...",
			icon: "people",
			color: colors.primary,
		},
		{
			label: "Consultas Hoje",
			value: stats?.todayAppointments ?? "...",
			icon: "calendar",
			color: colors.success,
		},
		{
			label: "Aguardando Conf.",
			value: stats?.pendingAppointments ?? "...",
			icon: "time",
			color: colors.warning,
		},
		{
			label: "Concluídas Hoje",
			value: stats?.completedAppointments ?? "...",
			icon: "checkmark-circle",
			color: colors.info,
		},
	];

	const now = new Date();
	const in24Hours = addHours(now, 24);
	const upcomingAppointments = appointments
		.filter((apt) => {
			const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
			return isBefore(aptDate, in24Hours) && isBefore(now, aptDate);
		})
		.sort((a, b) => {
			const dateA = a.date instanceof Date ? a.date : new Date(a.date);
			const dateB = b.date instanceof Date ? b.date : new Date(b.date);
			return dateA.getTime() - dateB.getTime();
		})
		.slice(0, 5);

	const isLoading =
		isLoadingStats || isLoadingAppointments || isLoadingPatients;

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["left", "right"]}
		>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={colors.primary}
					/>
				}
			>
				<View style={styles.header}>
					<View>
						<Text style={[styles.greeting, { color: colors.textSecondary }]}>
							{getGreeting()},
						</Text>
						<Text style={[styles.name, { color: colors.text }]}>
							{user?.name?.split(" ")[0] || "Profissional"}
						</Text>
					</View>
					<TouchableOpacity
						style={[
							styles.notificationBtn,
							{ backgroundColor: colors.surface },
						]}
						onPress={() => router.push("/notifications")}
					>
						<Ionicons
							name="notifications-outline"
							size={24}
							color={colors.text}
						/>
					</TouchableOpacity>
				</View>

				{isLoading && !refreshing ? (
					<DashboardSkeleton />
				) : (
					<>
						<View style={styles.statsGrid}>
							{statCards.map((stat, index) => (
								<Card key={index} style={styles.statCard}>
									<View
										style={[
											styles.statIcon,
											{ backgroundColor: stat.color + "20" },
										]}
									>
										<Ionicons
											name={stat.icon as any}
											size={24}
											color={stat.color}
										/>
									</View>
									<Text style={[styles.statValue, { color: colors.text }]}>
										{stat.value}
									</Text>
									<Text
										style={[styles.statLabel, { color: colors.textSecondary }]}
									>
										{stat.label}
									</Text>
								</Card>
							))}
						</View>

						<View style={styles.quickActions}>
							<TouchableOpacity
								style={[
									styles.quickActionCard,
									{ backgroundColor: colors.primary },
								]}
								onPress={() => router.push("/(app)/biomechanics")}
								activeOpacity={0.8}
							>
								<View style={styles.quickActionIcon}>
									<Ionicons name="film" size={28} color="#fff" />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.quickActionTitle}>Lab. Biomecânico</Text>
									<Text style={styles.quickActionSub}>
										Análise & Tracking AI
									</Text>
								</View>
								<Ionicons
									name="chevron-forward"
									size={20}
									color="rgba(255,255,255,0.6)"
								/>
							</TouchableOpacity>

							<View style={styles.quickActionsRow}>
								<TouchableOpacity
									style={[
										styles.quickActionMini,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() => router.push("/protocols" as any)}
									activeOpacity={0.8}
								>
									<View
										style={[
											styles.miniIcon,
											{ backgroundColor: "#6366F1" + "20" },
										]}
									>
										<Ionicons name="clipboard" size={22} color="#6366F1" />
									</View>
									<Text style={[styles.miniTitle, { color: colors.text }]}>
										Protocolos
									</Text>
									<Text
										style={[styles.miniSub, { color: colors.textSecondary }]}
									>
										{protocols.length > 0
											? `${protocols.length} disponíveis`
											: "Carregando..."}
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.quickActionMini,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() => router.push("/exercises" as any)}
									activeOpacity={0.8}
								>
									<View
										style={[
											styles.miniIcon,
											{ backgroundColor: "#10B981" + "20" },
										]}
									>
										<Ionicons name="fitness" size={22} color="#10B981" />
									</View>
									<Text style={[styles.miniTitle, { color: colors.text }]}>
										Exercícios
									</Text>
									<Text
										style={[styles.miniSub, { color: colors.textSecondary }]}
									>
										{exercises.length > 0
											? `${exercises.length} exercícios`
											: "Carregando..."}
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.quickActionMini,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() => router.push("/leaderboard" as any)}
									activeOpacity={0.8}
								>
									<View
										style={[
											styles.miniIcon,
											{ backgroundColor: "#F59E0B" + "20" },
										]}
									>
										<Ionicons name="trophy" size={22} color="#F59E0B" />
									</View>
									<Text style={[styles.miniTitle, { color: colors.text }]}>
										Ranking
									</Text>
									<Text
										style={[styles.miniSub, { color: colors.textSecondary }]}
									>
										Gamificação
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.quickActionMini,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() => router.push("/telemedicine" as any)}
									activeOpacity={0.8}
								>
									<View
										style={[
											styles.miniIcon,
											{ backgroundColor: "#10B981" + "20" },
										]}
									>
										<Ionicons name="videocam" size={22} color="#10B981" />
									</View>
									<Text style={[styles.miniTitle, { color: colors.text }]}>
										Teleconsulta
									</Text>
									<Text
										style={[styles.miniSub, { color: colors.textSecondary }]}
									>
										Atendimento online
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.quickActionMini,
										{
											backgroundColor: colors.surface,
											borderColor: colors.border,
										},
									]}
									onPress={() => router.push("/protocols?tab=tests" as any)}
									activeOpacity={0.8}
								>
									<View
										style={[
											styles.miniIcon,
											{ backgroundColor: "#8B5CF6" + "20" },
										]}
									>
										<Ionicons name="analytics" size={22} color="#8B5CF6" />
									</View>
									<Text style={[styles.miniTitle, { color: colors.text }]}>
										Testes
									</Text>
									<Text
										style={[styles.miniSub, { color: colors.textSecondary }]}
									>
										Escalas clínicas
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>
								Próximas Consultas
							</Text>
							<TouchableOpacity
								onPress={() => router.push("/(tabs)/agenda")}
								style={styles.seeAllBtn}
							>
								<Text style={[styles.seeAll, { color: colors.primary }]}>
									Ver Agenda
								</Text>
								<Ionicons
									name="arrow-forward"
									size={14}
									color={colors.primary}
									style={{ marginLeft: 2 }}
								/>
							</TouchableOpacity>
						</View>

						{upcomingAppointments.length === 0 ? (
							<Card style={styles.emptyCard}>
								<View
									style={[
										styles.emptyIconContainer,
										{ backgroundColor: colors.border },
									]}
								>
									<Ionicons
										name="calendar-clear-outline"
										size={32}
										color={colors.textMuted}
									/>
								</View>
								<Text style={[styles.emptyTitle, { color: colors.text }]}>
									Agenda Livre
								</Text>
								<Text
									style={[styles.emptyText, { color: colors.textSecondary }]}
								>
									Nenhuma consulta nas próximas 24h.
								</Text>
							</Card>
						) : (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.hScroll}
							>
								{upcomingAppointments.map((apt) => (
									<TouchableOpacity
										key={apt.id}
										onPress={() =>
											router.push(`/appointment-form?id=${apt.id}`)
										}
										activeOpacity={0.7}
									>
										<Card
											style={
												[
													styles.appointmentCard,
													{ backgroundColor: colors.surface },
												] as any
											}
										>
											<View style={styles.appointmentHeader}>
												<Ionicons
													name="time-outline"
													size={16}
													color={colors.primary}
												/>
												<Text
													style={[
														styles.appointmentTime,
														{ color: colors.primary },
													]}
												>
													{formatAppointmentTime(apt.time, apt.date)}
												</Text>
											</View>
											<Text
												style={[styles.patientName, { color: colors.text }]}
												numberOfLines={1}
											>
												{apt.patientName || "Paciente"}
											</Text>
											<View
												style={[
													styles.typeBadge,
													{
														backgroundColor: colors.primary + "15",
													},
												]}
											>
												<Text
													style={[
														styles.appointmentType,
														{ color: colors.primary },
													]}
													numberOfLines={1}
												>
													{apt.type}
												</Text>
											</View>
										</Card>
									</TouchableOpacity>
								))}
							</ScrollView>
						)}

						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>
								Pacientes Recentes
							</Text>
							<TouchableOpacity
								onPress={() => router.push("/(tabs)/patients")}
								style={styles.seeAllBtn}
							>
								<Text style={[styles.seeAll, { color: colors.primary }]}>
									Ver Todos
								</Text>
								<Ionicons
									name="arrow-forward"
									size={14}
									color={colors.primary}
									style={{ marginLeft: 2 }}
								/>
							</TouchableOpacity>
						</View>

						{recentPatients.length === 0 ? (
							<Card style={styles.emptyCard}>
								<View
									style={[
										styles.emptyIconContainer,
										{ backgroundColor: colors.border },
									]}
								>
									<Ionicons
										name="people-outline"
										size={32}
										color={colors.textMuted}
									/>
								</View>
								<Text style={[styles.emptyTitle, { color: colors.text }]}>
									Sem Pacientes
								</Text>
								<Text
									style={[styles.emptyText, { color: colors.textSecondary }]}
								>
									Comece cadastrando seu primeiro paciente.
								</Text>
							</Card>
						) : (
							<View style={styles.patientListContainer}>
								{recentPatients.map((p) => (
									<TouchableOpacity
										key={p.id}
										onPress={() => router.push(`/patient/${p.id}`)}
										activeOpacity={0.7}
									>
										<Card
											style={
												[
													styles.patientListItem,
													{ backgroundColor: colors.surface },
												] as any
											}
										>
											<View
												style={[
													styles.patientAvatar,
													{
														backgroundColor: colors.primary + "15",
													},
												]}
											>
												<Text
													style={[
														styles.patientAvatarText,
														{ color: colors.primary },
													]}
												>
													{p.name.charAt(0)}
												</Text>
											</View>
											<View style={styles.patientInfo}>
												<Text
													style={[
														styles.patientNameList,
														{ color: colors.text },
													]}
													numberOfLines={1}
												>
													{p.name}
												</Text>
												<Text
													style={[
														styles.patientCondition,
														{ color: colors.textSecondary },
													]}
													numberOfLines={1}
												>
													{p.condition || "Condição não informada"}
												</Text>
											</View>
											<View style={styles.actionArrow}>
												<Ionicons
													name="chevron-forward"
													size={20}
													color={colors.textMuted}
												/>
											</View>
										</Card>
									</TouchableOpacity>
								))}
							</View>
						)}
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	scrollContent: { padding: 16, paddingBottom: 48 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	greeting: { fontSize: 14, letterSpacing: 0.1 },
	name: {
		fontSize: 26,
		fontWeight: "800",
		letterSpacing: -0.8,
		lineHeight: 30,
	},
	notificationBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},
	statsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 16,
	},
	statCard: {
		width: "48%",
		flexGrow: 1,
		alignItems: "flex-start",
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderRadius: 14,
	},
	statIcon: {
		width: 36,
		height: 36,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	statValue: { fontSize: 22, fontWeight: "800" },
	statLabel: { fontSize: 11, marginTop: 2, lineHeight: 14 },
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
		marginTop: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	seeAllBtn: { flexDirection: "row", alignItems: "center", padding: 4 },
	seeAll: { fontSize: 13, fontWeight: "600" },
	emptyCard: {
		alignItems: "center",
		paddingVertical: 32,
		gap: 8,
		borderRadius: 16,
		borderStyle: "dashed",
	},
	emptyIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},
	emptyTitle: { fontSize: 15, fontWeight: "600" },
	emptyText: {
		fontSize: 13,
		textAlign: "center",
		paddingHorizontal: 20,
	},
	hScroll: { gap: 12, paddingRight: 16, paddingBottom: 6 },
	appointmentCard: { width: 150, padding: 14, borderRadius: 14 },
	appointmentHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginBottom: 8,
	},
	appointmentTime: { fontSize: 14, fontWeight: "700" },
	patientName: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
	typeBadge: {
		alignSelf: "flex-start",
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 5,
	},
	appointmentType: { fontSize: 11, fontWeight: "500" },
	patientListContainer: { gap: 10 },
	patientListItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 14,
	},
	patientAvatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	patientAvatarText: { fontSize: 16, fontWeight: "700" },
	patientInfo: { flex: 1, marginRight: 12 },
	patientNameList: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
	patientCondition: { fontSize: 12 },
	actionArrow: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(0,0,0,0.02)",
	},
	quickActions: { marginBottom: 20, gap: 12 },
	quickActionCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 18,
		gap: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.06,
		shadowRadius: 10,
		elevation: 3,
	},
	quickActionIcon: {
		width: 48,
		height: 48,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.2)",
		alignItems: "center",
		justifyContent: "center",
	},
	quickActionTitle: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "800",
		letterSpacing: -0.3,
	},
	quickActionSub: {
		color: "rgba(255,255,255,0.75)",
		fontSize: 11,
		fontWeight: "500",
		marginTop: 1,
	},
	quickActionsRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	quickActionMini: {
		width: "48.5%",
		alignItems: "flex-start",
		paddingHorizontal: 12,
		paddingVertical: 14,
		borderRadius: 14,
		borderWidth: 1,
		gap: 6,
		minHeight: 110,
	},
	miniIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	miniTitle: { fontSize: 13, fontWeight: "700" },
	miniSub: { fontSize: 11, lineHeight: 14 },
});
