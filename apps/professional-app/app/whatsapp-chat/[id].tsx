import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useRealtime } from "@/hooks/useRealtime";
import {
  useWhatsAppMessages,
  useWhatsAppSendMessage,
  useWhatsAppUpdateStatus,
  useWhatsAppAddNote,
  useWhatsAppQuickReplies,
  useWhatsAppAssignConversation,
  useWhatsAppTags,
  useWhatsAppTeamMembers,
  useWhatsAppAddTags,
  useWhatsAppRemoveTag,
} from "@/hooks/useWhatsApp";
import {
  ConversationsResponse,
  WaMessage,
  WaConversationDetailResponse,
  getContactName,
  getContactPhone,
  getMessageText,
} from "@/services/whatsapp-api";
import { avatarColorFor, fontFamily, radius, shadow, spacing, typography } from "@/constants/theme";

/** Verde do WhatsApp — semântica do canal, não cor de ação do produto. */
const WA_GREEN = "#25D366";
/** Tinta das notas internas: amarelo de aviso, fora da paleta de tema. */
const NOTE_BG = "#FFF7E0";
const NOTE_BORDER = "#F2D9A0";
const NOTE_INK = "#8A6220";

type ColorTokens = ReturnType<typeof useColors>;
type WhatsAppRealtimeEvent = {
  type: string;
  conversationId?: string;
  message?: {
    id?: string;
    content?: unknown;
    direction?: string;
    messageType?: string;
    createdAt?: string;
    status?: string;
  };
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Badge de etapa da conversa — mesmo vocabulário visual da caixa de entrada
 * (`app/(tabs)/whatsapp.tsx`): rótulo curto em caixa alta + ponto da cor do
 * status. O `status` do backend é open/pending/resolved/closed.
 */
function getStageBadge(
  status: string,
  colors: ColorTokens,
): { label: string; background: string; foreground: string; dot: string } {
  switch (status) {
    case "open":
      return {
        label: "Em andamento",
        background: colors.successSoft,
        foreground: colors.success,
        dot: colors.success,
      };
    case "pending":
      return {
        label: "Aguardando",
        background: colors.warningSoft,
        foreground: colors.warning,
        dot: colors.warning,
      };
    case "resolved":
    case "closed":
      return {
        label: "Resolvida",
        background: colors.surfaceHover,
        foreground: colors.textSecondary,
        dot: colors.textMuted,
      };
    default:
      return {
        label: status,
        background: colors.surfaceHover,
        foreground: colors.textSecondary,
        dot: colors.textMuted,
      };
  }
}

// iOS new Date() requires ISO 8601 with 'T', not space — Postgres returns space separator
function safeParseDate(raw?: string | null): Date {
  if (!raw) return new Date(NaN);
  // "2024-03-15 14:30:00.123+00" → "2024-03-15T14:30:00.123+00"
  const normalized = raw.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  return new Date(normalized);
}

function getDateKey(dateStr?: string | null): string {
  const date = safeParseDate(dateStr);
  return Number.isNaN(date.getTime()) ? "unknown-date" : date.toLocaleDateString("pt-BR");
}

function formatTimeLabel(dateStr?: string | null): string {
  const date = safeParseDate(dateStr);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateLabel(dateStr: string): string {
  const date = safeParseDate(dateStr);
  if (Number.isNaN(date.getTime())) return "Sem data";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return "Hoje";
  if (isSameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

// ─── list item types ──────────────────────────────────────────────────────────

type DateItem = { type: "date"; id: string; label: string };
type MsgItem = { type: "message"; id: string; data: WaMessage };
type ListItem = DateItem | MsgItem;

function buildListData(messages: WaMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDateKey = "";
  for (const msg of messages) {
    const dateKey = getDateKey(msg.createdAt);
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      items.push({ type: "date", id: `date-${dateKey}`, label: getDateLabel(msg.createdAt) });
    }
    items.push({ type: "message", id: msg.id, data: msg });
  }
  return items;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function MessageStatusIcon({ status, colors }: { status: string; colors: ColorTokens }) {
  if (status === "pending")
    return <Ionicons name="time-outline" size={13} color={colors.textMuted} />;
  if (status === "sent") return <Ionicons name="checkmark" size={13} color={colors.textMuted} />;
  if (status === "delivered")
    return <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />;
  if (status === "read") return <Ionicons name="checkmark-done" size={13} color={colors.info} />;
  if (status === "failed") return <Ionicons name="alert-circle" size={13} color={colors.error} />;
  return null;
}

function DateSeparator({ label, colors }: { label: string; colors: ColorTokens }) {
  return (
    <View style={styles.dateSeparator}>
      <View style={[styles.dayPill, { backgroundColor: colors.surfaceHover }]}>
        <Text style={[styles.dayPillText, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );
}

function MessageBubble({ item, colors }: { item: WaMessage; colors: ColorTokens }) {
  const isOutbound = item.direction === "outbound";
  const isNote = item.isInternalNote || item.messageType === "note";
  const text = getMessageText(item);
  const time = formatTimeLabel(item.createdAt);

  if (isNote) {
    return (
      <View style={styles.noteWrapper}>
        <View style={styles.noteBubble}>
          <View style={styles.noteHeaderRow}>
            <Ionicons name="lock-closed" size={11} color={NOTE_INK} />
            <Text style={styles.noteHeaderLabel}>Nota interna</Text>
          </View>
          <Text style={styles.noteText}>{text}</Text>
          <Text style={styles.noteTime}>{time}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, { justifyContent: isOutbound ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          isOutbound
            ? {
                backgroundColor: WA_GREEN + "24",
                borderColor: WA_GREEN + "33",
                borderTopRightRadius: 4,
              }
            : {
                backgroundColor: colors.card,
                borderColor: colors.borderSoft,
                borderTopLeftRadius: 4,
              },
        ]}
      >
        <Text style={[styles.bubbleText, { color: colors.text }]}>{text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, { color: colors.textMuted }]}>{time}</Text>
          {isOutbound && <MessageStatusIcon status={item.status} colors={colors} />}
        </View>
      </View>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function WhatsAppChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium } = useHaptics();
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();
  const { id } = useLocalSearchParams<{ id: string }>();
  const safeId = id ?? "";

  const [inputText, setInputText] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showTagSheet, setShowTagSheet] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading } = useWhatsAppMessages(safeId);
  const sendMutation = useWhatsAppSendMessage(safeId);
  const updateStatusMutation = useWhatsAppUpdateStatus();
  const addNoteMutation = useWhatsAppAddNote(safeId);
  const assignMutation = useWhatsAppAssignConversation();
  const addTagsMutation = useWhatsAppAddTags();
  const removeTagMutation = useWhatsAppRemoveTag();
  const { data: quickReplies } = useWhatsAppQuickReplies();
  const { data: teamMembers = [] } = useWhatsAppTeamMembers();
  const { data: allTags = [] } = useWhatsAppTags();

  const conversation = data?.conversation;
  const messages = data?.messages ?? [];
  const hasQuickReplies = (quickReplies?.length ?? 0) > 0;
  const conversationTags = conversation?.tags ?? [];
  const availableTags = useMemo(
    () => allTags.filter((tag) => !conversationTags.some((item) => item.id === tag.id)),
    [allTags, conversationTags],
  );

  const listData = useMemo(() => buildListData(messages), [messages]);

  useEffect(() => {
    if (!safeId) return;

    return subscribe(
      ["whatsapp_new_message", "whatsapp_message", "whatsapp_message_failed"],
      (rawEvent) => {
        const event = rawEvent as WhatsAppRealtimeEvent;
        if (event.conversationId !== safeId) return;

        if (event.type === "whatsapp_new_message") {
          const createdAt = event.message?.createdAt ?? new Date().toISOString();

          queryClient.setQueryData<WaConversationDetailResponse>(
            ["whatsapp-messages", safeId],
            (current) => {
              if (!current) return current;

              const incomingMessage: WaMessage = {
                id: String(event.message?.id ?? `rt-${createdAt}`),
                conversationId: safeId,
                direction: String(event.message?.direction ?? "inbound"),
                senderType: "contact",
                messageType: String(event.message?.messageType ?? "text"),
                content: event.message?.content ?? "",
                status: String(event.message?.status ?? ""),
                isInternalNote: false,
                createdAt,
              };

              if (current.messages.some((message) => message.id === incomingMessage.id)) {
                return current;
              }

              return {
                ...current,
                conversation: {
                  ...current.conversation,
                  unreadCount: 0,
                  lastMessage: {
                    content: incomingMessage.content,
                    messageType: incomingMessage.messageType,
                    direction: incomingMessage.direction,
                    createdAt,
                  },
                  lastMessageAt: createdAt,
                  updatedAt: createdAt,
                },
                messages: [...current.messages, incomingMessage],
              };
            },
          );

          queryClient.setQueriesData<ConversationsResponse>(
            { queryKey: ["whatsapp-conversations"] },
            (current) => {
              if (!current) return current;
              return {
                ...current,
                data: current.data.map((conversation) =>
                  conversation.id === safeId
                    ? {
                        ...conversation,
                        unreadCount: 0,
                        lastMessage: {
                          content: event.message?.content ?? "",
                          messageType: event.message?.messageType ?? "text",
                          direction: event.message?.direction ?? "inbound",
                          createdAt,
                        },
                        lastMessageAt: createdAt,
                        updatedAt: createdAt,
                      }
                    : conversation,
                ),
              };
            },
          );

          return;
        }

        queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", safeId] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      },
    );
  }, [queryClient, safeId, subscribe]);

  // ── actions ──

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    light();
    try {
      await sendMutation.mutateAsync(text);
    } catch {
      Alert.alert("Erro", "Não foi possível enviar a mensagem.");
    }
  }, [inputText, sendMutation, light]);

  const handleResolve = useCallback(async () => {
    if (!conversation) return;
    medium();
    const newStatus = conversation.status === "resolved" ? "open" : "resolved";
    setShowActions(false);
    try {
      await updateStatusMutation.mutateAsync({ conversationId: safeId, status: newStatus });
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  }, [conversation, safeId, medium, updateStatusMutation]);

  const handleSetPending = useCallback(async () => {
    setShowActions(false);
    try {
      await updateStatusMutation.mutateAsync({ conversationId: safeId, status: "pending" });
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  }, [safeId, updateStatusMutation]);

  const handleAddNote = useCallback(async () => {
    const text = noteText.trim();
    if (!text) return;
    setNoteText("");
    setShowNoteInput(false);
    try {
      await addNoteMutation.mutateAsync(text);
    } catch {
      Alert.alert("Erro", "Não foi possível adicionar a nota.");
    }
  }, [noteText, addNoteMutation]);

  const handleAssignTo = useCallback(
    async (assignedTo: string) => {
      setShowAssignSheet(false);
      try {
        await assignMutation.mutateAsync({
          conversationId: safeId,
          assignedTo,
          reason: "Atribuição pelo app profissional",
        });
      } catch {
        Alert.alert("Erro", "Não foi possível atribuir a conversa.");
      }
    },
    [assignMutation, safeId],
  );

  const handleAddTag = useCallback(
    async (tagId: string) => {
      try {
        await addTagsMutation.mutateAsync({ conversationId: safeId, tagIds: [tagId] });
      } catch {
        Alert.alert("Erro", "Não foi possível categorizar a conversa.");
      }
    },
    [addTagsMutation, safeId],
  );

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      try {
        await removeTagMutation.mutateAsync({ conversationId: safeId, tagId });
      } catch {
        Alert.alert("Erro", "Não foi possível remover a categoria.");
      }
    },
    [removeTagMutation, safeId],
  );

  // ── derived values ──

  const contactName = conversation ? getContactName(conversation) : "";
  const contactPhone = conversation ? getContactPhone(conversation) : "";
  const status = conversation?.status ?? "";
  const stage = getStageBadge(status, colors);
  const isResolved = status === "resolved" || status === "closed";
  const assignedLabel = conversation?.assignedToName || "Sem responsável";

  // ── render item ──

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "date") {
        return <DateSeparator label={item.label} colors={colors} />;
      }
      return <MessageBubble item={item.data} colors={colors} />;
    },
    [colors],
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  // ── scroll to end when new content arrives ──

  const handleContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View
            style={[
              styles.headerAvatar,
              { backgroundColor: contactName ? avatarColorFor(contactName) : colors.surfaceHover },
            ]}
          >
            {isLoading && !conversation ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Text style={styles.headerAvatarText}>{contactName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {contactName || "Carregando..."}
            </Text>
            {contactPhone ? (
              <View style={styles.headerChannelRow}>
                <View style={[styles.headerChannelDot, { backgroundColor: WA_GREEN }]} />
                <Text style={[styles.headerPhone, { color: colors.textSecondary }]} numberOfLines={1}>
                  {contactPhone}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleResolve}
            style={[
              styles.headerBtn,
              { backgroundColor: isResolved ? colors.surfaceHover : WA_GREEN + "1F" },
            ]}
            disabled={updateStatusMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={isResolved ? "Reabrir conversa" : "Marcar como resolvida"}
          >
            {updateStatusMutation.isPending ? (
              <ActivityIndicator size="small" color={WA_GREEN} />
            ) : (
              <Ionicons
                name={isResolved ? "refresh" : "checkmark-done"}
                size={18}
                color={isResolved ? colors.textSecondary : WA_GREEN}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowActions(true)}
            style={[styles.headerBtn, { backgroundColor: colors.surfaceHover }]}
            accessibilityRole="button"
            accessibilityLabel="Ações da conversa"
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Faixa de contexto — etapa, responsável e categorias da conversa */}
      {status ? (
        <View
          style={[
            styles.contextStrip,
            { backgroundColor: colors.card, borderBottomColor: colors.borderSoft },
          ]}
        >
          <View style={[styles.stagePill, { backgroundColor: stage.background }]}>
            <View style={[styles.stageDot, { backgroundColor: stage.dot }]} />
            <Text style={[styles.stageText, { color: stage.foreground }]} numberOfLines={1}>
              {stage.label}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.ownerPill, { backgroundColor: colors.surfaceHover }]}
            onPress={() => setShowAssignSheet(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Atribuir responsável"
          >
            <Ionicons name="person" size={10} color={colors.textSecondary} />
            <Text style={[styles.ownerText, { color: colors.textSecondary }]} numberOfLines={1}>
              {assignedLabel}
            </Text>
          </TouchableOpacity>

          {conversationTags.slice(0, 2).map((tag) => (
            <View key={tag.id} style={[styles.tagPill, { borderColor: tag.color ?? colors.border }]}>
              <Text
                style={[styles.tagText, { color: tag.color ?? colors.textSecondary }]}
                numberOfLines={1}
              >
                {tag.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Resolved banner */}
      {isResolved && (
        <View
          style={[
            styles.resolvedBanner,
            { backgroundColor: colors.successSoft, borderBottomColor: colors.border },
          ]}
        >
          <Ionicons name="checkmark-circle" size={15} color={colors.success} />
          <Text style={[styles.resolvedText, { color: colors.success }]}>Conversa resolvida</Text>
          <TouchableOpacity onPress={handleResolve}>
            <Text style={[styles.resolvedReopen, { color: colors.success }]}>Reabrir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      {isLoading && listData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WA_GREEN} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleContentSizeChange}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-ellipses-outline" size={52} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma mensagem ainda
              </Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                Envie uma mensagem para iniciar a conversa
              </Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Note input panel */}
        {showNoteInput && (
          <View style={styles.noteInputPanel}>
            <View style={styles.noteInputHeader}>
              <Ionicons name="lock-closed" size={13} color={NOTE_INK} />
              <Text style={styles.noteInputLabel}>Nota interna — visível apenas para a equipe</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNoteInput(false);
                  setNoteText("");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={NOTE_INK} />
              </TouchableOpacity>
            </View>
            <View style={styles.noteInputRow}>
              <TextInput
                style={styles.noteTextInput}
                placeholder="Escreva uma nota..."
                placeholderTextColor={NOTE_INK + "99"}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                onPress={handleAddNote}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                style={[styles.noteSendBtn, { opacity: noteText.trim() ? 1 : 0.5 }]}
              >
                {addNoteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick replies panel */}
        {showQuickReplies && hasQuickReplies && (
          <View
            style={[
              styles.quickRepliesPanel,
              { backgroundColor: colors.card, borderTopColor: colors.borderSoft },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesContent}
              keyboardShouldPersistTaps="handled"
            >
              {quickReplies!.map((qr) => (
                <TouchableOpacity
                  key={qr.id}
                  style={[
                    styles.quickReplyChip,
                    { backgroundColor: colors.primaryTint, borderColor: colors.primarySoft },
                  ]}
                  onPress={() => {
                    setInputText(qr.content);
                    setShowQuickReplies(false);
                    light();
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[styles.quickReplyTitle, { color: colors.primaryText }]}
                    numberOfLines={1}
                  >
                    {qr.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            { borderTopColor: colors.borderSoft, backgroundColor: colors.card },
          ]}
        >
          {hasQuickReplies && (
            <TouchableOpacity
              onPress={() => {
                setShowQuickReplies(!showQuickReplies);
                if (showNoteInput) setShowNoteInput(false);
              }}
              style={[styles.inputAction, { backgroundColor: colors.surfaceHover }]}
              accessibilityRole="button"
              accessibilityLabel="Respostas rápidas"
            >
              <Ionicons
                name={showQuickReplies ? "chevron-down" : "flash-outline"}
                size={20}
                color={showQuickReplies ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            placeholder="Mensagem"
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={4096}
            onFocus={() => setShowQuickReplies(false)}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={sendMutation.isPending || !inputText.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() ? WA_GREEN : colors.borderStrong,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={19} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Actions bottom sheet */}
      <Modal
        visible={showActions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          {/* stopPropagation: prevents sheet taps from closing the modal */}
          <View
            style={[styles.actionsSheet, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.sheetTitle, { color: colors.text }]}>Ações da conversa</Text>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={handleResolve}
            >
              <Ionicons
                name={isResolved ? "refresh" : "checkmark-done"}
                size={20}
                color={isResolved ? colors.textSecondary : WA_GREEN}
              />
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                {isResolved ? "Reabrir conversa" : "Marcar como resolvida"}
              </Text>
            </TouchableOpacity>

            {status !== "pending" && !isResolved && (
              <TouchableOpacity
                style={[styles.actionItem, { borderBottomColor: colors.border }]}
                onPress={handleSetPending}
              >
                <Ionicons name="time-outline" size={20} color={colors.warning} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  Marcar como pendente
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowActions(false);
                setShowNoteInput(true);
                setShowQuickReplies(false);
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={NOTE_INK} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                Adicionar nota interna
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowActions(false);
                setShowAssignSheet(true);
              }}
            >
              <Ionicons name="person-add-outline" size={20} color={WA_GREEN} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Atribuir responsável</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowActions(false);
                setShowTagSheet(true);
              }}
            >
              <Ionicons name="pricetags-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Categorizar conversa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: "transparent" }]}
              onPress={() => setShowActions(false)}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showAssignSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAssignSheet(false)}
        >
          <View
            style={[styles.actionsSheet, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Atribuir conversa</Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {teamMembers.length === 0 ? (
                <Text style={[styles.sheetEmptyText, { color: colors.textMuted }]}>
                  Nenhum membro da equipe encontrado.
                </Text>
              ) : (
                teamMembers.map((member) => {
                  const active = conversation?.assignedTo === member.userId;
                  return (
                    <TouchableOpacity
                      key={member.userId}
                      style={[styles.sheetOption, { borderBottomColor: colors.border }]}
                      onPress={() => handleAssignTo(member.userId)}
                      disabled={assignMutation.isPending}
                    >
                      <View
                        style={[
                          styles.memberAvatar,
                          { backgroundColor: avatarColorFor(member.name) },
                        ]}
                      >
                        <Text style={styles.memberAvatarText}>
                          {member.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[styles.sheetOptionTitle, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {member.name}
                        </Text>
                        <Text
                          style={[styles.sheetOptionSubtitle, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {member.email || member.role || "Equipe"}
                        </Text>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={20} color={WA_GREEN} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showTagSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTagSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTagSheet(false)}
        >
          <View
            style={[styles.actionsSheet, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Categorias da conversa</Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {conversationTags.length > 0 && (
                <View style={styles.currentTagsBlock}>
                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                    Aplicadas
                  </Text>
                  {conversationTags.map((tag) => (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.sheetOption, { borderBottomColor: colors.border }]}
                      onPress={() => handleRemoveTag(tag.id)}
                      disabled={removeTagMutation.isPending}
                    >
                      <View
                        style={[
                          styles.tagDotLarge,
                          { backgroundColor: tag.color ?? colors.textMuted },
                        ]}
                      />
                      <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                        {tag.name}
                      </Text>
                      <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>Adicionar</Text>
              {availableTags.length === 0 ? (
                <Text style={[styles.sheetEmptyText, { color: colors.textMuted }]}>
                  Todas as categorias disponíveis já estão aplicadas.
                </Text>
              ) : (
                availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.sheetOption, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddTag(tag.id)}
                    disabled={addTagsMutation.isPending}
                  >
                    <View
                      style={[
                        styles.tagDotLarge,
                        { backgroundColor: tag.color ?? colors.textMuted },
                      ]}
                    />
                    <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                      {tag.name}
                    </Text>
                    <Ionicons name="add-circle-outline" size={18} color={WA_GREEN} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingTop: spacing[1],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[2],
  },
  backBtn: { paddingHorizontal: 2, paddingVertical: 4 },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    minWidth: 0,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerAvatarText: {
    color: "#fff",
    fontFamily: fontFamily.extrabold,
    fontSize: 14,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerName: {
    fontFamily: fontFamily.extrabold,
    fontSize: 16,
    letterSpacing: -0.24,
  },
  headerChannelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  headerChannelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerPhone: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    flexShrink: 1,
  },
  headerActions: { flexDirection: "row", gap: 6 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // faixa de contexto (etapa / responsável / categorias)
  contextStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: spacing[4],
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  ownerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 160,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  ownerText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    flexShrink: 1,
  },
  tagPill: {
    maxWidth: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
  },

  // resolved banner
  resolvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resolvedText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  resolvedReopen: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },

  // messages list
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  messagesList: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    flexGrow: 1,
  },

  // separador de dia
  dateSeparator: {
    alignItems: "center",
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  dayPill: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dayPillText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // balões
  bubbleRow: { flexDirection: "row", marginVertical: 3 },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleText: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    lineHeight: 20,
  },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 3,
  },
  bubbleTime: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
  },

  // notas internas
  noteWrapper: { alignItems: "center", marginVertical: 6 },
  noteBubble: {
    maxWidth: "88%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: NOTE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NOTE_BORDER,
  },
  noteHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  noteHeaderLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: NOTE_INK,
  },
  noteText: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: NOTE_INK,
  },
  noteTime: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: NOTE_INK + "AA",
    marginTop: 4,
    textAlign: "right",
  },

  // estado vazio
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: spacing[8],
    gap: spacing[2],
  },
  emptyText: { ...typography.h3, textAlign: "center" },
  emptySubText: { ...typography.body, textAlign: "center" },

  // painel de nota interna
  noteInputPanel: {
    backgroundColor: NOTE_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: NOTE_BORDER,
    padding: spacing[3],
  },
  noteInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing[2],
  },
  noteInputLabel: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: NOTE_INK,
  },
  noteInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing[2],
  },
  noteTextInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: NOTE_INK,
    maxHeight: 80,
  },
  noteSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NOTE_INK,
    alignItems: "center",
    justifyContent: "center",
  },

  // respostas rápidas
  quickRepliesPanel: { borderTopWidth: StyleSheet.hairlineWidth },
  quickRepliesContent: {
    paddingHorizontal: spacing[3],
    paddingVertical: 9,
    gap: spacing[2],
    alignItems: "center",
  },
  quickReplyChip: {
    maxWidth: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  quickReplyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 12.5,
  },

  // barra de composição
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    paddingBottom: Platform.OS === "ios" ? spacing[6] : spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing[2],
  },
  inputAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // folhas de ação
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },
  actionsSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing[3],
    paddingBottom: spacing[10],
    paddingHorizontal: spacing[5],
    ...shadow.sheet,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing[4],
  },
  sheetTitle: {
    ...typography.h4,
    fontFamily: fontFamily.extrabold,
    marginBottom: spacing[4],
  },
  sheetList: { maxHeight: 360 },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[3],
  },
  sheetOptionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    flex: 1,
  },
  sheetOptionSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  sheetEmptyText: {
    ...typography.small,
    paddingVertical: spacing[3],
  },
  sheetSectionLabel: {
    ...typography.eyebrow,
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  currentTagsBlock: {
    marginBottom: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    color: "#fff",
    fontFamily: fontFamily.extrabold,
    fontSize: 12,
  },
  tagDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  actionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
  },
});
