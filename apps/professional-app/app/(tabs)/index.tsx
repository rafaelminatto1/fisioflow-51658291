import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl,
	TouchableOpacity,
	Image,
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

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty?.toLowerCase()) {
			case 'easy':
			case 'iniciante':
				return colors.success;
			case 'medium':
			case 'intermediario':
				return colors.warning;
			case 'hard':
			case 'avancado':
				return colors.error;
			default:
				return colors.textSecondary;
		}
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top", "left", "right"]}
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
								<Card 
									key={index} 
									style={[
										styles.statCard, 
										{ 
											backgroundColor: colors.surface + 'B0', // Glass effect
											borderColor: stat.color + '35', // Standardized low-opacity border
											borderWidth: 1.5,
										}
									]}
								>
									<View
										style={[
											styles.statIcon,
											{ 
												backgroundColor: stat.color + "15", // Softer backdrop
												shadowColor: stat.color,
												shadowOffset: { width: 0, height: 4 }, // Integrated glow
												shadowOpacity: 0.35,
												shadowRadius: 8,
												elevation: 3,
											},
										]}
									>
										<Ionicons
											name={stat.icon as any}
											size={20} // Slightly more compact
											color={stat.color}
										/>
									</View>
									<View style={styles.statContent}>
										<Text style={[styles.statValue, { color: colors.text }]}>
											{stat.value}
										</Text>
										<Text
											style={[styles.statLabel, { color: colors.textSecondary }]}
											numberOfLines={1}
										>
											{stat.label}
										</Text>
									</View>
								</Card>
							))}
						</View>

						<View style={styles.quickActions}>
							{/* Hero Feature Card */}
							<TouchableOpacity
								style={[
									styles.heroActionCard, 
									{ 
										backgroundColor: colors.primary, 
										borderColor: 'rgba(255,255,255,0.15)',
										borderWidth: 1.5,
									}
								]}
								onPress={() => { medium(); router.push("/biomechanics" as any); }}
								activeOpacity={0.9}
							>
								<View style={styles.heroBackgroundPattern} />
								<View style={styles.heroContent}>
									<View style={styles.heroIconContainer}>
										<View style={[styles.iconGlow, { backgroundColor: '#fff', opacity: 0.25 }]} />
										<Ionicons name="sparkles" size={28} color="#fff" />
									</View>
									<View style={{ flex: 1 }}>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
											<Text style={styles.heroTitle}>Lab. Biomecânico</Text>
											<View style={styles.heroBadge}>
												<Text style={styles.heroBadgeText}>PRO</Text>
											</View>
										</View>
										<Text style={styles.heroSub}>Análise de movimento com IA Vision</Text>
									</View>
									<Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
								</View>
							</TouchableOpacity>

							{/* Grid Actions */}
							<View style={styles.quickActionsGrid}>
								<TouchableOpacity
									style={[
										styles.gridActionItem, 
										{ 
											backgroundColor: colors.surface + 'B0', // Glass Action
											borderColor: colors.border + '40',
										}
									]}
									onPress={() => { light(); router.push("/exercises" as any); }}
									activeOpacity={0.7}
								>
									<View style={[styles.gridIcon, { backgroundColor: colors.success + "12" }]}>
										<Ionicons name="fitness" size={22} color={colors.success} />
									</View>
									<View>
										<Text style={[styles.gridTitle, { color: colors.text }]}>Biblioteca</Text>
										<Text style={[styles.gridSub, { color: colors.textSecondary }]}>{exercises.length} itens</Text>
									</View>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.gridActionItem, 
										{ 
											backgroundColor: colors.surface + 'B0', 
											borderColor: colors.border + '40',
										}
									]}
									onPress={() => { light(); router.push("/protocols" as any); }}
									activeOpacity={0.7}
								>
									<View style={[styles.gridIcon, { backgroundColor: "#6366F112" }]}>
										<Ionicons name="clipboard" size={22} color="#6366F1" />
									</View>
									<View>
										<Text style={[styles.gridTitle, { color: colors.text }]}>Protocolos</Text>
										<Text style={[styles.gridSub, { color: colors.textSecondary }]}>{protocols.length} ativos</Text>
									</View>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.gridActionItem, 
										{ 
											backgroundColor: colors.surface + 'B0', 
											borderColor: colors.border + '40',
										}
									]}
									onPress={() => { light(); router.push("/telemedicine" as any); }}
									activeOpacity={0.7}
								>
									<View style={[styles.gridIcon, { backgroundColor: "#10B98112" }]}>
										<Ionicons name="chatbubbles" size={22} color="#10B981" />
									</View>
									<View>
										<Text style={[styles.gridTitle, { color: colors.text }]}>Teleconsulta</Text>
										<Text style={[styles.gridSub, { color: colors.textSecondary }]}>Chat & Vídeo</Text>
									</View>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.gridActionItem, 
										{ 
											backgroundColor: colors.surface + 'B0', 
											borderColor: colors.border + '40',
										}
									]}
									onPress={() => { light(); router.push("/leaderboard" as any); }}
									activeOpacity={0.7}
								>
									<View style={[styles.gridIcon, { backgroundColor: "#F59E0B12" }]}>
										<Ionicons name="trophy" size={22} color="#F59E0B" />
									</View>
									<View>
										<Text style={[styles.gridTitle, { color: colors.text }]}>Ranking</Text>
										<Text style={[styles.gridSub, { color: colors.textSecondary }]}>Sua posição: 1º</Text>
									</View>
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
								Exercícios em Destaque
							</Text>
							<TouchableOpacity
								onPress={() => router.push("/exercises")}
								style={styles.seeAllBtn}
							>
								<Text style={[styles.seeAll, { color: colors.primary }]}>
									Biblioteca
								</Text>
								<Ionicons
									name="arrow-forward"
									size={14}
									color={colors.primary}
									style={{ marginLeft: 2 }}
								/>
							</TouchableOpacity>
						</View>

						{exercises.length === 0 ? (
							<Card style={styles.emptyCard}>
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
									Carregando biblioteca...
								</Text>
							</Card>
						) : (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.hScroll}
							>
								{exercises.slice(0, 6).map((ex) => (
									<TouchableOpacity
										key={ex.id}
										onPress={() =>
											router.push(`/exercises/${ex.id}`)
										}
										activeOpacity={0.7}
									>
										<Card
											style={
												[
													styles.exerciseMiniCard,
													{ 
														backgroundColor: colors.surface + 'F0',
														borderColor: colors.border + '30',
														borderWidth: 1,
													},
												] as any
											}
										>
												<View style={styles.exerciseCardHeader}>
													{ex.imageUrl ? (
														<Image 
															source={{ uri: ex.imageUrl }} 
															style={styles.exerciseMiniImage} 
															resizeMode="cover"
														/>
													) : (
														<View style={[styles.exerciseMiniPlaceholder, { backgroundColor: colors.border + '25' }]}>
															<Ionicons name="fitness-outline" size={24} color={colors.textMuted} />
														</View>
													)}
													<View style={styles.premiumOverlay} />
													<View style={[styles.miniDifficultyBadge, { backgroundColor: 'rgba(0,0,0,0.45)' } as any]}>
														<View style={[
															styles.difficultyDot, 
															{ 
																backgroundColor: getDifficultyColor(ex.difficulty),
																shadowColor: getDifficultyColor(ex.difficulty),
																shadowOpacity: 1,
																shadowRadius: 4,
																elevation: 2
															}
														]} />
														<Text style={styles.miniDifficultyText}>
															{(ex.difficulty === 'easy' || ex.difficulty === 'iniciante') ? 'FÁCIL' : (ex.difficulty === 'medium' || ex.difficulty === 'intermediario') ? 'MÉDIO' : 'DIFÍCIL'}
														</Text>
													</View>
												</View>
											<View style={styles.miniCardContent}>
												<Text
													style={[styles.exerciseMiniName, { color: colors.text }]}
													numberOfLines={1}
												>
													{ex.name}
												</Text>
												<View style={styles.miniMetadataRow}>
													<Text
														style={[styles.exerciseMiniCat, { color: colors.primary }]}
														numberOfLines={1}
													>
														{ex.category}
													</Text>
													{ex.bodyParts && ex.bodyParts.length > 0 && (
														<Text style={[styles.miniBodyPart, { color: colors.textSecondary }]}>
															• {ex.bodyParts[0]}
														</Text>
													)}
												</View>
											</View>
										</Card>
									</TouchableOpacity>
								))}
							</ScrollView>
						)}

						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>
								Protocolos Recentes
							</Text>
							<TouchableOpacity
								onPress={() => router.push("/protocols")}
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

						{protocols.length === 0 ? (
							<Card style={styles.emptyCard}>
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
									Nenhum protocolo criado ainda.
								</Text>
							</Card>
						) : (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.hScroll}
							>
								{protocols.slice(0, 5).map((p) => (
									<TouchableOpacity
										key={p.id}
										onPress={() => router.push(`/protocols/${p.id}`)}
										activeOpacity={0.7}
									>
										<Card
											style={[
												styles.protocolMiniCard,
												{ 
													backgroundColor: colors.surface + 'A5', // Subtly more transparent
													borderColor: colors.border + '25',
													borderWidth: 1.2,
												}
											]}
										>
											<View style={[styles.protocolIconContainer, { backgroundColor: colors.primary + '12' }]}>
												<Ionicons name="document-text-outline" size={18} color={colors.primary} />
											</View>
											<Text style={[styles.protocolName, { color: colors.text }]} numberOfLines={1}>
												{p.name}
											</Text>
											<View style={styles.protocolMeta}>
												<Text style={[styles.protocolCategory, { color: colors.primary }]} numberOfLines={1}>
													{p.category}
												</Text>
												<Text style={[styles.protocolDot, { color: colors.textMuted }]}>•</Text>
												<Text style={[styles.protocolCondition, { color: colors.textSecondary }]} numberOfLines={1}>
													{p.condition || 'Geral'}
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
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderRadius: 20,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 2,
	},
	statIcon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		elevation: 4,
	},
	statContent: {
		flex: 1,
	},
	statValue: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
	statLabel: { fontSize: 11, marginTop: 1, fontWeight: '600', opacity: 0.7 },
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
	quickActions: { marginBottom: 24, gap: 16 },
	heroActionCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 20,
		borderRadius: 24,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 16,
		elevation: 8,
	},
	heroBackgroundPattern: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(255,255,255,0.05)",
		// Pattern placeholder - in a real app we'd use a decorative SVG or Image
	},
	heroContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
		flex: 1,
	},
	heroIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
	},
	iconGlow: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 18,
		backgroundColor: "#fff",
		opacity: 0.2,
		transform: [{ scale: 1.2 }],
	},
	heroTitle: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "900",
		letterSpacing: -0.5,
	},
	heroSub: {
		color: "rgba(255,255,255,0.85)",
		fontSize: 13,
		fontWeight: "500",
	},
	heroBadge: {
		backgroundColor: "rgba(255,255,255,0.2)",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	heroBadgeText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "800",
	},
	quickActionsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	gridActionItem: {
		width: "48.2%",
		padding: 16,
		borderRadius: 20,
		borderWidth: 1,
		gap: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 2,
	},
	gridIcon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	gridTitle: {
		fontSize: 15,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	gridSub: {
		fontSize: 11,
		fontWeight: "500",
		lineHeight: 14,
	},
	exerciseMiniCard: {
		width: 175,
		padding: 0,
		borderRadius: 24,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.12,
		shadowRadius: 16,
		elevation: 6,
		marginRight: 4,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.05)',
	},
	exerciseMiniImage: {
		width: "100%",
		height: 120,
	},
	exerciseMiniPlaceholder: {
		width: "100%",
		height: 120,
		alignItems: "center",
		justifyContent: "center",
	},
	exerciseCardHeader: {
		position: "relative",
	},
	premiumOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.02)",
	},
	miniDifficultyBadge: {
		position: "absolute",
		top: 10,
		right: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		backgroundColor: 'rgba(0,0,0,0.5)',
		zIndex: 2,
	},
	difficultyDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	miniDifficultyText: {
		color: '#FFF',
		fontSize: 10,
		fontWeight: '900',
	},
	miniCardContent: {
		padding: 12,
	},
	exerciseMiniName: {
		fontSize: 15,
		fontWeight: "800",
		letterSpacing: -0.4,
		marginBottom: 4,
	},
	miniMetadataRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	exerciseMiniCat: {
		fontSize: 11,
		fontWeight: "700",
	},
	miniBodyPart: {
		fontSize: 11,
		fontWeight: "600",
	},
	protocolMiniCard: {
		width: 180,
		padding: 16,
		borderRadius: 20,
		gap: 10,
	},
	protocolIconContainer: {
		width: 36,
		height: 36,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 4,
	},
	protocolName: {
		fontSize: 14,
		fontWeight: "800",
		letterSpacing: -0.3,
	},
	protocolMeta: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	protocolCategory: {
		fontSize: 10,
		fontWeight: "700",
		textTransform: "uppercase",
	},
	protocolDot: {
		fontSize: 10,
	},
	protocolCondition: {
		fontSize: 10,
		fontWeight: "500",
		flex: 1,
	},
	miniBodyPart: {
		fontSize: 11,
		fontWeight: "600",
		opacity: 0.6,
	},
});
