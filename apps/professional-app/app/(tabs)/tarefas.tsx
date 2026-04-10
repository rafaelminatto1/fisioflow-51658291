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
					<Ionicons name="checkmark-circle" size={22} color={colors.primary} />
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Tarefas
					</Text>
					{!isLoading && (
						<View
							style={[styles.totalBadge, { backgroundColor: colors.surface }]}
						>
							<Text
								style={[styles.totalBadgeText, { color: colors.textMuted }]}
							>
								{data.length}
							</Text>
						</View>
					)}
				</View>
				<View style={styles.headerRight}>
					<TouchableOpacity
						style={[
							styles.viewToggle,
							viewMode === "list" && { backgroundColor: colors.primary + "22" },
						]}
						onPress={() => {
							light();
							setViewMode("list");
						}}
					>
						<Ionicons
							name="list"
							size={18}
							color={viewMode === "list" ? colors.primary : colors.textMuted}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.viewToggle,
							viewMode === "kanban" && {
								backgroundColor: colors.primary + "22",
							},
						]}
						onPress={() => {
							light();
							setViewMode("kanban");
						}}
					>
						<Ionicons
							name="apps"
							size={18}
							color={viewMode === "kanban" ? colors.primary : colors.textMuted}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.addBtn, { backgroundColor: colors.primary }]}
						onPress={() => {
							light();
							router.push("/tarefa-form");
						}}
						accessibilityLabel="Criar nova tarefa"
					>
						<Ionicons name="add" size={20} color="#fff" />
					</TouchableOpacity>
				</View>
			</View>

			{viewMode === "list" ? (
				<>
					<View style={styles.filtersAndSyncRow}>
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
												{ color: active ? "#fff" : colors.textMuted },
											]}
										>
											{opt.label}
											{opt.value !== "TODAS" && !isLoading
												? ` (${statusCounts[opt.value] || 0})`
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
									{ backgroundColor: colors.border },
								]}
							>
								<Ionicons
									name={
										filterStatus === "TODAS"
											? "checkmark-circle-outline"
											: "filter-outline"
									}
									size={40}
									color={colors.textMuted}
								/>
							</View>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>
								{filterStatus === "TODAS"
									? "Nenhuma tarefa"
									: "Nenhuma tarefa neste filtro"}
							</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
								{filterStatus === "TODAS"
									? "Crie sua primeira tarefa para começar"
									: "Tente outro filtro ou crie uma nova tarefa"}
							</Text>
							<TouchableOpacity
								style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
								onPress={() => {
									light();
									router.push("/tarefa-form");
								}}
							>
								<Text style={styles.emptyBtnText}>Criar tarefa</Text>
							</TouchableOpacity>
						</View>
					) : (
						<FlatList
							data={filteredData}
							keyExtractor={(item) => item.id}
							renderItem={renderItem}
							contentContainerStyle={styles.listContent}
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

			<View style={[styles.bottomSyncBar, { borderTopColor: colors.border }]}>
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
		gap: 10,
		paddingHorizontal: 40,
	},
	errorIconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
	headerTitle: { fontSize: 17, fontWeight: "700" },
	totalBadge: {
		borderRadius: 999,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	totalBadgeText: { fontSize: 11, fontWeight: "600" },
	headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
	viewToggle: { padding: 6, borderRadius: 6 },
	addBtn: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	filtersAndSyncRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	filtersScroll: { flex: 1, maxHeight: 44 },
	filtersContent: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		gap: 6,
		flexDirection: "row",
		alignItems: "center",
	},
	filterPill: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		marginRight: 4,
	},
	filterPillText: { fontSize: 11, fontWeight: "500" },
	listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 32 },
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		paddingHorizontal: 40,
	},
	emptyIconContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},
	emptyTitle: { fontSize: 15, fontWeight: "600" },
	emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 18 },
	emptyBtn: {
		marginTop: 6,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 10,
	},
	emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
	errorTitle: { fontSize: 15, fontWeight: "600" },
	errorSubtitle: { fontSize: 13, textAlign: "center" },
	retryBtn: {
		marginTop: 4,
		paddingHorizontal: 18,
		paddingVertical: 9,
		borderRadius: 8,
	},
	retryBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
	bottomSyncBar: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderTopWidth: 1,
		flexDirection: "row",
		justifyContent: "flex-end",
	},
	kanbanSkeletonContainer: {
		flex: 1,
		flexDirection: "row",
		gap: 6,
		paddingHorizontal: 6,
		paddingVertical: 10,
	},
	kanbanSkeletonCol: {
		flex: 1,
		borderRadius: 10,
		overflow: "hidden",
	},
});
