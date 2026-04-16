import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	View,
	Text,
	StyleSheet,
	FlatList,
	TextInput,
	TouchableOpacity,
	RefreshControl,
	ScrollView,
	KeyboardAvoidingView,
	Modal,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import {
	useWhatsAppConversations,
	useWhatsAppOpenConversation,
	useWhatsAppResolveContact,
	useWhatsAppTags,
} from "@/hooks/useWhatsApp";
import { usePatients } from "@/hooks/usePatients";
import {
	WaConversation,
	getContactName,
	getContactPhone,
	getMessageTextPreview,
} from "@/services/whatsapp-api";
import type { Patient } from "@/types";

import { format, isToday, isYesterday, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const WA_GREEN = "#25D366";

const STATUS_FILTERS = [
	{ key: "all", label: "Todas" },
	{ key: "open", label: "Abertas" },
	{ key: "pending", label: "Pendentes" },
	{ key: "mine", label: "Minhas" },
	{ key: "unassigned", label: "Sem dono" },
	{ key: "resolved", label: "Resolvidas" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

function formatRelativeTime(dateStr?: string): string {
	if (!dateStr) return "";
	try {
		const date = parseISO(dateStr);
		if (Number.isNaN(date.getTime())) return "";
		
		if (isToday(date)) {
			return format(date, "HH:mm");
		}
		
		if (isYesterday(date)) {
			return "ontem";
		}
		
		if (differenceInDays(new Date(), date) < 7) {
			return format(date, "EEE", { locale: ptBR });
		}
		
		return format(date, "dd/MM");
	} catch (e) {
		return "";
	}
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
		<View
			style={[
				styles.convItem,
				styles.convCard,
				{ borderColor: colors.border, backgroundColor: colors.surface },
			]}
		>
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
		const tags = item.tags ?? [];

	return (
		<TouchableOpacity
			style={[
				styles.convItem,
				styles.convCard,
				{ borderColor: colors.border, backgroundColor: colors.surface },
			]}
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
					{(item.assignedToName || tags.length > 0) && (
						<View style={styles.convMetaRow}>
							{item.assignedToName ? (
								<View style={[styles.ownerPill, { backgroundColor: WA_GREEN + "14" }]}>
									<Ionicons name="person" size={10} color={WA_GREEN} />
									<Text style={[styles.ownerText, { color: WA_GREEN }]} numberOfLines={1}>
										{item.assignedToName}
									</Text>
								</View>
							) : null}
							{tags.slice(0, 2).map((tag) => (
								<View
									key={tag.id}
									style={[
										styles.tagPill,
										{ borderColor: tag.color ?? colors.border },
									]}
								>
									<Text
										style={[styles.tagText, { color: tag.color ?? colors.textSecondary }]}
										numberOfLines={1}
									>
										{tag.name}
									</Text>
								</View>
							))}
						</View>
					)}
				</View>
			</TouchableOpacity>
		);
}

export default function WhatsAppScreen() {
	const colors = useColors();
	const router = useRouter();
	const { light } = useHaptics();

		const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
		const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [refreshing, setRefreshing] = useState(false);
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [composerMode, setComposerMode] = useState<"patient" | "manual">("patient");
	const [patientSearch, setPatientSearch] = useState("");
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [manualPhone, setManualPhone] = useState("");
	const [manualName, setManualName] = useState("");

		const queryFilters = useMemo(() => {
			const filters: Record<string, string> = {};
			if (statusFilter !== "all") filters.status = statusFilter;
			if (selectedTagId) filters.tagId = selectedTagId;
			return filters;
		}, [selectedTagId, statusFilter]);

		const { data, isLoading, refetch } = useWhatsAppConversations(queryFilters);
		const { data: tags = [] } = useWhatsAppTags();
	const { data: patients, isLoading: isPatientsLoading } = usePatients({
		search: patientSearch.trim() || undefined,
		limit: 12,
	});
	const resolveContactMutation = useWhatsAppResolveContact();
	const openConversationMutation = useWhatsAppOpenConversation();

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
	const summary = useMemo(() => {
		const list = data?.data ?? [];
		return {
			total: list.length,
			open: list.filter((item) => item.status === "open").length,
			pending: list.filter((item) => item.status === "pending").length,
			unread: totalUnread,
		};
	}, [data, totalUnread]);
	const isCreatingConversation =
		resolveContactMutation.isPending || openConversationMutation.isPending;
	const canSubmitManual = manualPhone.replace(/\D/g, "").length >= 10;

	const handleRefresh = async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	};

	const handleOpenChat = (conv: WaConversation) => {
		light();
		router.push(`/whatsapp-chat/${conv.id}` as any);
	};

	const resetComposer = () => {
		setComposerMode("patient");
		setPatientSearch("");
		setSelectedPatient(null);
		setManualPhone("");
		setManualName("");
	};

	const handleOpenComposer = () => {
		resetComposer();
		setIsComposerOpen(true);
	};

	const handleCloseComposer = () => {
		if (isCreatingConversation) return;
		setIsComposerOpen(false);
		resetComposer();
	};

	const handleCreateConversation = async () => {
		try {
			const input =
				composerMode === "patient"
					? selectedPatient
						? {
								patientId: selectedPatient.id,
								displayName: selectedPatient.name,
							}
						: null
					: {
							phone: manualPhone,
							displayName: manualName.trim() || undefined,
						};

			if (!input) {
				Alert.alert("Paciente obrigatório", "Selecione um paciente para iniciar a conversa.");
				return;
			}

			if (composerMode === "manual" && !canSubmitManual) {
				Alert.alert("Número inválido", "Digite um número com DDD para continuar.");
				return;
			}

			const contact = await resolveContactMutation.mutateAsync(input);
			const conversation = await openConversationMutation.mutateAsync(contact.id);
			handleCloseComposer();
			handleOpenChat(conversation);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Não foi possível iniciar a conversa.";
			Alert.alert("Erro ao criar conversa", message);
		}
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
					<View>
						<View style={styles.headerTitleRow}>
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
						<Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
							Central de conversas e acompanhamento
						</Text>
					</View>
				</View>
				<TouchableOpacity
					style={[styles.primaryCta, { backgroundColor: WA_GREEN }]}
					onPress={handleOpenComposer}
					activeOpacity={0.85}
				>
					<Ionicons name="add" size={16} color="#fff" />
					<Text style={styles.primaryCtaText}>Nova</Text>
				</TouchableOpacity>
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

				{tags.length > 0 && (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.categoryFiltersContent}
						style={styles.categoryFiltersScroll}
					>
						<TouchableOpacity
							style={[
								styles.categoryChip,
								{
									backgroundColor: selectedTagId ? colors.surface : WA_GREEN + "18",
									borderColor: selectedTagId ? colors.border : WA_GREEN,
								},
							]}
							onPress={() => setSelectedTagId(null)}
							activeOpacity={0.75}
						>
							<Text
								style={[
									styles.categoryLabel,
									{ color: selectedTagId ? colors.textSecondary : WA_GREEN },
								]}
							>
								Todas categorias
							</Text>
						</TouchableOpacity>
						{tags.map((tag) => {
							const active = selectedTagId === tag.id;
							return (
								<TouchableOpacity
									key={tag.id}
									style={[
										styles.categoryChip,
										{
											backgroundColor: active ? (tag.color ?? WA_GREEN) + "18" : colors.surface,
											borderColor: active ? tag.color ?? WA_GREEN : colors.border,
										},
									]}
									onPress={() => setSelectedTagId(active ? null : tag.id)}
									activeOpacity={0.75}
								>
									<View
										style={[
											styles.categoryDot,
											{ backgroundColor: tag.color ?? WA_GREEN },
										]}
									/>
									<Text
										style={[
											styles.categoryLabel,
											{ color: active ? tag.color ?? WA_GREEN : colors.textSecondary },
										]}
									>
										{tag.name}
									</Text>
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				)}

				<View style={styles.summaryRow}>
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: colors.surface, borderColor: colors.border },
					]}
				>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{summary.open}</Text>
					<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
						Em andamento
					</Text>
				</View>
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: colors.surface, borderColor: colors.border },
					]}
				>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{summary.pending}</Text>
					<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
						Pendentes
					</Text>
				</View>
				<View
					style={[
						styles.summaryCard,
						{ backgroundColor: colors.surface, borderColor: colors.border },
					]}
				>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{summary.unread}</Text>
					<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
						Não lidas
					</Text>
				</View>
			</View>

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
							<TouchableOpacity
								style={[styles.emptyAction, { backgroundColor: WA_GREEN }]}
								onPress={handleOpenComposer}
								activeOpacity={0.85}
							>
								<Text style={styles.emptyActionText}>Iniciar nova conversa</Text>
							</TouchableOpacity>
						</View>
					}
				/>
			)}

			<Modal
				visible={isComposerOpen}
				transparent
				animationType="fade"
				onRequestClose={handleCloseComposer}
			>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						style={styles.modalKeyboard}
					>
						<View
							style={[
								styles.modalCard,
								{ backgroundColor: colors.background, borderColor: colors.border },
							]}
						>
							<View style={styles.modalHeader}>
								<View>
									<Text style={[styles.modalTitle, { color: colors.text }]}>
										Nova conversa
									</Text>
									<Text
										style={[styles.modalSubtitle, { color: colors.textSecondary }]}
									>
										Escolha um paciente ou digite um número manualmente.
									</Text>
								</View>
								<TouchableOpacity
									onPress={handleCloseComposer}
									hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
								>
									<Ionicons name="close" size={22} color={colors.textMuted} />
								</TouchableOpacity>
							</View>

							<View
								style={[
									styles.modeSwitch,
									{ backgroundColor: colors.surface, borderColor: colors.border },
								]}
							>
								{[
									{ key: "patient", label: "Paciente" },
									{ key: "manual", label: "Número" },
								].map((option) => {
									const active = composerMode === option.key;
									return (
										<TouchableOpacity
											key={option.key}
											style={[
												styles.modeChip,
												active && { backgroundColor: WA_GREEN },
											]}
											onPress={() => setComposerMode(option.key as "patient" | "manual")}
											activeOpacity={0.85}
										>
											<Text
												style={[
													styles.modeChipText,
													{ color: active ? "#fff" : colors.textSecondary },
												]}
											>
												{option.label}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>

							{composerMode === "patient" ? (
								<View style={styles.modalSection}>
									<View
										style={[
											styles.modalInputWrap,
											{ backgroundColor: colors.surface, borderColor: colors.border },
										]}
									>
										<Ionicons name="search" size={16} color={colors.textMuted} />
										<TextInput
											style={[styles.modalInput, { color: colors.text }]}
											placeholder="Buscar paciente por nome ou telefone"
											placeholderTextColor={colors.textMuted}
											value={patientSearch}
											onChangeText={setPatientSearch}
										/>
									</View>

									<ScrollView
										style={styles.patientResults}
										showsVerticalScrollIndicator={false}
										keyboardShouldPersistTaps="handled"
									>
										{isPatientsLoading ? (
											<View style={styles.loadingBlock}>
												<ActivityIndicator color={WA_GREEN} />
											</View>
										) : patients.length === 0 ? (
											<Text
												style={[styles.helperText, { color: colors.textSecondary }]}
											>
												Nenhum paciente encontrado.
											</Text>
										) : (
											patients.map((patient) => {
												const active = selectedPatient?.id === patient.id;
												return (
													<TouchableOpacity
														key={patient.id}
														style={[
															styles.patientOption,
															{
																backgroundColor: active
																	? WA_GREEN + "14"
																	: colors.surface,
																borderColor: active ? WA_GREEN : colors.border,
															},
														]}
														onPress={() => setSelectedPatient(patient)}
														activeOpacity={0.85}
													>
														<View style={{ flex: 1 }}>
															<Text
																style={[styles.patientName, { color: colors.text }]}
																numberOfLines={1}
															>
																{patient.name}
															</Text>
															<Text
																style={[
																	styles.patientPhone,
																	{ color: colors.textSecondary },
																]}
																numberOfLines={1}
															>
																{patient.phone || "Sem telefone cadastrado"}
															</Text>
														</View>
														{active ? (
															<Ionicons
																name="checkmark-circle"
																size={20}
																color={WA_GREEN}
															/>
														) : null}
													</TouchableOpacity>
												);
											})
										)}
									</ScrollView>
								</View>
							) : (
								<View style={styles.modalSection}>
									<View
										style={[
											styles.modalInputWrap,
											{ backgroundColor: colors.surface, borderColor: colors.border },
										]}
									>
										<Ionicons name="person-outline" size={16} color={colors.textMuted} />
										<TextInput
											style={[styles.modalInput, { color: colors.text }]}
											placeholder="Nome do contato opcional"
											placeholderTextColor={colors.textMuted}
											value={manualName}
											onChangeText={setManualName}
										/>
									</View>
									<View
										style={[
											styles.modalInputWrap,
											{ backgroundColor: colors.surface, borderColor: colors.border },
										]}
									>
										<Ionicons name="call-outline" size={16} color={colors.textMuted} />
										<TextInput
											style={[styles.modalInput, { color: colors.text }]}
											placeholder="Número com DDD"
											placeholderTextColor={colors.textMuted}
											value={manualPhone}
											onChangeText={setManualPhone}
											keyboardType="phone-pad"
										/>
									</View>
									<Text style={[styles.helperText, { color: colors.textSecondary }]}>
										Use o formato que já costuma receber mensagens no WhatsApp.
									</Text>
								</View>
							)}

							<TouchableOpacity
								style={[
									styles.submitButton,
									{
										backgroundColor:
											composerMode === "patient"
												? selectedPatient
													? WA_GREEN
													: colors.border
												: canSubmitManual
												? WA_GREEN
												: colors.border,
									},
								]}
								onPress={handleCreateConversation}
								disabled={
									isCreatingConversation ||
									(composerMode === "patient" ? !selectedPatient : !canSubmitManual)
								}
								activeOpacity={0.85}
							>
								{isCreatingConversation ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.submitButtonText}>Abrir conversa</Text>
								)}
							</TouchableOpacity>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>
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
		alignItems: "flex-start",
		gap: 10,
		flex: 1,
	},
	headerTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "700",
	},
	headerSubtitle: {
		fontSize: 13,
		marginTop: 2,
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
	primaryCta: {
		height: 38,
		borderRadius: 19,
		paddingHorizontal: 14,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 6,
	},
	primaryCtaText: {
		color: "#fff",
		fontSize: 14,
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
	summaryRow: {
		flexDirection: "row",
		gap: 10,
		paddingHorizontal: 16,
		marginBottom: 12,
	},
	summaryCard: {
		flex: 1,
		borderRadius: 18,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 12,
		paddingVertical: 14,
	},
	summaryValue: {
		fontSize: 24,
		fontWeight: "800",
	},
	summaryLabel: {
		fontSize: 12,
		marginTop: 4,
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
		categoryFiltersScroll: {
			maxHeight: 34,
			marginBottom: 8,
		},
		categoryFiltersContent: {
			paddingHorizontal: 16,
			gap: 8,
			alignItems: "center",
		},
		categoryChip: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 14,
			borderWidth: StyleSheet.hairlineWidth,
		},
		categoryDot: {
			width: 7,
			height: 7,
			borderRadius: 4,
		},
		categoryLabel: {
			fontSize: 12,
			fontWeight: "600",
		},
		listContent: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingBottom: 28,
	},
	convItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingVertical: 14,
		paddingHorizontal: 14,
		gap: 12,
	},
	convCard: {
		borderRadius: 20,
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: 12,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 18,
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
			fontSize: 13,
			lineHeight: 18,
			flex: 1,
		},
		convMetaRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			alignItems: "center",
			gap: 6,
			marginTop: 8,
		},
		ownerPill: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			maxWidth: 150,
			paddingHorizontal: 7,
			paddingVertical: 3,
			borderRadius: 10,
		},
		ownerText: {
			fontSize: 11,
			fontWeight: "600",
			flexShrink: 1,
		},
		tagPill: {
			maxWidth: 120,
			borderWidth: StyleSheet.hairlineWidth,
			borderRadius: 10,
			paddingHorizontal: 7,
			paddingVertical: 3,
		},
		tagText: {
			fontSize: 11,
			fontWeight: "600",
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
	emptyAction: {
		marginTop: 6,
		borderRadius: 16,
		paddingHorizontal: 18,
		paddingVertical: 12,
	},
	emptyActionText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "700",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.38)",
		justifyContent: "flex-end",
	},
	modalKeyboard: {
		justifyContent: "flex-end",
	},
	modalCard: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 28,
		borderWidth: StyleSheet.hairlineWidth,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: 12,
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: "700",
	},
	modalSubtitle: {
		fontSize: 13,
		marginTop: 4,
		lineHeight: 18,
	},
	modeSwitch: {
		flexDirection: "row",
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 4,
		marginBottom: 16,
		gap: 6,
	},
	modeChip: {
		flex: 1,
		borderRadius: 12,
		paddingVertical: 10,
		alignItems: "center",
	},
	modeChipText: {
		fontSize: 13,
		fontWeight: "700",
	},
	modalSection: {
		gap: 12,
	},
	modalInputWrap: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 12,
		gap: 8,
	},
	modalInput: {
		flex: 1,
		fontSize: 15,
		paddingVertical: 14,
	},
	patientResults: {
		maxHeight: 280,
	},
	patientOption: {
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 14,
		paddingVertical: 13,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	patientName: {
		fontSize: 15,
		fontWeight: "600",
	},
	patientPhone: {
		fontSize: 13,
		marginTop: 3,
	},
	helperText: {
		fontSize: 12,
		lineHeight: 17,
	},
	loadingBlock: {
		paddingVertical: 24,
		alignItems: "center",
	},
	submitButton: {
		marginTop: 18,
		borderRadius: 18,
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	submitButtonText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "700",
	},
});
