import { useState, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TextInput,
	TouchableOpacity,
	RefreshControl,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useWhatsAppConversations } from "@/hooks/useWhatsApp";
import {
	WaConversation,
	getContactName,
	getContactPhone,
	getMessageTextPreview,
} from "@/services/whatsapp-api";

const WA_GREEN = "#25D366";

const STATUS_FILTERS = [
	{ key: "all", label: "Todas" },
	{ key: "open", label: "Abertas" },
	{ key: "pending", label: "Pendentes" },
	{ key: "mine", label: "Minhas" },
	{ key: "resolved", label: "Resolvidas" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

function safeParseDate(raw?: string | null): Date {
	if (!raw) return new Date(NaN);
	const normalized = raw.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
	return new Date(normalized);
}

function formatRelativeTime(dateStr?: string): string {
	if (!dateStr) return "";
	const date = safeParseDate(dateStr);
	if (Number.isNaN(date.getTime())) return "";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffMins < 1) return "agora";
	if (diffMins < 60) return `${diffMins}min`;
	if (diffHours < 24)
		return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
	if (diffDays === 1) return "ontem";
	if (diffDays < 7)
		return date.toLocaleDateString("pt-BR", { weekday: "short" });
	return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getStatusColor(status: string): string {
	switch (status) {
		case "open": return WA_GREEN;
		case "pending": return "#FF9500";
		case "resolved":
		case "closed":
		default: return "#8E8E93";
	}
}

function ConversationSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
	return (
		<View style={[styles.convItem, { borderBottomColor: colors.border }]}>
			<View style={[styles.avatar, { backgroundColor: colors.border, opacity: 0.4 }]} />
			<View style={{ flex: 1, gap: 8 }}>
				<View style={[styles.skeletonLine, { width: "55%", backgroundColor: colors.border }]} />
				<View style={[styles.skeletonLine, { width: "80%", backgroundColor: colors.border, opacity: 0.6 }]} />
			</View>
		</View>
	);
}

function ConversationItem({
	item,
	colors,
	onPress,
}: {
	item: WaConversation;
	colors: ReturnType<typeof useColors>;
	onPress: () => void;
}) {
	const name = getContactName(item);
	const phone = getContactPhone(item);
	const preview = getMessageTextPreview(item.lastMessage);
	const time = formatRelativeTime(item.lastMessageAt || item.updatedAt);
	const statusColor = getStatusColor(item.status);
	const unread = item.unreadCount ?? 0;
	const isOutbound = item.lastMessage?.direction === "outbound";
	const isHighPriority = item.priority === "high" || item.priority === "urgent";

	return (
		<TouchableOpacity
			style={[styles.convItem, { borderBottomColor: colors.border }]}
			onPress={onPress}
			activeOpacity={0.7}
		>
			<View style={[styles.avatar, { backgroundColor: WA_GREEN + "22" }]}>
				<Text style={[styles.avatarText, { color: WA_GREEN }]}>
					{name.charAt(0).toUpperCase()}
				</Text>
				{/* Online/status dot on avatar */}
				<View
					style={[styles.avatarStatusDot, { backgroundColor: statusColor, borderColor: colors.background }]}
				/>
			</View>

			<View style={styles.convBody}>
				<View style={styles.convTopRow}>
					<View style={styles.convNameRow}>
						{isHighPriority && (
							<Ionicons
								name="alert-circle"
								size={13}
								color="#FF3B30"
								style={{ marginRight: 3 }}
							/>
						)}
						<Text
							style={[styles.convName, { color: colors.text }]}
							numberOfLines={1}
						>
							{name}
						</Text>
					</View>
					<Text style={[styles.convTime, { color: unread > 0 ? WA_GREEN : colors.textMuted }]}>
						{time}
					</Text>
				</View>

				{phone ? (
					<Text
						style={[styles.convPhone, { color: colors.textMuted }]}
						numberOfLines={1}
					>
						{phone}
					</Text>
				) : null}

				<View style={styles.convBottomRow}>
					<Text
						style={[
							styles.convPreview,
							{
								color: unread > 0 ? colors.text : colors.textSecondary,
								fontWeight: unread > 0 ? "500" : "400",
							},
						]}
						numberOfLines={1}
					>
						{preview
							? (isOutbound ? "Você: " + preview : preview)
							: "Sem mensagens"}
					</Text>

					{unread > 0 && (
						<View style={[styles.unreadBadge, { backgroundColor: WA_GREEN }]}>
							<Text style={styles.unreadText}>
								{unread > 99 ? "99+" : unread}
							</Text>
						</View>
					)}
				</View>
			</View>
		</TouchableOpacity>
	);
}

export default function WhatsAppScreen() {
	const colors = useColors();
	const router = useRouter();
	const { light } = useHaptics();

	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [search, setSearch] = useState("");
	const [refreshing, setRefreshing] = useState(false);

	const queryFilters = useMemo(() => {
		if (statusFilter === "all") return {};
		return { status: statusFilter };
	}, [statusFilter]);

	const { data, isLoading, refetch } = useWhatsAppConversations(queryFilters);

	const conversations = useMemo(() => {
		const list = data?.data ?? [];
		if (!search.trim()) return list;
		const q = search.toLowerCase();
		return list.filter((c) => {
			const name = getContactName(c).toLowerCase();
			const phone = getContactPhone(c).toLowerCase();
			return name.includes(q) || phone.includes(q);
		});
	}, [data, search]);

	const totalUnread = useMemo(
		() => (data?.data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
		[data],
	);

	const handleRefresh = async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	};

	const handleOpenChat = (conv: WaConversation) => {
		light();
		router.push(`/whatsapp-chat/${conv.id}` as any);
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["top"]}
		>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Ionicons name="logo-whatsapp" size={26} color={WA_GREEN} />
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						WhatsApp
					</Text>
					{totalUnread > 0 && (
						<View style={[styles.headerBadge, { backgroundColor: WA_GREEN }]}>
							<Text style={styles.headerBadgeText}>
								{totalUnread > 99 ? "99+" : totalUnread}
							</Text>
						</View>
					)}
				</View>
			</View>

			{/* Search */}
			<View
				style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
			>
				<Ionicons name="search" size={16} color={colors.textMuted} />
				<TextInput
					style={[styles.searchInput, { color: colors.text }]}
					placeholder="Buscar conversas..."
					placeholderTextColor={colors.textMuted}
					value={search}
					onChangeText={setSearch}
					returnKeyType="search"
				/>
				{search.length > 0 && (
					<TouchableOpacity
						onPress={() => setSearch("")}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					>
						<Ionicons name="close-circle" size={16} color={colors.textMuted} />
					</TouchableOpacity>
				)}
			</View>

			{/* Status filters */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.filtersContent}
				style={styles.filtersScroll}
			>
				{STATUS_FILTERS.map((f) => {
					const active = statusFilter === f.key;
					return (
						<TouchableOpacity
							key={f.key}
							style={[
								styles.filterChip,
								{
									backgroundColor: active ? WA_GREEN : colors.surface,
									borderColor: active ? WA_GREEN : colors.border,
								},
							]}
							onPress={() => setStatusFilter(f.key)}
							activeOpacity={0.7}
						>
							<Text
								style={[
									styles.filterLabel,
									{ color: active ? "#fff" : colors.textSecondary },
								]}
							>
								{f.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			{/* Conversation list */}
			{isLoading && !data ? (
				<>
					{[1, 2, 3, 4, 5].map((i) => (
						<ConversationSkeleton key={i} colors={colors} />
					))}
				</>
			) : (
				<FlatList
					data={conversations}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<ConversationItem
							item={item}
							colors={colors}
							onPress={() => handleOpenChat(item)}
						/>
					)}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="handled"
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
							tintColor={WA_GREEN}
						/>
					}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<Ionicons
								name="chatbubbles-outline"
								size={56}
								color={colors.textMuted}
							/>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>
								Nenhuma conversa
							</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
								{search
									? "Nenhum resultado para sua busca"
									: statusFilter === "mine"
									? "Nenhuma conversa atribuída a você"
									: "Nenhuma conversa encontrada"}
							</Text>
						</View>
					}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 12,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "700",
	},
	headerBadge: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5,
	},
	headerBadgeText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: 16,
		marginBottom: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
		gap: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		paddingVertical: 0,
	},
	filtersScroll: {
		height: 38,
		marginBottom: 6,
	},
	filtersContent: {
		paddingHorizontal: 16,
		gap: 8,
		alignItems: "center",
	},
	filterChip: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 20,
		borderWidth: 1,
	},
	filterLabel: {
		fontSize: 13,
		fontWeight: "500",
	},
	listContent: {
		flexGrow: 1,
		paddingBottom: 20,
	},
	convItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 12,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	avatarText: {
		fontSize: 20,
		fontWeight: "700",
	},
	avatarStatusDot: {
		position: "absolute",
		bottom: 1,
		right: 1,
		width: 13,
		height: 13,
		borderRadius: 7,
		borderWidth: 2,
	},
	convBody: {
		flex: 1,
		minWidth: 0,
	},
	convTopRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 1,
	},
	convNameRow: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		marginRight: 8,
	},
	convName: {
		fontSize: 16,
		fontWeight: "600",
		flexShrink: 1,
	},
	convTime: {
		fontSize: 12,
		flexShrink: 0,
		fontWeight: "500",
	},
	convPhone: {
		fontSize: 12,
		marginBottom: 3,
	},
	convBottomRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},
	convPreview: {
		fontSize: 14,
		flex: 1,
	},
	unreadBadge: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 5,
		flexShrink: 0,
	},
	unreadText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
	skeletonLine: {
		height: 14,
		borderRadius: 7,
	},
	emptyState: {
		alignItems: "center",
		paddingTop: 80,
		gap: 10,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
});
