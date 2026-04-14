import { useState, useMemo } from "react";
import { router } from "expo-router";

import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl,
	ActivityIndicator,
	TouchableOpacity,
	Alert,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Card, SyncIndicator } from "@/components";
import { Spacing } from "@/constants/spacing";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProgress } from "@/hooks/useProgress";
import { Evolution } from "@/types/api";

const SCREEN_PADDING = Spacing.screen;
const CARD_GAP = Spacing.gap;
const HALF_CARD_WIDTH =
	(Dimensions.get("window").width - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const FULL_CARD_WIDTH = Dimensions.get("window").width - SCREEN_PADDING * 2;

export default function ProgressScreen() {
	const colors = useColors();

	const {
		data: progressData,
		isLoading,
		isRefetching,
		refetch,
	} = useProgress();
	const [selectedPeriod, setSelectedPeriod] = useState<
		"week" | "month" | "all"
	>("month");

	const onRefresh = async () => {
		await refetch();
	};

	const evolutions = useMemo(
		() => progressData?.evolutions || [],
		[progressData],
	);
	const reports = useMemo(() => progressData?.reports || [], [progressData]);

	const stats = useMemo(() => {
		if (evolutions.length === 0) {
			return {
				totalSessions: 0,
				totalDays: 0,
				averagePain: 0,
				painImprovement: 0,
			};
		}

		const totalSessions = evolutions.length;
		const dates = evolutions
			.map((e) => new Date(e.date))
			.sort((a, b) => a.getTime() - b.getTime());

		const firstDate = dates[0];
		const lastDate = dates[dates.length - 1];
		const totalDays = Math.max(
			1,
			Math.ceil(
				(lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
			),
		);

		const painLevels = evolutions.map((e) => e.painLevel || 0);
		const averagePain =
			painLevels.reduce((sum, level) => sum + level, 0) / painLevels.length;

		const firstPain = evolutions[evolutions.length - 1]?.painLevel || 0;
		const lastPain = evolutions[0]?.painLevel || 0;
		const painImprovement = firstPain - lastPain;

		return {
			totalSessions,
			totalDays,
			averagePain: Math.round(averagePain * 10) / 10,
			painImprovement: Math.round(painImprovement * 10) / 10,
		};
	}, [evolutions]);

	const filteredEvolutions = useMemo(() => {
		const now = new Date();
		let startDate: Date | null = null;

		switch (selectedPeriod) {
			case "week":
				startDate = subDays(now, 7);
				break;
			case "month":
				startDate = subDays(now, 30);
				break;
			case "all":
				return evolutions;
		}

		if (!startDate) return evolutions;

		return evolutions.filter((e) => {
			const evoDate = new Date(e.date);
			return evoDate >= startOfDay(startDate as Date);
		});
	}, [evolutions, selectedPeriod]);

	if (isLoading && !isRefetching) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor: colors.background }]}
				edges={["top", "left", "right"]}
			>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={[styles.loadingText, { color: colors.textSecondary }]}>
						Carregando evoluções...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top", "left", "right"]}
		>
			{/* Page Title */}
			<View style={styles.pageHeader}>
				<Text style={[styles.pageTitle, { color: colors.text }]}>
					Progresso
				</Text>
			</View>

			{/* Sync Indicator */}
			<SyncIndicator />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
				}
			>
				{/* Period Selector */}
				<View
					style={[styles.periodSelector, { backgroundColor: colors.surface }]}
				>
					{(["week", "month", "all"] as const).map((period) => (
						<TouchableOpacity
							key={period}
							style={[
								styles.periodButton,
								selectedPeriod === period && {
									backgroundColor: colors.primary,
								},
							]}
							onPress={() => setSelectedPeriod(period)}
						>
							<Text
								style={[
									styles.periodButtonText,
									{
										color:
											selectedPeriod === period
												? "#FFFFFF"
												: colors.textSecondary,
									},
								]}
							>
								{period === "week"
									? "7 dias"
									: period === "month"
										? "30 dias"
										: "Tudo"}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Gamification Card */}
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={() => router.push("/gamification" as any)}
					style={styles.gamificationWrapper}
				>
					<Card
						style={[
							styles.gamificationCard,
							{ backgroundColor: colors.primary },
						]}
					>
						<View style={styles.gamificationContent}>
							<View style={styles.gamificationTextContainer}>
								<Text style={styles.gamificationTitle}>Gamificação</Text>
								<Text style={styles.gamificationSubtitle}>
									Nível, Conquistas e Recompensas
								</Text>
							</View>
							<View style={styles.gamificationIconContainer}>
								<Ionicons name="trophy" size={32} color="#FFFFFF" />
							</View>
						</View>
					</Card>
				</TouchableOpacity>

				{/* Stats Cards */}
				<View style={styles.statsGrid}>
					<StatCard
						icon="calendar-outline"
						label="Sessões"
						value={stats.totalSessions.toString()}
						colors={colors}
					/>
					<StatCard
						icon="time-outline"
						label="Dias"
						value={stats.totalDays.toString()}
						colors={colors}
					/>
					<StatCard
						icon="pulse-outline"
						label="Dor Média"
						value={stats.averagePain.toFixed(1)}
						colors={colors}
						fullWidth
					/>
				</View>

				{stats.painImprovement !== 0 && (
					<Card style={styles.improvementCard}>
						<View style={styles.improvementContent}>
							<Ionicons
								name={
									stats.painImprovement > 0 ? "trending-down" : "trending-up"
								}
								size={24}
								color={
									stats.painImprovement > 0 ? colors.success : colors.error
								}
							/>
							<View style={styles.improvementText}>
								<Text
									style={[
										styles.improvementLabel,
										{ color: colors.textSecondary },
									]}
								>
									Melhora na dor
								</Text>
								<Text style={[styles.improvementValue, { color: colors.text }]}>
									{Math.abs(stats.painImprovement).toFixed(1)} pontos
								</Text>
							</View>
						</View>
					</Card>
				)}

				{/* Evolutions Timeline */}
				<Text style={[styles.sectionTitle, { color: colors.text }]}>
					Histórico de Evoluções
				</Text>

				{filteredEvolutions.length === 0 ? (
					<Card style={styles.emptyCard}>
						<Ionicons
							name="document-outline"
							size={48}
							color={colors.textMuted}
						/>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							Nenhuma evolução ainda
						</Text>
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
							{selectedPeriod === "all"
								? "Seu fisioterapeuta registrará suas evoluções aqui"
								: "Nenhuma evolução neste período"}
						</Text>
					</Card>
				) : (
					filteredEvolutions.map((evolution) => (
						<EvolutionCard
							key={evolution.id}
							evolution={evolution}
							colors={colors}
						/>
					))
				)}

				{/* Documents Section */}
				{reports.length > 0 && (
					<>
						<Text
							style={[
								styles.sectionTitle,
								{ color: colors.text, marginTop: 20 },
							]}
						>
							Documentos e Laudos
						</Text>
						{reports.map((report) => (
							<Card key={report.id} style={styles.evolutionCard}>
								<TouchableOpacity
									style={styles.reportContent}
									onPress={() =>
										Alert.alert(
											"Documento",
											"Em breve: visualização de PDF direto no app.",
										)
									}
								>
									<View
										style={[
											styles.reportIcon,
											{ backgroundColor: colors.info + "20" },
										]}
									>
										<Ionicons
											name="document-text"
											size={24}
											color={colors.info}
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text
											style={[styles.evolutionDate, { color: colors.text }]}
											numberOfLines={1}
										>
											{report.title}
										</Text>
										<Text
											style={[
												styles.evolutionProfessional,
												{ color: colors.textSecondary },
											]}
											numberOfLines={1}
										>
											Emitido em{" "}
											{format(new Date(report.date), "dd/MM/yyyy", {
												locale: ptBR,
											})}
										</Text>
									</View>
									<Ionicons
										name="open-outline"
										size={20}
										color={colors.primary}
									/>
								</TouchableOpacity>
							</Card>
						))}
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function StatCard({
	icon,
	label,
	value,
	colors,
	fullWidth = false,
}: {
	icon: string;
	label: string;
	value: string;
	colors: any;
	fullWidth?: boolean;
}) {
	return (
		<Card
			style={[
				styles.statCard,
				fullWidth && styles.statCardFull,
				{ backgroundColor: colors.surface },
			]}
		>
			<View style={styles.statHeader}>
				<View
					style={[
						styles.statIconWrap,
						{ backgroundColor: colors.primary + "15" },
					]}
				>
					<Ionicons name={icon as any} size={16} color={colors.primary} />
				</View>
				<Text
					style={[styles.statLabel, { color: colors.textSecondary }]}
					numberOfLines={1}
				>
					{label}
				</Text>
			</View>
			<Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
		</Card>
	);
}

function EvolutionCard({
	evolution,
	colors,
}: {
	evolution: Evolution;
	colors: any;
}) {
	const [expanded, setExpanded] = useState(false);
	const evoDate = new Date(evolution.date);

	return (
		<Card style={styles.evolutionCard}>
			<TouchableOpacity onPress={() => setExpanded(!expanded)}>
				<View style={styles.evolutionHeader}>
					<View
						style={[
							styles.sessionNumber,
							{ backgroundColor: colors.primary + "20" },
						]}
					>
						<Text style={[styles.sessionNumberText, { color: colors.primary }]}>
							#{evolution.sessionNumber || "?"}
						</Text>
					</View>
					<View style={styles.evolutionHeaderInfo}>
						<Text
							style={[styles.evolutionDate, { color: colors.text }]}
							numberOfLines={1}
						>
							{format(evoDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
						</Text>
						<Text
							style={[
								styles.evolutionProfessional,
								{ color: colors.textSecondary },
							]}
							numberOfLines={1}
						>
							{evolution.professionalName || "Fisioterapeuta"}
						</Text>
					</View>
					<View
						style={[
							styles.painIndicator,
							{
								backgroundColor:
									getPainColor(evolution.painLevel || 0, colors) + "20",
							},
						]}
					>
						<Text
							style={[
								styles.painIndicatorText,
								{ color: getPainColor(evolution.painLevel || 0, colors) },
							]}
						>
							Dor: {evolution.painLevel ?? "--"}/10
						</Text>
					</View>
					<Ionicons
						name={expanded ? "chevron-up" : "chevron-down"}
						size={20}
						color={colors.textSecondary}
					/>
				</View>

				{expanded && (
					<View
						style={[styles.evolutionDetails, { borderTopColor: colors.border }]}
					>
						{evolution.subjective && (
							<SOAPSection
								label="Relato"
								content={evolution.subjective}
								colors={colors}
							/>
						)}
						{evolution.assessment && (
							<SOAPSection
								label="Evolução"
								content={evolution.assessment}
								colors={colors}
							/>
						)}
						{evolution.plan && (
							<SOAPSection
								label="Plano / Exercícios Casa"
								content={evolution.plan}
								colors={colors}
							/>
						)}
					</View>
				)}
			</TouchableOpacity>
		</Card>
	);
}

function SOAPSection({
	label,
	content,
	colors,
}: {
	label: string;
	content: string;
	colors: any;
}) {
	return (
		<View style={styles.soapSection}>
			<Text style={[styles.soapLabel, { color: colors.primary }]}>
				{label}:
			</Text>
			<Text style={[styles.soapContent, { color: colors.text }]}>
				{content}
			</Text>
		</View>
	);
}

function getPainColor(level: number, colors: any): string {
	if (level <= 3) return colors.success;
	if (level <= 6) return colors.warning;
	return colors.error;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	pageHeader: {
		paddingHorizontal: Spacing.screen,
		paddingTop: 8,
		paddingBottom: 4,
	},
	pageTitle: {
		fontSize: 28,
		fontWeight: "700",
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
	},
	loadingText: {
		fontSize: 16,
	},
	scrollContent: {
		padding: Spacing.screen,
		paddingBottom: 32,
	},
	periodSelector: {
		flexDirection: "row",
		borderRadius: 12,
		padding: 4,
		marginBottom: Spacing.gap,
	},
	periodButton: {
		flex: 1,
		paddingVertical: 9,
		alignItems: "center",
		borderRadius: 8,
	},
	periodButtonText: {
		fontSize: 14,
		fontWeight: "600",
	},
	gamificationWrapper: {
		paddingHorizontal: Spacing.screen,
		marginBottom: Spacing.gap,
	},
	gamificationCard: {
		padding: 16,
		borderRadius: 16,
	},
	gamificationContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	gamificationTextContainer: {
		flex: 1,
	},
	gamificationTitle: {
		color: "#FFFFFF",
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 4,
	},
	gamificationSubtitle: {
		color: "rgba(255, 255, 255, 0.8)",
		fontSize: 14,
	},
	gamificationIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "rgba(255, 255, 255, 0.2)",
		justifyContent: "center",
		alignItems: "center",
		marginLeft: 16,
	},
	statsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.gap,
		marginBottom: Spacing.gap,
	},
	statCard: {
		width: HALF_CARD_WIDTH,
		padding: Spacing.card,
		alignItems: "flex-start",
		gap: 10,
		minHeight: 90,
	},
	statCardFull: {
		width: FULL_CARD_WIDTH,
	},
	statHeader: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	statIconWrap: {
		width: 28,
		height: 28,
		borderRadius: 9,
		alignItems: "center",
		justifyContent: "center",
	},
	statValue: {
		fontSize: 18,
		fontWeight: "700",
	},
	statLabel: {
		fontSize: 12,
	},
	improvementCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.card,
		marginBottom: Spacing.gap,
	},
	improvementContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	improvementText: {
		flex: 1,
	},
	improvementLabel: {
		fontSize: 13,
	},
	improvementValue: {
		fontSize: 18,
		fontWeight: "700",
	},
	chartCard: {
		padding: Spacing.card,
		marginBottom: Spacing.gap,
	},
	chartTitle: {
		fontSize: 15,
		fontWeight: "600",
		marginBottom: 4,
	},
	chartSubtitle: {
		fontSize: 12,
		marginBottom: 12,
	},
	chart: {
		marginVertical: 8,
		borderRadius: 16,
	},
	webChartPlaceholder: {
		height: 100,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "transparent",
		borderRadius: 12,
	},
	placeholderText: {
		fontSize: 13,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: "700",
		marginBottom: 10,
	},
	emptyCard: {
		padding: 32,
		alignItems: "center",
	},
	emptyTitle: {
		fontSize: 15,
		fontWeight: "600",
		marginTop: 16,
		marginBottom: 4,
	},
	emptyText: {
		fontSize: 13,
		textAlign: "center",
	},
	evolutionCard: {
		marginBottom: 10,
		padding: 0,
		overflow: "hidden",
	},
	evolutionHeader: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.card,
		gap: 12,
	},
	sessionNumber: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	sessionNumberText: {
		fontSize: 12,
		fontWeight: "700",
	},
	evolutionHeaderInfo: {
		flex: 1,
	},
	evolutionDate: {
		fontSize: 14,
		fontWeight: "600",
	},
	evolutionProfessional: {
		fontSize: 12,
	},
	painIndicator: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	painIndicatorText: {
		fontSize: 11,
		fontWeight: "600",
	},
	evolutionDetails: {
		padding: Spacing.card,
		paddingTop: 0,
		borderTopWidth: 1,
		borderTopColor: "transparent",
	},
	soapSection: {
		marginBottom: 12,
	},
	soapLabel: {
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 4,
	},
	soapContent: {
		fontSize: 13,
		lineHeight: 18,
	},
	reportContent: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.card,
		gap: 12,
	},
	reportIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
});
