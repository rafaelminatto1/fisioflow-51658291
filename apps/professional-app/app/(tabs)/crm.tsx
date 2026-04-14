import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import {
	ActionSheetIOS,
	ActivityIndicator,
	Alert,
	Platform,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, SyncStatus, Skeleton, CardSkeleton } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useLeads } from "@/hooks/useLeads";
import { ApiLead } from "@/lib/api";

const STATUS_LABELS: Record<ApiLead["estagio"], string> = {
	aguardando: "Novo",
	contatado: "Em Contato",
	interessado: "Interessado",
	agendado: "Agendado",
	convertido: "Convertido",
	perdido: "Perdido",
};

const STATUS_COLORS: Record<ApiLead["estagio"], string> = {
	aguardando: "#3b82f6",
	contatado: "#8b5cf6",
	interessado: "#f59e0b",
	agendado: "#10b981",
	convertido: "#059669",
	perdido: "#ef4444",
};

const LeadCard = memo(
	({
		lead,
		colors,
		light,
		onUpdateStatus,
	}: {
		lead: ApiLead;
		colors: ReturnType<typeof import("@/hooks/useColorScheme").useColors>;
		light: () => void;
		onUpdateStatus: (id: string, estagio: ApiLead["estagio"]) => void;
	}) => {
		const handleLongPress = () => {
			light();
			const stages = Object.keys(STATUS_LABELS) as ApiLead["estagio"][];
			const options = stages.map((s) => STATUS_LABELS[s]);
			if (Platform.OS === "ios") {
				ActionSheetIOS.showActionSheetWithOptions(
					{
						options: [...options, "Cancelar"],
						cancelButtonIndex: options.length,
						title: "Mover para etapa",
					},
					(idx) => {
						if (idx < options.length) onUpdateStatus(lead.id, stages[idx]);
					},
				);
			} else {
				Alert.alert(
					"Mover para etapa",
					undefined,
					stages
						.map((s) => ({
							text: STATUS_LABELS[s],
							onPress: () => onUpdateStatus(lead.id, s),
						}))
						.concat([{ text: "Cancelar", style: "cancel" } as any]),
				);
			}
		};

		return (
			<TouchableOpacity
				activeOpacity={0.7}
				onPress={() => light()}
				onLongPress={handleLongPress}
				delayLongPress={400}
			>
				<Card style={styles.leadCard}>
					<View style={styles.leadHeader}>
						<View
							style={[
								styles.leadAvatar,
								{ backgroundColor: STATUS_COLORS[lead.estagio] + "18" },
							]}
						>
							<Ionicons
								name="person-outline"
								size={20}
								color={STATUS_COLORS[lead.estagio]}
							/>
						</View>
						<View style={styles.leadMainInfo}>
							<Text
								style={[styles.leadName, { color: colors.text }]}
								numberOfLines={1}
							>
								{lead.nome}
							</Text>
							<View style={styles.leadMetaRow}>
								<View
									style={[
										styles.statusBadge,
										{ backgroundColor: STATUS_COLORS[lead.estagio] + "20" },
									]}
								>
									<Text
										style={[
											styles.statusText,
											{ color: STATUS_COLORS[lead.estagio] },
										]}
									>
										{STATUS_LABELS[lead.estagio]}
									</Text>
								</View>
								{lead.origem && (
									<Text
										style={[styles.sourceText, { color: colors.textMuted }]}
									>
										{lead.origem}
									</Text>
								)}
							</View>
						</View>
						<Ionicons
							name="chevron-forward"
							size={18}
							color={colors.textMuted}
						/>
					</View>

					{lead.interesse && (
						<Text
							style={[styles.interestText, { color: colors.textSecondary }]}
							numberOfLines={2}
						>
							{lead.interesse}
						</Text>
					)}

					<View style={[styles.leadFooter, { borderTopColor: colors.border }]}>
						{lead.telefone && (
							<View style={styles.footerItem}>
								<Ionicons
									name="call-outline"
									size={14}
									color={colors.textSecondary}
								/>
								<Text
									style={[styles.footerText, { color: colors.textSecondary }]}
								>
									{lead.telefone}
								</Text>
							</View>
						)}
						<Text style={[styles.hintText, { color: colors.textMuted }]}>
							Toque longo para mover
						</Text>
					</View>
				</Card>
			</TouchableOpacity>
		);
	},
);

function CRMSkeletonLoader() {
	return (
		<View style={styles.skeletonContainer}>
			<View style={styles.skeletonStatsRow}>
				{[1, 2, 3].map((i) => (
					<View key={i} style={styles.skeletonStat}>
						<Skeleton width={28} height={28} variant="circular" />
						<Skeleton
							width={40}
							height={20}
							variant="text"
							style={{ marginTop: 6 }}
						/>
						<Skeleton width={60} height={12} variant="text" />
					</View>
				))}
			</View>
			{[1, 2, 3, 4].map((i) => (
				<CardSkeleton key={i} />
			))}
		</View>
	);
}

export default function CRMScreen() {
	const colors = useColors();
	const { light } = useHaptics();
	const { leads, loading, refreshing, refresh, updateLeadStatus } = useLeads();
	const { status: syncStatus, isOnline } = useSyncStatus();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedStatus, setSelectedStatus] = useState<
		ApiLead["estagio"] | "todos"
	>("todos");

	const filteredLeads = useMemo(() => {
		return leads.filter((lead) => {
			const matchesSearch =
				lead.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(lead.telefone && lead.telefone.includes(searchQuery)) ||
				(lead.interesse &&
					lead.interesse.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesStatus =
				selectedStatus === "todos" || lead.estagio === selectedStatus;

			return matchesSearch && matchesStatus;
		});
	}, [leads, searchQuery, selectedStatus]);

	const statusOptions = ["todos", ...Object.keys(STATUS_LABELS)] as const;

	const leadsByStage = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const lead of leads) {
			counts[lead.estagio] = (counts[lead.estagio] || 0) + 1;
		}
		return counts;
	}, [leads]);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top", "left", "right"]}
		>
			<View
				style={[styles.searchContainer, { borderBottomColor: colors.border }]}
			>
				<View
					style={[
						styles.searchBar,
						{ backgroundColor: colors.surface, borderColor: colors.border },
					]}
				>
					<Ionicons name="search" size={20} color={colors.textMuted} />
					<TextInput
						placeholder="Buscar leads..."
						placeholderTextColor={colors.textMuted}
						style={[styles.searchInput, { color: colors.text }]}
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity
							onPress={() => {
								light();
								setSearchQuery("");
							}}
						>
							<Ionicons
								name="close-circle"
								size={20}
								color={colors.textMuted}
							/>
						</TouchableOpacity>
					)}
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.statusFilters}
				>
					{statusOptions.map((status) => {
						const isActive = selectedStatus === status;
						const stageKey = status as ApiLead["estagio"];
						const stageColor =
							status !== "todos" ? STATUS_COLORS[stageKey] : colors.primary;
						return (
							<TouchableOpacity
								key={status}
								onPress={() => {
									light();
									setSelectedStatus(status as typeof selectedStatus);
								}}
								style={[
									styles.statusFilterChip,
									{
										backgroundColor: isActive ? stageColor : colors.surface,
										borderColor: isActive ? stageColor : colors.border,
									},
								]}
							>
								<Text
									style={[
										styles.statusFilterText,
										{
											color: isActive ? "#fff" : colors.textSecondary,
										},
									]}
								>
									{status === "todos"
										? `Todos (${leads.length})`
										: `${STATUS_LABELS[stageKey]} (${leadsByStage[stageKey] || 0})`}
								</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>
			</View>

			<View style={styles.metaRow}>
				{!loading && (
					<View style={styles.statsRow}>
						<View
							style={[
								styles.statBadge,
								{ backgroundColor: colors.successLight },
							]}
						>
							<Text style={[styles.statBadgeText, { color: colors.success }]}>
								{leadsByStage.convertido || 0} convertidos
							</Text>
						</View>
						<View
							style={[
								styles.statBadge,
								{ backgroundColor: colors.primaryLight + "40" },
							]}
						>
							<Text style={[styles.statBadgeText, { color: colors.primary }]}>
								{leads.length} total
							</Text>
						</View>
					</View>
				)}
				<SyncStatus status={syncStatus} isOnline={isOnline} compact />
			</View>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={refresh}
						tintColor={colors.primary}
					/>
				}
			>
				{loading && !refreshing ? (
					<CRMSkeletonLoader />
				) : filteredLeads.length > 0 ? (
					<View style={styles.listContainer}>
						{filteredLeads.map((lead) => (
							<LeadCard
								key={lead.id}
								lead={lead}
								colors={colors}
								light={light}
								onUpdateStatus={updateLeadStatus}
							/>
						))}
					</View>
				) : (
					<Card style={styles.emptyCard}>
						<View
							style={[
								styles.emptyIconContainer,
								{ backgroundColor: colors.border },
							]}
						>
							<Ionicons
								name={searchQuery ? "search-outline" : "funnel-outline"}
								size={32}
								color={colors.textMuted}
							/>
						</View>
						<Text style={[styles.emptyTitle, { color: colors.text }]}>
							{searchQuery ? "Sem resultados" : "Nenhum lead encontrado"}
						</Text>
						<Text
							style={[styles.emptyDescription, { color: colors.textSecondary }]}
						>
							{searchQuery
								? "Tente buscar com outro termo ou limpe o filtro."
								: "Seus leads aparecerão aqui conforme forem cadastrados."}
						</Text>
					</Card>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	searchContainer: {
		padding: 14,
		borderBottomWidth: 1,
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 10,
		gap: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
	},
	statusFilters: {
		flexDirection: "row",
		paddingBottom: 4,
	},
	statusFilterChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		marginRight: 6,
		borderWidth: 1,
	},
	statusFilterText: {
		fontSize: 12,
		fontWeight: "600",
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		marginBottom: 4,
	},
	statsRow: {
		flexDirection: "row",
		gap: 6,
	},
	statBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 20,
	},
	statBadgeText: {
		fontSize: 11,
		fontWeight: "600",
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 14,
	},
	listContainer: {
		gap: 10,
	},
	leadCard: {
		borderRadius: 14,
	},
	leadHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	leadAvatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	leadMainInfo: {
		flex: 1,
	},
	leadName: {
		fontSize: 15,
		fontWeight: "600",
		marginBottom: 3,
	},
	leadMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	statusBadge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 5,
	},
	statusText: {
		fontSize: 10,
		fontWeight: "600",
	},
	sourceText: {
		fontSize: 11,
	},
	interestText: {
		fontSize: 12,
		marginTop: 8,
		lineHeight: 16,
	},
	leadFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 10,
		paddingTop: 8,
		borderTopWidth: 1,
	},
	footerItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	footerText: {
		fontSize: 11,
		fontWeight: "500",
	},
	hintText: {
		fontSize: 10,
		fontStyle: "italic",
	},
	emptyCard: {
		alignItems: "center",
		paddingVertical: 40,
		gap: 6,
		borderRadius: 14,
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
	emptyTitle: {
		fontSize: 15,
		fontWeight: "600",
	},
	emptyDescription: {
		fontSize: 13,
		textAlign: "center",
		paddingHorizontal: 20,
		lineHeight: 18,
	},
	skeletonContainer: {
		gap: 10,
	},
	skeletonStatsRow: {
		flexDirection: "row",
		gap: 10,
		marginBottom: 6,
	},
	skeletonStat: {
		flex: 1,
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
});
