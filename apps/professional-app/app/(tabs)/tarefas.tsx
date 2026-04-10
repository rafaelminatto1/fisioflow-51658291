import React, { useState, useCallback, useMemo } from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	RefreshControl,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTarefas } from "@/hooks/useTarefas";
import { TarefaCard } from "@/components/tarefas/TarefaCard";
import { KanbanBoard } from "@/components/tarefas/KanbanBoard";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { SyncStatus, Skeleton, Card } from "@/components";
import type { TarefaStatus } from "@/lib/api";

type FilterOption = TarefaStatus | "TODAS";

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
	{ label: "Todas", value: "TODAS" },
	{ label: "Backlog", value: "BACKLOG" },
	{ label: "A Fazer", value: "A_FAZER" },
	{ label: "Em Progresso", value: "EM_PROGRESSO" },
	{ label: "Revisão", value: "REVISAO" },
	{ label: "Concluído", value: "CONCLUIDO" },
];

function TarefaCardSkeleton() {
	const colors = useColors();
	return (
		<Card style={{ borderRadius: 12, padding: 14, marginBottom: 10 }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 10,
					marginBottom: 10,
				}}
			>
				<Skeleton width={10} height={10} variant="circular" />
				<Skeleton width="70%" height={14} variant="text" />
			</View>
			<Skeleton width="45%" height={12} variant="text" />
			<View style={{ marginTop: 10 }}>
				<Skeleton height={4} variant="rectangular" />
			</View>
		</Card>
	);
}

function TarefaListSkeleton() {
	return (
		<View style={styles.listContent}>
			{[1, 2, 3, 4].map((k) => (
				<TarefaCardSkeleton key={k} />
			))}
		</View>
	);
}

function KanbanSkeleton() {
	const colors = useColors();
	return (
		<View style={styles.kanbanSkeletonContainer}>
			{["Backlog", "A Fazer", "Em Progresso"].map((col, i) => (
				<View
					key={col}
					style={[
						styles.kanbanSkeletonCol,
						{ backgroundColor: colors.surface },
					]}
				>
					<View
						style={{ paddingHorizontal: 10, paddingTop: 12, paddingBottom: 8 }}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: colors.textMuted,
							}}
						>
							{col}
						</Text>
					</View>
					{[1, 2].map((card) => (
						<View key={card} style={{ paddingHorizontal: 8, marginBottom: 8 }}>
							<Card style={{ borderRadius: 10, padding: 10 }}>
								<Skeleton width="80%" height={12} variant="text" />
								<Skeleton
									width="50%"
									height={10}
									variant="text"
									style={{ marginTop: 6 }}
								/>
							</Card>
						</View>
					))}
				</View>
			))}
		</View>
	);
}

export default function TarefasScreen() {
	const colors = useColors();
	const { light } = useHaptics();
	const { status: syncStatus, isOnline } = useSyncStatus();
	const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
	const [filterStatus, setFilterStatus] = useState<FilterOption>("TODAS");
	const [refreshing, setRefreshing] = useState(false);

	const { data, isLoading, error, refetch, update } = useTarefas();

	const filteredData = useMemo(
		() =>
			filterStatus === "TODAS"
				? data
				: data.filter((t) => t.status === filterStatus),
		[data, filterStatus],
	);

	const statusCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const t of data) {
			counts[t.status] = (counts[t.status] || 0) + 1;
		}
		return counts;
	}, [data]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	}, [refetch]);

	const handleMoveCard = useCallback(
		(id: string, novoStatus: TarefaStatus) => {
			update({ id, data: { status: novoStatus } });
		},
		[update],
	);

	const renderItem = useCallback(
		({ item }: { item: (typeof data)[number] }) => (
			<TarefaCard tarefa={item} onMoveCard={handleMoveCard} />
		),
		[handleMoveCard],
	);

	if (error && !isLoading) {
		return (
			<SafeAreaView
				style={[styles.center, { backgroundColor: colors.background }]}
				edges={["top"]}
			>
				<View style={styles.errorContainer}>
					<View
						style={[
							styles.errorIconContainer,
							{ backgroundColor: colors.errorLight + "30" },
						]}
					>
						<Ionicons
							name="cloud-offline-outline"
							size={48}
							color={colors.error}
						/>
					</View>
					<Text style={[styles.errorTitle, { color: colors.text }]}>
						Erro ao carregar
					</Text>
					<Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
						{(error as Error).message || "Tente novamente"}
					</Text>
					<TouchableOpacity
						style={[styles.retryBtn, { backgroundColor: colors.primary }]}
						onPress={() => refetch()}
					>
						<Text style={styles.retryBtnText}>Tentar novamente</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top"]}
		>
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<View style={styles.headerLeft}>
					<Ionicons name="checkbox" size={22} color={colors.primary} />
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Tarefas
					</Text>
					{!isLoading && (
						<View
							style={[styles.totalBadge, { backgroundColor: colors.primary + "15" }]}
						>
							<Text
								style={[styles.totalBadgeText, { color: colors.primary }]}
							>
								{data.length}
							</Text>
						</View>
					)}
				</View>
				<View style={styles.headerRight}>
					<View style={[styles.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<TouchableOpacity
							style={[
								styles.viewToggle,
								viewMode === "list" && styles.activeToggle,
								viewMode === "list" && { backgroundColor: colors.primary },
							]}
							onPress={() => {
								light();
								setViewMode("list");
							}}
						>
							<Ionicons
								name="list"
								size={16}
								color={viewMode === "list" ? "#fff" : colors.textMuted}
							/>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.viewToggle,
								viewMode === "kanban" && styles.activeToggle,
								viewMode === "kanban" && { backgroundColor: colors.primary },
							]}
							onPress={() => {
								light();
								setViewMode("kanban");
							}}
						>
							<Ionicons
								name="apps"
								size={16}
								color={viewMode === "kanban" ? "#fff" : colors.textMuted}
							/>
						</TouchableOpacity>
					</View>
					<TouchableOpacity
						style={[styles.addBtn, { backgroundColor: colors.primary }]}
						onPress={() => {
							light();
							router.push("/tarefa-form");
						}}
						accessibilityLabel="Criar nova tarefa"
					>
						<Ionicons name="add" size={22} color="#fff" />
					</TouchableOpacity>
				</View>
			</View>

			{viewMode === "list" ? (
				<>
					<View style={styles.filtersSection}>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.filtersScroll}
							contentContainerStyle={styles.filtersContent}
						>
							{FILTER_OPTIONS.map((opt) => {
								const active = filterStatus === opt.value;
								return (
									<TouchableOpacity
										key={opt.value}
										style={[
											styles.filterPill,
											{
												backgroundColor: active
													? colors.primary
													: colors.surface,
												borderColor: active ? colors.primary : colors.border,
											},
										]}
										onPress={() => {
											light();
											setFilterStatus(opt.value);
										}}
									>
										<Text
											style={[
												styles.filterPillText,
												{ color: active ? "#fff" : colors.textSecondary },
											]}
										>
											{opt.label}
											{opt.value !== "TODAS" && !isLoading
												? ` ${statusCounts[opt.value] || 0}`
												: ""}
										</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
					</View>

					{isLoading && !refreshing ? (
						<TarefaListSkeleton />
					) : filteredData.length === 0 ? (
						<View style={styles.emptyState}>
							<View
								style={[
									styles.emptyIconContainer,
									{ backgroundColor: colors.primary + "10" },
								]}
							>
								<Ionicons
									name={
										filterStatus === "TODAS"
											? "clipboard-outline"
											: "filter-outline"
									}
									size={48}
									color={colors.primary}
								/>
							</View>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>
								{filterStatus === "TODAS"
									? "Tudo em dia!"
									: "Nenhuma tarefa encontrada"}
							</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
								{filterStatus === "TODAS"
									? "Você não tem nenhuma tarefa pendente.\nQue tal criar uma nova?"
									: "Tente ajustar os filtros ou criar uma nova tarefa para este status."}
							</Text>
							<TouchableOpacity
								style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
								onPress={() => {
									light();
									router.push("/tarefa-form");
								}}
							>
								<Ionicons name="add" size={20} color="#fff" />
								<Text style={styles.emptyBtnText}>Criar Tarefa</Text>
							</TouchableOpacity>
						</View>
					) : (
						<FlatList
							data={filteredData}
							keyExtractor={(item) => item.id}
							renderItem={renderItem}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator={false}
							refreshControl={
								<RefreshControl
									refreshing={refreshing}
									onRefresh={onRefresh}
									tintColor={colors.primary}
								/>
							}
						/>
					)}
				</>
			) : isLoading && !refreshing ? (
				<KanbanSkeleton />
			) : (
				<KanbanBoard tarefas={data} onMoveCard={handleMoveCard} />
			)}

			<View style={[styles.bottomSyncBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
				<SyncStatus status={syncStatus} isOnline={isOnline} compact />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1 },
	errorContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingHorizontal: 40,
	},
	errorIconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
	headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
	totalBadge: {
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	totalBadgeText: { fontSize: 12, fontWeight: "700" },
	headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
	toggleContainer: {
		flexDirection: "row",
		borderRadius: 10,
		padding: 3,
		borderWidth: 1,
	},
	viewToggle: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	activeToggle: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	addBtn: {
		width: 38,
		height: 38,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	filtersSection: {
		backgroundColor: "#fff",
	},
	filtersScroll: { maxHeight: 54 },
	filtersContent: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 8,
		flexDirection: "row",
		alignItems: "center",
	},
	filterPill: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1,
	},
	filterPillText: { fontSize: 13, fontWeight: "600" },
	listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 40,
		paddingBottom: 60,
	},
	emptyIconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8, letterSpacing: -0.5 },
	emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },
	emptyBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 4,
	},
	emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
	errorTitle: { fontSize: 18, fontWeight: "700" },
	errorSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
	retryBtn: {
		marginTop: 8,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 12,
	},
	retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
	bottomSyncBar: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderTopWidth: 1,
		flexDirection: "row",
		justifyContent: "flex-end",
	},
	kanbanSkeletonContainer: {
		flex: 1,
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 8,
		paddingVertical: 12,
	},
	kanbanSkeletonCol: {
		flex: 1,
		borderRadius: 12,
		overflow: "hidden",
	},
});
