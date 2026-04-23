import { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useEvolutions } from "@/hooks";
import { EvolutionChart } from "@/components/charts/evolution-chart";
import type { Evolution } from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function getPainColor(level: number): string {
	if (level === 0) return "#94a3b8";
	if (level <= 3) return "#10B981";
	if (level <= 6) return "#F59E0B";
	return "#EF4444";
}

/** Returns 'SOAP' if the record has any SOAP-specific field filled, else 'Livre' */
function detectMode(e: Evolution): "SOAP" | "Notion" | "Tiptap" | "Livre" {
	if (e.subjective || e.objective || e.plan) return "SOAP";
	return "Livre";
}

// ─── sub-components ─────────────────────────────────────────────────────────

function ModeBadge({ mode, colors }: { mode: ReturnType<typeof detectMode>; colors: any }) {
	const modeStyles: Record<string, { bg: string; color: string }> = {
		SOAP:   { bg: colors.primary + "20",  color: colors.primary },
		Notion: { bg: "#F59E0B20",             color: "#F59E0B"       },
		Tiptap: { bg: "#8B5CF620",             color: "#8B5CF6"       },
		Livre:  { bg: "#6B728020",             color: "#6B7280"       },
	};
	const s = modeStyles[mode] ?? modeStyles.Livre;
	return (
		<View style={[styles.modeBadge, { backgroundColor: s.bg }]}>
			<Text style={[styles.modeBadgeText, { color: s.color }]}>{mode}</Text>
		</View>
	);
}

interface EvolutionCardItemProps {
	evolution: Evolution;
	index: number;
	onView: () => void;
	onEdit: () => void;
	onDuplicate: () => void;
	isDuplicating: boolean;
	colors: any;
	light: () => void;
	medium: () => void;
}

function EvolutionCardItem({
	evolution,
	index,
	onView,
	onEdit,
	onDuplicate,
	isDuplicating,
	colors,
	light,
	medium,
}: EvolutionCardItemProps) {
	const mode = detectMode(evolution);

	const formattedDate = evolution.date
		? format(new Date(evolution.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
		: "Data não disponível";

	const preview =
		mode === "SOAP"
			? evolution.subjective || evolution.assessment
			: evolution.assessment;

	return (
		<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
			{/* ── Card header ── */}
			<TouchableOpacity onPress={onView} activeOpacity={0.75} style={styles.cardMain}>
				<View style={styles.cardHeader}>
					<View style={styles.cardHeaderLeft}>
						<Ionicons name="calendar-outline" size={15} color={colors.primary} />
						<Text style={[styles.cardDate, { color: colors.text }]}>{formattedDate}</Text>
						<Text style={[styles.cardSessionNum, { color: colors.textMuted }]}>
							#{index}
						</Text>
					</View>
					<View style={styles.cardHeaderRight}>
						{evolution.painLevel !== undefined && evolution.painLevel > 0 && (
							<View
								style={[
									styles.painBadge,
									{ backgroundColor: getPainColor(evolution.painLevel) + "20" },
								]}
							>
								<Text
									style={[
										styles.painBadgeText,
										{ color: getPainColor(evolution.painLevel) },
									]}
								>
									Dor: {evolution.painLevel}
								</Text>
							</View>
						)}
						<ModeBadge mode={mode} colors={colors} />
					</View>
				</View>

				{/* ── Preview content ── */}
				{mode === "SOAP" ? (
					<View style={styles.soapPreview}>
						{evolution.subjective ? (
							<View style={styles.soapRow}>
								<Text style={[styles.soapKey, { color: colors.primary }]}>S</Text>
								<Text
									style={[styles.soapValue, { color: colors.textSecondary }]}
									numberOfLines={1}
								>
									{evolution.subjective}
								</Text>
							</View>
						) : null}
						{evolution.objective ? (
							<View style={styles.soapRow}>
								<Text style={[styles.soapKey, { color: colors.primary }]}>O</Text>
								<Text
									style={[styles.soapValue, { color: colors.textSecondary }]}
									numberOfLines={1}
								>
									{evolution.objective}
								</Text>
							</View>
						) : null}
						{evolution.assessment ? (
							<View style={styles.soapRow}>
								<Text style={[styles.soapKey, { color: colors.primary }]}>A</Text>
								<Text
									style={[styles.soapValue, { color: colors.textSecondary }]}
									numberOfLines={1}
								>
									{evolution.assessment}
								</Text>
							</View>
						) : null}
						{evolution.plan ? (
							<View style={styles.soapRow}>
								<Text style={[styles.soapKey, { color: colors.primary }]}>P</Text>
								<Text
									style={[styles.soapValue, { color: colors.textSecondary }]}
									numberOfLines={1}
								>
									{evolution.plan}
								</Text>
							</View>
						) : null}
					</View>
				) : preview ? (
					<Text
						style={[styles.freePreview, { color: colors.textSecondary }]}
						numberOfLines={3}
					>
						{preview}
					</Text>
				) : null}
			</TouchableOpacity>

			{/* ── Action footer ── */}
			<View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
				<TouchableOpacity
					style={[styles.footerBtn, { borderColor: colors.border }]}
					onPress={() => {
						medium();
						onEdit();
					}}
					activeOpacity={0.7}
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				>
					<Ionicons name="create-outline" size={16} color={colors.primary} />
					<Text style={[styles.footerBtnText, { color: colors.primary }]}>Editar</Text>
				</TouchableOpacity>

				<View style={[styles.footerDivider, { backgroundColor: colors.border }]} />

				<TouchableOpacity
					style={[styles.footerBtn, { borderColor: colors.border }]}
					onPress={() => {
						medium();
						onDuplicate();
					}}
					activeOpacity={0.7}
					disabled={isDuplicating}
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				>
					{isDuplicating ? (
						<ActivityIndicator size="small" color={colors.textSecondary} />
					) : (
						<>
							<Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
							<Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>
								Duplicar
							</Text>
						</>
					)}
				</TouchableOpacity>

				<View style={[styles.footerDivider, { backgroundColor: colors.border }]} />

				<TouchableOpacity
					style={styles.footerBtn}
					onPress={() => {
						light();
						onView();
					}}
					activeOpacity={0.7}
					hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				>
					<Ionicons name="eye-outline" size={16} color={colors.textMuted} />
					<Text style={[styles.footerBtnText, { color: colors.textMuted }]}>Ver</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

// ─── Pagination bar ──────────────────────────────────────────────────────────

interface PaginationBarProps {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	pageSize: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	onNext: () => void;
	onPrev: () => void;
	colors: any;
	medium: () => void;
}

function PaginationBar({
	currentPage,
	totalPages,
	totalCount,
	pageSize,
	hasNextPage,
	hasPrevPage,
	onNext,
	onPrev,
	colors,
	medium,
}: PaginationBarProps) {
	if (totalPages <= 1) return null;

	const from = (currentPage - 1) * pageSize + 1;
	const to = Math.min(currentPage * pageSize, totalCount);

	return (
		<View style={[styles.pagination, { backgroundColor: colors.surface, borderColor: colors.border }]}>
			<TouchableOpacity
				onPress={() => { medium(); onPrev(); }}
				disabled={!hasPrevPage}
				style={[styles.pageBtn, !hasPrevPage && styles.pageBtnDisabled]}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			>
				<Ionicons
					name="chevron-back"
					size={18}
					color={hasPrevPage ? colors.primary : colors.textMuted}
				/>
				<Text style={[styles.pageBtnText, { color: hasPrevPage ? colors.primary : colors.textMuted }]}>
					Anterior
				</Text>
			</TouchableOpacity>

			<View style={styles.pageInfo}>
				<Text style={[styles.pageInfoMain, { color: colors.text }]}>
					{from}–{to}
				</Text>
				<Text style={[styles.pageInfoSub, { color: colors.textMuted }]}>
					de {totalCount} sessões
				</Text>
			</View>

			<TouchableOpacity
				onPress={() => { medium(); onNext(); }}
				disabled={!hasNextPage}
				style={[styles.pageBtn, !hasNextPage && styles.pageBtnDisabled]}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			>
				<Text style={[styles.pageBtnText, { color: hasNextPage ? colors.primary : colors.textMuted }]}>
					Próxima
				</Text>
				<Ionicons
					name="chevron-forward"
					size={18}
					color={hasNextPage ? colors.primary : colors.textMuted}
				/>
			</TouchableOpacity>
		</View>
	);
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EvolutionsListScreen() {
	const colors = useColors();
	const router = useRouter();
	const params = useLocalSearchParams();

	const patientId = params.patientId as string;
	const patientName = (params.patientName as string) || "Paciente";

	const { light, medium } = useHaptics();
	const [refreshing, setRefreshing] = useState(false);
	const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

	const {
		evolutions,
		paginatedEvolutions,
		currentPage,
		totalPages,
		totalCount,
		pageSize,
		hasNextPage,
		hasPrevPage,
		nextPage,
		prevPage,
		isLoading,
		refetch,
		duplicateAsync,
	} = useEvolutions(patientId);

	const onRefresh = async () => {
		setRefreshing(true);
		light();
		await refetch();
		setRefreshing(false);
	};

	// Pain chart uses last 10 (all) — not paginated
	const painData = evolutions
		.slice(0, 10)
		.reverse()
		.map((e) => e.painLevel || 0);

	const handleDuplicate = (evolution: Evolution) => {
		Alert.alert(
			"Duplicar Sessão",
			`Criar uma cópia desta sessão (${evolution.date
				? format(new Date(evolution.date), "dd/MM/yyyy")
				: "?"}) com a data de hoje?`,
			[
				{ text: "Cancelar", style: "cancel" },
					{
						text: "Duplicar",
						onPress: async () => {
							if (!evolution.id) {
								Alert.alert("Erro", "Sessão inválida para duplicação.");
								return;
							}
							setDuplicatingId(evolution.id);
							try {
								await duplicateAsync(evolution.id);
							Alert.alert("Sucesso", "Sessão duplicada com sucesso!");
						} catch (err: any) {
							Alert.alert("Erro", err.message || "Não foi possível duplicar a sessão.");
						} finally {
							setDuplicatingId(null);
						}
					},
				},
			]
		);
	};

	// Global session number is relative to the full list index
	const getGlobalIndex = (localIdx: number) =>
		totalCount - ((currentPage - 1) * pageSize + localIdx);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top"]}
		>
			{/* ── Header ── */}
			<View
				style={[
					styles.header,
					{ backgroundColor: colors.surface, borderBottomColor: colors.border },
				]}
			>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<View style={styles.headerCenter}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Evoluções</Text>
					<Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
						{patientName}
					</Text>
				</View>
				<TouchableOpacity
					onPress={() => {
						medium();
						router.push(
							`/evolution-form?patientId=${patientId}&patientName=${patientName}` as any,
						);
					}}
					style={styles.addButton}
				>
					<Ionicons name="add" size={24} color={colors.primary} />
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.contentContainer}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={colors.primary}
					/>
				}
			>
				{/* ── Pain chart (last 10 all-time) ── */}
				{evolutions.length > 0 && (
					<View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
						<Text style={[styles.chartTitle, { color: colors.text }]}>
							Evolução da Dor
						</Text>
						<EvolutionChart
							data={painData}
							labels={evolutions
								.slice(0, 10)
								.reverse()
								.map((_: any, i: number) => `${i + 1}`)}
							title="Evolução da Dor"
							color={colors.primary}
						/>
						<Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
							Últimas {Math.min(10, evolutions.length)} sessões
						</Text>
					</View>
				)}

				{/* ── Session count summary ── */}
				{totalCount > 0 && (
					<View style={styles.summaryRow}>
						<Ionicons name="albums-outline" size={16} color={colors.textMuted} />
						<Text style={[styles.summaryText, { color: colors.textMuted }]}>
							{totalCount} {totalCount === 1 ? "sessão registrada" : "sessões registradas"}
						</Text>
					</View>
				)}

				{/* ── List ── */}
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={colors.primary} />
					</View>
				) : evolutions.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Ionicons
							name="document-text-outline"
							size={64}
							color={colors.textMuted}
						/>
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
							Nenhuma evolução registrada
						</Text>
						<TouchableOpacity
							style={[styles.emptyButton, { backgroundColor: colors.primary }]}
							onPress={() => {
								medium();
								router.push(
									`/evolution-form?patientId=${patientId}&patientName=${patientName}` as any,
								);
							}}
						>
							<Text style={styles.emptyButtonText}>Criar Primeira Evolução</Text>
						</TouchableOpacity>
					</View>
				) : (
					paginatedEvolutions.map((evolution, idx) => (
						<EvolutionCardItem
							key={evolution.id}
							evolution={evolution}
							index={getGlobalIndex(idx)}
							colors={colors}
							light={light}
							medium={medium}
							isDuplicating={duplicatingId === evolution.id}
							onView={() => {
								light();
								router.push(
									`/evolution-detail?evolutionId=${evolution.id}&patientId=${patientId}&patientName=${patientName}` as any,
								);
							}}
							onEdit={() => {
								router.push(
									`/evolution-detail?evolutionId=${evolution.id}&patientId=${patientId}&patientName=${patientName}&startEditing=true` as any,
								);
							}}
							onDuplicate={() => handleDuplicate(evolution)}
						/>
					))
				)}

				{/* ── Pagination ── */}
				<PaginationBar
					currentPage={currentPage}
					totalPages={totalPages}
					totalCount={totalCount}
					pageSize={pageSize}
					hasNextPage={hasNextPage}
					hasPrevPage={hasPrevPage}
					onNext={nextPage}
					onPrev={prevPage}
					colors={colors}
					medium={medium}
				/>
			</ScrollView>
		</SafeAreaView>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	container: { flex: 1 },

	// Header
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	backButton: { padding: 8 },
	headerCenter: { flex: 1, alignItems: "center" },
	headerTitle: { fontSize: 18, fontWeight: "600" },
	headerSubtitle: { fontSize: 14, marginTop: 2 },
	addButton: { padding: 8 },

	// Content
	content: { flex: 1 },
	contentContainer: { padding: 16, gap: 12, paddingBottom: 32 },

	// Chart
	chartCard: { borderRadius: 16, padding: 16 },
	chartTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
	chartSubtitle: { fontSize: 12, textAlign: "center", marginTop: 8 },

	// Summary
	summaryRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 4,
	},
	summaryText: { fontSize: 13 },

	// Card
	card: {
		borderRadius: 14,
		borderWidth: 1,
		overflow: "hidden",
	},
	cardMain: { padding: 14 },
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 10,
	},
	cardHeaderLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		flex: 1,
	},
	cardDate: { fontSize: 14, fontWeight: "600" },
	cardSessionNum: { fontSize: 12 },
	cardHeaderRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	painBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
	},
	painBadgeText: { fontSize: 11, fontWeight: "700" },
	modeBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
	},
	modeBadgeText: { fontSize: 11, fontWeight: "700" },

	// SOAP preview
	soapPreview: { gap: 4 },
	soapRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
	soapKey: { fontSize: 12, fontWeight: "800", width: 14 },
	soapValue: { fontSize: 13, flex: 1, lineHeight: 18 },

	// Notion/free preview
	freePreview: { fontSize: 13, lineHeight: 20 },

	// Card footer actions
	cardFooter: {
		flexDirection: "row",
		borderTopWidth: 1,
	},
	footerBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		gap: 5,
	},
	footerBtnDisabled: { opacity: 0.4 },
	footerBtnText: { fontSize: 13, fontWeight: "600" },
	footerDivider: { width: 1, marginVertical: 8 },

	// Empty / loading
	loadingContainer: { padding: 40, alignItems: "center" },
	emptyContainer: { padding: 40, alignItems: "center", gap: 16 },
	emptyText: { fontSize: 16, textAlign: "center" },
	emptyButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		marginTop: 8,
	},
	emptyButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

	// Pagination
	pagination: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: 14,
		borderWidth: 1,
		padding: 12,
		marginTop: 4,
	},
	pageBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 2,
	},
	pageBtnDisabled: { opacity: 0.35 },
	pageBtnText: { fontSize: 14, fontWeight: "600" },
	pageInfo: { alignItems: "center" },
	pageInfoMain: { fontSize: 15, fontWeight: "700" },
	pageInfoSub: { fontSize: 12, marginTop: 1 },
});
