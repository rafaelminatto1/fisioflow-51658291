import { useState, useCallback, useRef, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TextInput,
	TouchableOpacity,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useAuthStore } from "@/store/auth";
import {
	fetchMyConversations,
	fetchConversationMessages,
	sendMessage,
	fetchQuickReplies,
	updateConversationStatus,
	WaConversation,
	WaMessage,
	WaQuickReply,
} from "@/services/whatsapp-api";

export default function WhatsAppInboxScreen() {
	const colors = useColors();
	const { light } = useHaptics();
	const user = useAuthStore((s) => s.user);
	const token = "";

	const [conversations, setConversations] = useState<WaConversation[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [messages, setMessages] = useState<WaMessage[]>([]);
	const [inputText, setInputText] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSending, setIsSending] = useState(false);
	const [quickReplies, setQuickReplies] = useState<WaQuickReply[]>([]);
	const [showQuickReplies, setShowQuickReplies] = useState(false);
	const flatListRef = useRef<FlatList>(null);

	const canAssign = user?.role === "admin" || user?.role === "recepcionista";

	const loadConversations = async () => {
		try {
			const t = await getAccessToken();
			const data = await fetchMyConversations(t);
			setConversations(data);
		} catch (e) {
			console.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	const loadQuickReplies = async () => {
		try {
			const t = await getAccessToken();
			const data = await fetchQuickReplies(t);
			setQuickReplies(data);
		} catch (_) {}
	};

	const loadMessages = async (conversationId: string) => {
		try {
			const t = await getAccessToken();
			const data = await fetchConversationMessages(t, conversationId);
			setMessages(data);
			setTimeout(
				() => flatListRef.current?.scrollToEnd({ animated: true }),
				100,
			);
		} catch (_) {}
	};

	const getAccessToken = async (): Promise<string> => {
		const { getToken } = await import("@/lib/token-storage");
		const t = await getToken();
		if (!t) throw new Error("Not authenticated");
		return t;
	};

	useFocusEffect(
		useCallback(() => {
			loadConversations();
			loadQuickReplies();
		}, []),
	);

	useEffect(() => {
		if (selectedId) {
			loadMessages(selectedId);
		}
	}, [selectedId]);

	const handleSend = async () => {
		if (!inputText.trim() || !selectedId) return;
		setIsSending(true);
		try {
			const t = await getAccessToken();
			await sendMessage(t, selectedId, inputText.trim());
			setInputText("");
			await loadMessages(selectedId);
		} catch (_) {
		} finally {
			setIsSending(false);
		}
	};

	const handleStatusChange = async (status: string) => {
		if (!selectedId) return;
		try {
			const t = await getAccessToken();
			await updateConversationStatus(t, selectedId, status);
			await loadConversations();
		} catch (_) {}
	};

	const handleQuickReply = (reply: WaQuickReply) => {
		setInputText(reply.content);
		setShowQuickReplies(false);
	};

	const getContactName = (conv: WaConversation) =>
		conv.contact?.displayName || conv.contact?.phoneE164 || "Desconhecido";

	const getMessagePreview = (msg: WaMessage) => {
		if (typeof msg.content === "string") return msg.content;
		if (msg.content?.text) return msg.content.text;
		if (msg.content?.body) return msg.content.body;
		return `[${msg.messageType}]`;
	};

	if (isLoading) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor: colors.background }]}
			>
				<View style={styles.loader}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</SafeAreaView>
		);
	}

	if (!selectedId) {
		return (
			<SafeAreaView
				style={[styles.container, { backgroundColor: colors.background }]}
			>
				<View style={styles.header}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						WhatsApp Inbox
					</Text>
				</View>
				<FlatList
					data={conversations}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<Ionicons
								name="chatbubbles-outline"
								size={48}
								color={colors.textMuted}
							/>
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
								Nenhuma conversa atribuída
							</Text>
						</View>
					}
					renderItem={({ item }) => {
						const lastMsg = item.lastMessage;
						const preview =
							typeof lastMsg?.content === "string"
								? lastMsg.content
								: lastMsg?.content?.text || lastMsg?.content?.body || "";
						return (
							<TouchableOpacity
								style={[styles.convItem, { borderBottomColor: colors.border }]}
								onPress={() => {
									light();
									setSelectedId(item.id);
								}}
								activeOpacity={0.7}
							>
								<View
									style={[
										styles.avatar,
										{ backgroundColor: colors.primary + "18" },
									]}
								>
									<Text style={[styles.avatarText, { color: colors.primary }]}>
										{getContactName(item).charAt(0).toUpperCase()}
									</Text>
								</View>
								<View style={styles.convInfo}>
									<View style={styles.convHeader}>
										<Text
											style={[styles.convName, { color: colors.text }]}
											numberOfLines={1}
										>
											{getContactName(item)}
										</Text>
										<View
											style={[
												styles.statusDot,
												{
													backgroundColor:
														item.status === "open"
															? colors.primary
															: item.status === "resolved"
																? "#34C759"
																: "#FF9500",
												},
											]}
										/>
									</View>
									<Text
										style={[
											styles.convPreview,
											{ color: colors.textSecondary },
										]}
										numberOfLines={1}
									>
										{preview || "Sem mensagens"}
									</Text>
								</View>
							</TouchableOpacity>
						);
					}}
				/>
			</SafeAreaView>
		);
	}

	const selectedConv = conversations.find((c) => c.id === selectedId);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
		>
			<View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
				<TouchableOpacity
					onPress={() => setSelectedId(null)}
					style={styles.backBtn}
				>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<View style={styles.chatHeaderInfo}>
					<Text style={[styles.chatHeaderName, { color: colors.text }]}>
						{selectedConv ? getContactName(selectedConv) : "Conversa"}
					</Text>
					<Text
						style={[styles.chatHeaderStatus, { color: colors.textSecondary }]}
					>
						{selectedConv?.status || ""}
					</Text>
				</View>
				<View style={styles.chatHeaderActions}>
					{canAssign && (
						<TouchableOpacity
							onPress={() => handleStatusChange("resolved")}
							style={[styles.actionBtn, { backgroundColor: "#34C75920" }]}
						>
							<Ionicons name="checkmark-done" size={18} color="#34C759" />
						</TouchableOpacity>
					)}
					<TouchableOpacity
						onPress={() => handleStatusChange("open")}
						style={[
							styles.actionBtn,
							{ backgroundColor: colors.primary + "20" },
						]}
					>
						<Ionicons name="open-outline" size={18} color={colors.primary} />
					</TouchableOpacity>
				</View>
			</View>

			<FlatList
				ref={flatListRef}
				data={messages}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.messagesContent}
				ListEmptyComponent={
					<Text style={[styles.emptyText, { color: colors.textMuted }]}>
						Nenhuma mensagem
					</Text>
				}
				renderItem={({ item }) => {
					const isOutgoing = item.direction === "outbound";
					return (
						<View
							style={[
								styles.messageBubble,
								{
									alignSelf: isOutgoing ? "flex-end" : "flex-start",
									backgroundColor: isOutgoing
										? colors.primary + "18"
										: colors.surface,
								},
							]}
						>
							<Text style={[styles.messageText, { color: colors.text }]}>
								{getMessagePreview(item)}
							</Text>
							<Text style={[styles.messageTime, { color: colors.textMuted }]}>
								{new Date(item.createdAt).toLocaleTimeString("pt-BR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</Text>
						</View>
					);
				}}
			/>

			{showQuickReplies && quickReplies.length > 0 && (
				<View
					style={[
						styles.quickRepliesPanel,
						{ backgroundColor: colors.surface, borderTopColor: colors.border },
					]}
				>
					<FlatList
						data={quickReplies}
						keyExtractor={(item) => item.id}
						keyboardShouldPersistTaps="handled"
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									styles.quickReplyItem,
									{ borderBottomColor: colors.border },
								]}
								onPress={() => {
									light();
									handleQuickReply(item);
								}}
							>
								<Text style={[styles.quickReplyTitle, { color: colors.text }]}>
									{item.title}
								</Text>
								<Text
									style={[
										styles.quickReplyContent,
										{ color: colors.textSecondary },
									]}
									numberOfLines={1}
								>
									{item.content}
								</Text>
							</TouchableOpacity>
						)}
					/>
				</View>
			)}

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				keyboardVerticalOffset={90}
			>
				<View
					style={[styles.inputContainer, { borderTopColor: colors.border }]}
				>
					<TouchableOpacity
						onPress={() => setShowQuickReplies(!showQuickReplies)}
						style={styles.quickReplyBtn}
					>
						<Ionicons
							name={showQuickReplies ? "chevron-down" : "flash-outline"}
							size={22}
							color={colors.textSecondary}
						/>
					</TouchableOpacity>
					<TextInput
						style={[
							styles.textInput,
							{ color: colors.text, backgroundColor: colors.surface },
						]}
						placeholder="Digite uma mensagem..."
						placeholderTextColor={colors.textMuted}
						value={inputText}
						onChangeText={setInputText}
						multiline
						maxLength={4096}
					/>
					<TouchableOpacity
						onPress={handleSend}
						disabled={isSending || !inputText.trim()}
						style={[
							styles.sendBtn,
							{
								backgroundColor: inputText.trim()
									? colors.primary
									: colors.border,
							},
						]}
					>
						{isSending ? (
							<ActivityIndicator size="small" color="#fff" />
						) : (
							<Ionicons name="send" size={20} color="#fff" />
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loader: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "700",
	},
	listContent: {
		padding: 16,
		paddingBottom: 48,
	},
	convItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 4,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 12,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	avatarText: {
		fontSize: 18,
		fontWeight: "700",
	},
	convInfo: {
		flex: 1,
	},
	convHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 2,
	},
	convName: {
		fontSize: 16,
		fontWeight: "600",
		flex: 1,
		marginRight: 8,
	},
	statusDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	convPreview: {
		fontSize: 14,
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 80,
		gap: 12,
	},
	emptyText: {
		fontSize: 14,
		textAlign: "center",
	},
	chatHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 10,
	},
	backBtn: {
		padding: 4,
	},
	chatHeaderInfo: {
		flex: 1,
	},
	chatHeaderName: {
		fontSize: 16,
		fontWeight: "600",
	},
	chatHeaderStatus: {
		fontSize: 12,
	},
	chatHeaderActions: {
		flexDirection: "row",
		gap: 8,
	},
	actionBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	messagesContent: {
		padding: 16,
		paddingBottom: 8,
		flexGrow: 1,
	},
	messageBubble: {
		maxWidth: "78%",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 16,
		marginBottom: 8,
	},
	messageText: {
		fontSize: 15,
		lineHeight: 20,
	},
	messageTime: {
		fontSize: 11,
		marginTop: 4,
		textAlign: "right",
	},
	quickRepliesPanel: {
		maxHeight: 200,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	quickReplyItem: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	quickReplyTitle: {
		fontSize: 14,
		fontWeight: "600",
	},
	quickReplyContent: {
		fontSize: 12,
		marginTop: 2,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 8,
		borderTopWidth: StyleSheet.hairlineWidth,
	},
	quickReplyBtn: {
		paddingBottom: 8,
	},
	textInput: {
		flex: 1,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
		fontSize: 15,
		maxHeight: 100,
	},
	sendBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
});
